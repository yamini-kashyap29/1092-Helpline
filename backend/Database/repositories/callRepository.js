'use strict';

const { Op } = require('sequelize');
// ✅ FIXED: Pointing directly to Database/index.js to bypass the redundant models/index.js loop
const { Call, Transcript, AIResult, Alert, Transfer } = require('../index.js');

// ─── Create ────────────────────────────────────────────────────────────────────

const createCall = async (data) => {
  return Call.create(data);
};

// ─── Read ──────────────────────────────────────────────────────────────────────

const getCallById = async (id, { withRelations = false } = {}) => {
  const options = { where: { id } };

  if (withRelations) {
    options.include = [
      { model: Transcript,   as: 'transcripts',  order: [['sequence_no', 'ASC']] },
      { model: AIResult,     as: 'aiResults',    order: [['analysed_at', 'DESC']] },
      { model: Alert,        as: 'alerts' },
      { model: Transfer,     as: 'transfers' },
    ];
  }

  return Call.findOne(options);
};

const getAllCalls = async ({
  page        = 1,
  limit       = 20,
  status,
  severity_level,
  channel,
  caller_number,
  from_date,
  to_date,
  is_test     = false,
} = {}) => {
  const where = { is_test };

  if (status)         where.status         = status;
  if (severity_level) where.severity_level = severity_level;
  if (channel)        where.channel        = channel;
  if (caller_number)  where.caller_number  = { [Op.iLike]: `%${caller_number}%` };

  if (from_date || to_date) {
    where.started_at = {};
    if (from_date) where.started_at[Op.gte] = new Date(from_date);
    if (to_date)   where.started_at[Op.lte] = new Date(to_date);
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await Call.findAndCountAll({
    where,
    limit,
    offset,
    order: [['started_at', 'DESC']],
  });

  return {
    total:       count,
    page:        Number(page),
    total_pages: Math.ceil(count / limit),
    data:        rows,
  };
};

const getCallsByCallerNumber = async (caller_number) => {
  return Call.findAll({
    where:  { caller_number },
    order:  [['started_at', 'DESC']],
    limit:  50,
  });
};

const getActiveCalls = async () => {
  return Call.findAll({
    where: { status: ['initiated', 'active', 'on_hold'] },
    order: [['started_at', 'ASC']],
  });
};

const getCriticalCalls = async () => {
  return Call.findAll({
    where: { severity_level: 'critical', status: { [Op.notIn]: ['completed', 'dropped', 'failed'] } },
    order: [['started_at', 'ASC']],
  });
};

// ─── Update ────────────────────────────────────────────────────────────────────

const updateCall = async (id, data) => {
  const [affectedRows, [updated]] = await Call.update(data, {
    where:     { id },
    returning: true,
  });
  return affectedRows > 0 ? updated : null;
};

const endCall = async (id, { ended_at, duration_seconds } = {}) => {
  const now = ended_at || new Date();
  return updateCall(id, { status: 'completed', ended_at: now, duration_seconds });
};

const updateSeverity = async (id, severity_level) => {
  return updateCall(id, { severity_level });
};

// ─── Delete ────────────────────────────────────────────────────────────────────

const deleteCall = async (id) => {
  return Call.destroy({ where: { id } });
};

// ─── Stats ─────────────────────────────────────────────────────────────────────

const getCallStats = async () => {
  // ✅ FIXED: Points directly to the clean parent database configuration instance
  const { sequelize } = require('../index.js');

  const result = await Call.findAll({
    attributes: [
      'status',
      'severity_level',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['status', 'severity_level'],
    raw:   true,
  });

  return result;
};

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  createCall,
  getCallById,
  getAllCalls,
  getCallsByCallerNumber,
  getActiveCalls,
  getCriticalCalls,
  updateCall,
  endCall,
  updateSeverity,
  deleteCall,
  getCallStats,
};