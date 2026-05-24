const { sequelize, Call, AIResult } = require('../../Database');
const { Op } = require('sequelize');

class AnalyticsService {
  async getCallsOverTime(hours = 24) {
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const rows = await Call.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'hour', sequelize.col('started_at')), 'hour'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      where: { started_at: { [Op.gte]: since } },
      group: [sequelize.fn('date_trunc', 'hour', sequelize.col('started_at'))],
      order: [[sequelize.fn('date_trunc', 'hour', sequelize.col('started_at')), 'ASC']],
      raw: true,
    });

    // normalize to hourly buckets
    const map = new Map();
    rows.forEach(r => map.set(new Date(r.hour).getHours(), parseInt(r.count, 10)));

    const result = Array.from({ length: hours }, (_, i) => {
      const dt = new Date(Date.now() - (hours - i - 1) * 3600 * 1000);
      const hour = String(dt.getHours()).padStart(2, '0') + ':00';
      return { hour, value: map.get(dt.getHours()) || 0 };
    });

    return result;
  }

  async getLanguageDistribution() {
    const rows = await Call.findAll({
      attributes: ['language', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['language'],
      raw: true,
    });
    return rows.map(r => ({ language: r.language || 'Unknown', count: parseInt(r.count, 10) }));
  }

  async getEmotionDistribution() {
    // Prefer AIResult.sentiment where available, fallback to Call.metadata
    const rows = await AIResult.findAll({
      attributes: ['sentiment', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['sentiment'],
      raw: true,
    });
    return rows.map(r => ({ name: r.sentiment || 'neutral', value: parseInt(r.count, 10) }));
  }

  async getEscalationReasons() {
    // Use AIResult.escalation_reason where present
    const rows = await AIResult.findAll({
      attributes: ['escalation_reason', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { escalation_reason: { [Op.ne]: null } },
      group: ['escalation_reason'],
      raw: true,
    });
    return rows.map(r => ({ reason: r.escalation_reason, count: parseInt(r.count, 10) }));
  }

  async getAnalytics() {
    const [callsOverTime, languageDistribution, emotionDistribution, escalationReasons] = await Promise.all([
      this.getCallsOverTime(24),
      this.getLanguageDistribution(),
      this.getEmotionDistribution(),
      this.getEscalationReasons(),
    ]);

    return {
      callsOverTime: callsOverTime.map(c => ({ hour: c.hour, aiHandled: c.value, escalated: 0 })),
      languageDistribution,
      emotionDistribution,
      escalationReasons,
    };
  }
}

module.exports = new AnalyticsService();
