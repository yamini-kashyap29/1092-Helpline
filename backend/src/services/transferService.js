const { Transfer } = require('../../Database/index.js');
const callRepository = require('../../Database/repositories/callRepository');

const transferCall = async ({
  callId,
  officer,
  reason,
}) => {
  console.log("========== CALL TRANSFER ==========");
  console.log("Call Twilio SID:", callId);
  console.log("Officer:", officer.name);
  console.log("Phone:", officer.phone);
  console.log("Reason:", reason);
  console.log("===================================");

  try {
    const dbCall = await callRepository.getCallByTwilioSid(callId);
    if (dbCall) {
      await Transfer.create({
        call_id: dbCall.id,
        officer_id: officer.id,
        transferred_to: officer.name,
        reason: reason,
        status: 'completed',
        completed_at: new Date()
      });
      console.log(`Saved transfer to DB for call ${dbCall.id}`);
    }
  } catch (err) {
    console.error('Failed to create Transfer in DB:', err);
  }

  return {
    success: true,
    message: "Call transferred successfully",
  };
};

module.exports = {
  transferCall,
};