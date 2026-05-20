'use strict';

require('dotenv').config();
const { connectDB, sequelize, Call, Transcript, AIResult, Alert, Officer, Transfer, Notification } = require('../index');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── Officers ──────────────────────────────────────────────────────────────────

const seedOfficers = async () => {
  const passwordHash = await bcrypt.hash('Admin@1234', 10);

  const officers = [
    {
      id:            uuidv4(),
      employee_id:   'OFF-001',
      full_name:     'Priya Sharma',
      email:         'priya.sharma@1098helpline.gov.in',
      phone:         '+919876543210',
      role:          'supervisor',
      department:    'Child Welfare',
      jurisdiction:  'Maharashtra',
      availability_status: 'available',
      is_active:     true,
      password_hash: passwordHash,
      notification_preferences: { sms: true, email: true, push: true },
    },
    {
      id:            uuidv4(),
      employee_id:   'OFF-002',
      full_name:     'Arjun Mehta',
      email:         'arjun.mehta@1098helpline.gov.in',
      phone:         '+919876500001',
      role:          'operator',
      department:    'Emergency Response',
      jurisdiction:  'Maharashtra',
      availability_status: 'available',
      is_active:     true,
      password_hash: passwordHash,
      notification_preferences: { sms: true, email: false, push: true },
    },
    {
      id:            uuidv4(),
      employee_id:   'OFF-003',
      full_name:     'Kavitha Rajan',
      email:         'kavitha.rajan@1098helpline.gov.in',
      phone:         '+919876500002',
      role:          'counsellor',
      department:    'Mental Health',
      jurisdiction:  'Tamil Nadu',
      availability_status: 'busy',
      is_active:     true,
      password_hash: passwordHash,
      notification_preferences: { sms: false, email: true, push: true },
    },
    {
      id:            uuidv4(),
      employee_id:   'OFF-004',
      full_name:     'Ravi Kumar',
      email:         'ravi.kumar@1098helpline.gov.in',
      phone:         '+919876500003',
      role:          'field_officer',
      department:    'Field Operations',
      jurisdiction:  'Delhi',
      availability_status: 'available',
      is_active:     true,
      password_hash: passwordHash,
      notification_preferences: { sms: true, email: true, push: false },
    },
    {
      id:            uuidv4(),
      employee_id:   'OFF-005',
      full_name:     'Sneha Patil',
      email:         'sneha.patil@1098helpline.gov.in',
      phone:         '+919876500004',
      role:          'admin',
      department:    'Administration',
      jurisdiction:  'National',
      availability_status: 'available',
      is_active:     true,
      password_hash: passwordHash,
      notification_preferences: { sms: true, email: true, push: true },
    },
  ];

  await Officer.bulkCreate(officers, { ignoreDuplicates: true });
  console.log(`[Seed] ${officers.length} officers seeded.`);
  return officers;
};

// ─── Calls ─────────────────────────────────────────────────────────────────────

const seedCalls = async () => {
  const calls = [
    {
      id:               uuidv4(),
      caller_number:    '+919823456789',
      caller_name:      'Unknown Caller',
      call_type:        'inbound',
      status:           'completed',
      channel:          'voice',
      language:         'hi',
      severity_level:   'critical',
      started_at:       new Date(Date.now() - 3600000),
      ended_at:         new Date(Date.now() - 3400000),
      duration_seconds: 200,
      location_raw:     'Near Dadar Railway Station, Mumbai',
      location_lat:     19.0176,
      location_lng:     72.8562,
      is_test:          false,
      metadata:         { telephony_provider: 'exotel', session_id: 'EX-001' },
    },
    {
      id:               uuidv4(),
      caller_number:    '+919911223344',
      caller_name:      'Rahul (neighbour)',
      call_type:        'inbound',
      status:           'active',
      channel:          'voice',
      language:         'en',
      severity_level:   'high',
      started_at:       new Date(Date.now() - 600000),
      ended_at:         null,
      duration_seconds: null,
      location_raw:     'Sector 21, Dwarka, New Delhi',
      location_lat:     28.5921,
      location_lng:     77.0460,
      is_test:          false,
      metadata:         { telephony_provider: 'twilio', session_id: 'TW-002' },
    },
    {
      id:               uuidv4(),
      caller_number:    '+919700012345',
      caller_name:      'Test User',
      call_type:        'inbound',
      status:           'completed',
      channel:          'chat',
      language:         'en',
      severity_level:   'low',
      started_at:       new Date(Date.now() - 86400000),
      ended_at:         new Date(Date.now() - 86200000),
      duration_seconds: 200,
      location_raw:     null,
      is_test:          true,
      metadata:         {},
    },
  ];

  await Call.bulkCreate(calls, { ignoreDuplicates: true });
  console.log(`[Seed] ${calls.length} calls seeded.`);
  return calls;
};

