const alertRepository = require('../../Database/repositories/alertRepository');

const createAlert = async ({
  severity,
  summary,
  call_id = null
}) => {

  console.log("========== ALERT CREATED ==========");
  console.log("Severity:", severity);
  console.log("Summary:", summary);
  console.log("Call ID:", call_id);
  console.log("===================================");

  try {
    const newAlert = await alertRepository.createAlert({
      severity_level: severity ? severity.toLowerCase() : 'medium',
      message: summary || 'Emergency case requires immediate attention',
      call_id: call_id
    });
    return {
      success: true,
      alert: newAlert
    };
  } catch (error) {
    console.error('Failed to create alert in DB:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createAlert,
};