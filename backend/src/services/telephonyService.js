const axios = require('axios');
const config = require('../config');
const socketManager = require('../socket');
const callRepository = require('../../Database/repositories/callRepository');
const transcriptRepository = require('../../Database/repositories/transcriptRepository');

const AI_SERVICE_URL = config.AI_SERVICE_URL;
const AGENT_PHONE_NUMBER = process.env.AGENT_PHONE_NUMBER || '+916363868580';

const handleIncomingCall = async (callData) => {
  const callSid = callData.CallSid || 'UNKNOWN';
  const callerNumber = callData.From || 'UNKNOWN';

  console.log(`📞 Incoming call received`);
  console.log(`Call SID: ${callSid}`);
  console.log(`Caller: ${callerNumber}`);

  // Create call in database
  try {
    const newCall = await callRepository.createCall({
      caller_number: callerNumber,
      status: 'active',
      metadata: { twilioCallSid: callSid }
    });
    
    // Broadcast to agents
    const io = socketManager.getIO();
    io.emit('new_call', { callId: newCall.id, caller: callerNumber });
    console.log(`💾 Call created in DB with ID: ${newCall.id}`);
  } catch (err) {
    console.error('Error creating call in DB:', err);
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Welcome to 1092 Emergency Helpline. Please describe your emergency after the beep.
  </Say>
  <Record
    action="/api/v1/telephony/call-status"
    maxLength="30"
    playBeep="true"
    transcribe="true"
    transcribeCallback="/api/v1/telephony/call-status"
  />
</Response>`;

  return twiml;
};

const updateCallStatus = async (statusData) => {
  const transcriptionText = statusData.TranscriptionText || '';
  const recordingUrl = statusData.RecordingUrl || '';
  const callSid = statusData.CallSid || 'UNKNOWN';

  console.log(`📋 Call status update for: ${callSid}`);
  console.log(`Transcription: ${transcriptionText}`);
  console.log(`Recording URL: ${recordingUrl}`);

  if (!transcriptionText) {
    console.log(`⚠️ No transcription received yet for ${callSid} — waiting for Twilio callback`);
    return;
  }

  let dbCall;
  try {
    dbCall = await callRepository.getCallByTwilioSid(callSid);
  } catch (err) {
    console.error('Error fetching call from DB:', err);
  }

  try {
    // Step 1 — Send transcription through input-service (language detect + translate)
    console.log(`🌐 Sending to input-service for language detection + translation...`);
    const inputResponse = await axios.post(
      `http://localhost:8001/api/v1/pipeline/input`,
      {
        text: transcriptionText,
        originalText: transcriptionText
      }
    );

    const translatedText = inputResponse.data.text;
    const detectedLanguage = inputResponse.data.language;
    console.log(`🌍 Language detected: ${detectedLanguage}`);
    console.log(`✅ Translated text: ${translatedText}`);

    if (dbCall) {
      await transcriptRepository.createTranscript({
        call_id: dbCall.id,
        speaker: 'citizen',
        content: transcriptionText,
        translated_content: translatedText,
        language: detectedLanguage
      });
      const io = socketManager.getIO();
      io.to(`call_${dbCall.id}`).emit('transcript_update', {
        id: Date.now().toString(),
        speaker: 'citizen',
        text: transcriptionText,
        timestamp: new Date().toISOString()
      });
    }

    // Step 2 — Send translated English text to AI unified pipeline check
    console.log(`🤖 Sending to AI service for full unified pipeline analysis...`);
    const pipelineResponse = await axios.post(
      `${AI_SERVICE_URL}/pipeline/analyze`,
      { text: translatedText }
    );

    const { severity, reply, summary, intent, confidence, emotion } = pipelineResponse.data;
    console.log(`🚨 Analysis results -> Severity: ${severity}, Intent: ${intent}, Emotion: ${emotion}`);

    if (dbCall) {
       // Save to Call metadata JSONB column!
       const updatedMetadata = {
         ...(dbCall.metadata || {}),
         emotion: emotion ? emotion.toLowerCase() : 'neutral',
         intent: intent || 'General Query',
         confidence: confidence || 85,
         issue_summary: summary || 'No summary provided',
         ai_reply: reply || ''
       };

       await callRepository.updateCall(dbCall.id, {
         severity_level: severity ? severity.toLowerCase() : 'low',
         metadata: updatedMetadata
       });
       
       // Broadcast updates immediately to all users on the dashboard!
       const io = socketManager.getIO();
       io.emit('new_call', { callId: dbCall.id }); // This will refresh active calls list across all dashboards
       
       // Emit detailed update to this active call's workspace
       io.to(`call_${dbCall.id}`).emit('ai_insight_update', {
         emotion: emotion ? emotion.toLowerCase() : 'neutral',
         intent: intent || 'General Query',
         confidence: confidence || 85,
         issue: summary || 'No summary provided',
         suggestedActions: reply ? [reply] : []
       });

       if (severity === 'HIGH' || severity === 'CRITICAL') {
         io.to(`call_${dbCall.id}`).emit('escalation_required', { severity });
       }
    }

    // Step 3 — Escalate if HIGH or CRITICAL
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      console.log(`🔴 ESCALATING to human agent!`);
      await forwardToAgent(callSid, severity);
    } else {
      console.log(`🟢 Severity is ${severity} — AI continues handling`);
    }

  } catch (error) {
    if (error.config && error.config.url && error.config.url.includes('8001')) {
      console.error(`❌ Input-service error (port 8001): ${error.message}`);
    } else {
      console.error(`❌ AI service error: ${error.message}`);
    }
  }
};

const forwardToAgent = async (callSid, severity) => {
  console.log(`📲 Forwarding call ${callSid} to agent`);
  console.log(`Severity: ${severity}`);
  console.log(`Agent number: ${AGENT_PHONE_NUMBER}`);

  return {
    callSid,
    severity,
    forwardedTo: AGENT_PHONE_NUMBER,
    status: 'FORWARDED',
    timestamp: new Date().toISOString()
  };
};

module.exports = { handleIncomingCall, updateCallStatus, forwardToAgent };