// ─── Transcripts ───────────────────────────────────────────────────────────────

const seedTranscripts = async (calls) => {
  const criticalCall = calls[0];

  const transcripts = [
    {
      id:               uuidv4(),
      call_id:          criticalCall.id,
      speaker:          'caller',
      content:          'Mujhe madad chahiye, mere ghar mein bachche ko maar rahe hain.',
      content_original: 'Mujhe madad chahiye, mere ghar mein bachche ko maar rahe hain.',
      language:         'hi',
      confidence_score: 0.94,
      sequence_no:      1,
      spoken_at:        new Date(Date.now() - 3590000),
      audio_start_ms:   0,
      audio_end_ms:     4500,
      is_redacted:      false,
    },
    {
      id:               uuidv4(),
      call_id:          criticalCall.id,
      speaker:          'ai',
      content:          'Aap safe jagah par hain? Bacche ki umar kya hai? Help aa rahi hai.',
      language:         'hi',
      confidence_score: 1.0,
      sequence_no:      2,
      spoken_at:        new Date(Date.now() - 3585000),
      audio_start_ms:   4600,
      audio_end_ms:     8200,
      is_redacted:      false,
    },
    {
      id:               uuidv4(),
      call_id:          criticalCall.id,
      speaker:          'caller',
      content:          'Baccha 7 saal ka hai. Pados wala maar raha hai. Please jaldi aao.',
      language:         'hi',
      confidence_score: 0.91,
      sequence_no:      3,
      spoken_at:        new Date(Date.now() - 3580000),
      audio_start_ms:   8300,
      audio_end_ms:     13000,
      is_redacted:      false,
    },
  ];

  await Transcript.bulkCreate(transcripts, { ignoreDuplicates: true });
  console.log(`[Seed] ${transcripts.length} transcripts seeded.`);
  return transcripts;
};

// ─── AI Results ────────────────────────────────────────────────────────────────

const seedAIResults = async (calls, transcripts) => {
  const criticalCall = calls[0];

  const aiResults = [
    {
      id:                uuidv4(),
      call_id:           criticalCall.id,
      transcript_id:     transcripts[0].id,
      model_name:        'gpt-4o',
      model_version:     '2024-08-06',
      analysis_type:     'severity_classification',
      severity_level:    'critical',
      severity_score:    0.97,
      intent:            'child_abuse_report',
      entities: {
        location:    'Dadar Railway Station, Mumbai',
        victim_age:  7,
        threat_type: 'physical_abuse',
        abuser:      'neighbor',
      },
      sentiment:          'panic',
      should_escalate:    true,
      escalation_reason:  'Child in immediate danger. Physical abuse by neighbor reported.',
      ai_reply:           'Help is on the way. Please stay calm and keep the child safe. Can you lock yourself inside?',
      prompt_tokens:      320,
      completion_tokens:  85,
      latency_ms:         1340,
      analysed_at:        new Date(Date.now() - 3583000),
      raw_response:       { model: 'gpt-4o', finish_reason: 'stop' },
    },
    {
      id:                uuidv4(),
      call_id:           criticalCall.id,
      transcript_id:     null,
      model_name:        'gpt-4o',
      model_version:     '2024-08-06',
      analysis_type:     'summary',
      severity_level:    'critical',
      severity_score:    0.97,
      summary:           'Caller reported child physical abuse by a neighbour near Dadar, Mumbai. Victim is a 7-year-old child. Immediate field response dispatched.',
      should_escalate:   true,
      prompt_tokens:     410,
      completion_tokens: 120,
      latency_ms:        1580,
      analysed_at:       new Date(Date.now() - 3400000),
    },
  ];

  await AIResult.bulkCreate(aiResults, { ignoreDuplicates: true });
  console.log(`[Seed] ${aiResults.length} AI results seeded.`);
  return aiResults;
};

// ─── Alerts ────────────────────────────────────────────────────────────────────

