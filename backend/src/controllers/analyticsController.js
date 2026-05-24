const analyticsService = require('../services/analyticsService');

class AnalyticsController {
  async getAnalytics(req, res) {
    try {
      const data = await analyticsService.getAnalytics();
      res.json(data);
    } catch (err) {
      console.error('[Analytics Error]:', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AnalyticsController();
