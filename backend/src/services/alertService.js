const createAlert = async ({
  severity,
  summary,
}) => {

  console.log("========== ALERT CREATED ==========");
  console.log("Severity:", severity);
  console.log("Summary:", summary);
  console.log("===================================");

  return {
    success: true,
  };
};

module.exports = {
  createAlert,
};