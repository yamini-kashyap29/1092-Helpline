const {
  shouldTransfer,
} = require('../services/severityService');

const {
  findAvailableOfficer,
} = require('../services/officerService');

const {
  createAlert,
} = require('../services/alertService');

const {
  transferCall,
} = require('../services/transferService');

const telephonyService = require('../services/telephonyService');

const incomingCall = async (req, res) => {
  try {
    const callData = req.body;
    const twiml = await telephonyService.handleIncomingCall(callData);
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ incomingCall error:', error.message);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome to 1092 Emergency Helpline. Please hold.</Say>
</Response>`);
  }
};

const callStatus = async (req, res) => {
  try {
    const statusData = req.body;
    await telephonyService.updateCallStatus(statusData);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you. Your emergency has been recorded. Help is on the way.</Say>
</Response>`);
  } catch (error) {
    console.error('❌ callStatus error:', error.message);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling 1092. Please stay on the line.</Say>
</Response>`);
  }
};


const forwardAgent = async (req, res) => {

  try {

    const { callSid, severity } = req.body;

    if (!callSid || !severity) {

      return res.status(400).json({
        success: false,
        error:
          'callSid and severity are required',
      });
    }

    // check severity

    const shouldForward =
      shouldTransfer(severity);

    // LOW severity

    if (!shouldForward) {

      return res.json({
        success: true,
        message:
          'LOW severity. No transfer needed.',
      });
    }

    // find officer

    const officer =
      await findAvailableOfficer();

    console.log(
      '\n👮 Officer Assigned:',
      officer.name
    );

    // create alert

    await createAlert({
      severity,
      summary:
        'Emergency case requires immediate attention',
    });

    // transfer call

    const result =
      await transferCall({
        callSid,
        officer,
        reason:
          'AI detected HIGH/CRITICAL emergency',
      });

    return res.json({
      success: true,
      message:
        'Call forwarded successfully',
      data: result,
    });

  } catch (error) {

    console.error(
      '❌ forwardAgent error:',
      error.message
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


const health = (req, res) => {
  res.json({ success: true, message: 'Telephony service is running', timestamp: new Date().toISOString() });
};

module.exports = { incomingCall, callStatus, forwardAgent, health };