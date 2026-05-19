const shouldTransfer = (severity) => {
  return (
    severity === "HIGH" ||
    severity === "CRITICAL"
  );
};

module.exports = {
  shouldTransfer,
};