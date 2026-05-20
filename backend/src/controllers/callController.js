const callService = require('../services/callService');

class CallController {
  async getDashboardStats(req, res) {
    try {
      const stats = await callService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('[Dashboard Stats Error]:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getCalls(req, res) {
    try {
      const calls = await callService.getCalls(req.query);
      res.json(calls);
    } catch (error) {
      console.error('[Backend Routes History Error]:', error);
      res.status(500).json({ error: 'Failed to fetch call records' });
    }
  }

  async getCallDetails(req, res) {
    try {
      const callId = req.params.id;
      const call = await callService.getCallDetails(callId);
      
      if (!call) {
        return res.status(404).json({ error: 'Call session not found' });
      }
      
      res.json(call);
    } catch (error) {
      console.error('[Get Call Route Error]:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateSeverity(req, res) {
    try {
      const callId = req.params.id;
      const { severity_level } = req.body;
      
      if (!severity_level) {
        return res.status(400).json({ error: 'severity_level is required' });
      }

      const updatedCall = await callService.updateSeverity(callId, severity_level);
      if (!updatedCall) {
        return res.status(404).json({ error: 'Call session not found' });
      }

      res.json({ success: true, call: updatedCall });
    } catch (error) {
      console.error('[Update Severity Route Error]:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async endCall(req, res) {
    try {
      const callId = req.params.id;
      
      const success = await callService.endCall(callId);
      if (!success) {
        return res.status(404).json({ error: 'Call session not found' });
      }

      res.json({ success: true, message: 'Call ended successfully' });
    } catch (error) {
      console.error('[End Call Route Error]:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CallController();
