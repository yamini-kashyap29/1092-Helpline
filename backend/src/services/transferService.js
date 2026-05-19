const transferCall = async ({
  callId,
  officer,
  reason,
}) => {

  console.log("========== CALL TRANSFER ==========");
  console.log("Call ID:", callId);
  console.log("Officer:", officer.name);
  console.log("Phone:", officer.phone);
  console.log("Reason:", reason);
  console.log("===================================");

  return {
    success: true,
    message: "Call transferred successfully",
  };
};

module.exports = {
  transferCall,
};