const seedAlerts = async (calls, officers) => {
  const criticalCall  = calls[0];
  const activeSupervisor = officers[0];

  const alerts = [
    {
      id:                  uuidv4(),
      call_id:             criticalCall.id,
      alert_type:          'child_abuse',
      severity_level:      'critical',
      status:              'in_progress',
      title:               'CRITICAL: Child abuse report – Dadar, Mumbai',
      description:         '7-year-old child being physically abused by neighbour near Dadar Railway Station. Caller in panic. Field officer dispatched.',
      location_raw:        'Near Dadar Railway Station, Mumbai',
      location_lat:        19.0176,
      location_lng:        72.8562,
      assigned_officer_id: activeSupervisor.id,
      triggered_by:        'ai',
      acknowledged_at:     new Date(Date.now() - 3300000),
      resolved_at:         null,
    },
    {
      id:             uuidv4(),
      call_id:        calls[1].id,
      alert_type:     'domestic_violence',
      severity_level: 'high',
      status:         'open',
      title:          'Domestic violence report – Dwarka, Delhi',
      description:    'Caller reporting domestic violence in Sector 21, Dwarka. Call still active.',
      location_raw:   'Sector 21, Dwarka, New Delhi',
      location_lat:   28.5921,
      location_lng:   77.0460,
      triggered_by:   'ai',
    },
  ];

  await Alert.bulkCreate(alerts, { ignoreDuplicates: true });
  console.log(`[Seed] ${alerts.length} alerts seeded.`);
  return alerts;
};

// ─── Transfers ─────────────────────────────────────────────────────────────────

const seedTransfers = async (calls, officers) => {
  const transfers = [
    {
      id:              uuidv4(),
      call_id:         calls[0].id,
      officer_id:      officers[1].id,
      transferred_from: 'IVR Queue',
      transferred_to:  'OFF-002',
      transfer_type:   'warm',
      reason:          'Critical child abuse case — escalated to senior operator.',
      status:          'completed',
      initiated_at:    new Date(Date.now() - 3570000),
      completed_at:    new Date(Date.now() - 3560000),
    },
  ];

  await Transfer.bulkCreate(transfers, { ignoreDuplicates: true });
  console.log(`[Seed] ${transfers.length} transfers seeded.`);
  return transfers;
};

// ─── Notifications ─────────────────────────────────────────────────────────────

const seedNotifications = async (alerts, officers) => {
  const notifications = [
    {
      id:                  uuidv4(),
      alert_id:            alerts[0].id,
      officer_id:          officers[0].id,
      channel:             'sms',
      recipient_address:   officers[0].phone,
      subject:             null,
      body:                'URGENT: Critical child abuse alert – Dadar, Mumbai. Login to dashboard immediately.',
      status:              'delivered',
      provider:            'twilio',
      provider_message_id: 'SM_MOCK_001',
      sent_at:             new Date(Date.now() - 3295000),
      delivered_at:        new Date(Date.now() - 3290000),
    },
    {
      id:                  uuidv4(),
      alert_id:            alerts[0].id,
      officer_id:          officers[0].id,
      channel:             'email',
      recipient_address:   officers[0].email,
      subject:             '[ALERT] Critical – Child Abuse – Dadar Mumbai',
      body:                'A critical child abuse alert has been triggered. Case ID linked. Please acknowledge immediately.',
      status:              'delivered',
      provider:            'sendgrid',
      provider_message_id: 'SG_MOCK_001',
      sent_at:             new Date(Date.now() - 3294000),
      delivered_at:        new Date(Date.now() - 3288000),
    },
    {
      id:                  uuidv4(),
      alert_id:            alerts[1].id,
      officer_id:          officers[3].id,
      channel:             'push',
      recipient_address:   'FCM_DEVICE_TOKEN_RAVI',
      subject:             null,
      body:                'New high-priority domestic violence alert in Dwarka, Delhi. Tap to view.',
      status:              'sent',
      provider:            'firebase',
      provider_message_id: 'FCM_MOCK_001',
      sent_at:             new Date(Date.now() - 590000),
    },
  ];

  await Notification.bulkCreate(notifications, { ignoreDuplicates: true });
  console.log(`[Seed] ${notifications.length} notifications seeded.`);
};

// ─── Main Runner ───────────────────────────────────────────────────────────────

const seedMockData = async () => {
  try {
    console.log('[Seed] Starting mock data seeding...\n');

    const officers     = await seedOfficers();
    const calls        = await seedCalls();
    const transcripts  = await seedTranscripts(calls);
    const aiResults    = await seedAIResults(calls, transcripts);
    const alerts       = await seedAlerts(calls, officers);
    await seedTransfers(calls, officers);
    await seedNotifications(alerts, officers);

    console.log('\n[Seed] ✅ All mock data seeded successfully.');
    return {
      Officers: officers.length,
      Calls: calls.length,
      Transcripts: transcripts.length,
      AIResults: aiResults.length,
      Alerts: alerts.length
    };
  } catch (error) {
    console.error('[Seed] ❌ Seeding failed:', error);
    throw error;
  }
};

module.exports = {
  seedMockData
};