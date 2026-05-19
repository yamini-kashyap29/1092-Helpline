'use strict';

const { Sequelize } = require('sequelize');
require('dotenv').config();

// ─── Connection ────────────────────────────────────────────────────────────────

const sequelize = new Sequelize(
  process.env.DB_NAME || '1098_helpline',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',

    logging: process.env.NODE_ENV === 'development'
      ? (msg) => console.log(`[Sequelize] ${msg}`)
      : false,

    pool: {
      max:     parseInt(process.env.DB_POOL_MAX  || '10', 10),
      min:     parseInt(process.env.DB_POOL_MIN  || '2',  10),
      acquire: parseInt(process.env.DB_POOL_ACQ  || '30000', 10),
      idle:    parseInt(process.env.DB_POOL_IDLE || '10000', 10),
    },

    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false,
      statement_timeout: parseInt(process.env.DB_STMT_TIMEOUT || '30000', 10),
      idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TX_TIMEOUT || '60000', 10),
    },

    define: {
      underscored:     true,
      timestamps:      true,
      paranoid:        false,
      freezeTableName: false,
    },

    timezone: '+00:00',
  }
);

// ─── Model Imports ─────────────────────────────────────────────────────────────

const Call         = require('./models/Call')(sequelize);
const Transcript   = require('./models/Transcript')(sequelize);
const AIResult     = require('./models/AIResult')(sequelize);
const Alert        = require('./models/Alert')(sequelize);
const Officer      = require('./models/Officer')(sequelize);
const Transfer     = require('./models/Transfer')(sequelize);
const Notification = require('./models/Notification')(sequelize);

// ─── Associations ──────────────────────────────────────────────────────────────

// Call → Transcript (one-to-many)
Call.hasMany(Transcript, { foreignKey: 'call_id', as: 'transcripts', onDelete: 'CASCADE' });
Transcript.belongsTo(Call, { foreignKey: 'call_id', as: 'call' });

// Call → AIResult (one-to-many)
Call.hasMany(AIResult, { foreignKey: 'call_id', as: 'aiResults', onDelete: 'CASCADE' });
AIResult.belongsTo(Call, { foreignKey: 'call_id', as: 'call' });

// Call → Alert (one-to-many)
Call.hasMany(Alert, { foreignKey: 'call_id', as: 'alerts', onDelete: 'CASCADE' });
Alert.belongsTo(Call, { foreignKey: 'call_id', as: 'call' });

// Call → Transfer (one-to-many)
Call.hasMany(Transfer, { foreignKey: 'call_id', as: 'transfers', onDelete: 'CASCADE' });
Transfer.belongsTo(Call, { foreignKey: 'call_id', as: 'call' });

// Officer → Transfer (one-to-many)
Officer.hasMany(Transfer, { foreignKey: 'officer_id', as: 'transfers' });
Transfer.belongsTo(Officer, { foreignKey: 'officer_id', as: 'officer' });

// Alert → Notification (one-to-many)
Alert.hasMany(Notification, { foreignKey: 'alert_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(Alert, { foreignKey: 'alert_id', as: 'alert' });

// Officer → Notification (one-to-many)
Officer.hasMany(Notification, { foreignKey: 'officer_id', as: 'notifications' });
Notification.belongsTo(Officer, { foreignKey: 'officer_id', as: 'officer' });

// Transcript → AIResult (one-to-many)
Transcript.hasMany(AIResult, { foreignKey: 'transcript_id', as: 'aiResults' });
AIResult.belongsTo(Transcript, { foreignKey: 'transcript_id', as: 'transcript' });

// ─── DB Connect & Sync Helper ──────────────────────────────────────────────────

const connectDB = async ({ sync = false, force = false, alter = false } = {}) => {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection established successfully.');

    if (sync) {
      await sequelize.sync({ force, alter });
      console.log(`[DB] Models synced (force=${force}, alter=${alter}).`);
    }
  } catch (error) {
    console.error('[DB] Unable to connect to the database:', error.message);
    throw error;
  }
};

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  sequelize,
  connectDB,
  Call,
  Transcript,
  AIResult,
  Alert,
  Officer,
  Transfer,
  Notification,
};