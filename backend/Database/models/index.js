'use strict';

// ✅ Fixed: Explicitly pointing to the index.js file inside the parent Database directory
const sequelize = require('../index.js');

// Initialize models properly
const Call = require('./Call')(sequelize);
const Transcript = require('./Transcript')(sequelize);
const AIResult = require('./AIResult')(sequelize);
const Alert = require('./Alert')(sequelize);
const Officer = require('./Officer')(sequelize);
const Transfer = require('./Transfer')(sequelize);
const Notification = require('./Notification')(sequelize);

// Associations

Call.hasMany(Transcript, {
  foreignKey: 'call_id',
  as: 'transcripts'
});
Transcript.belongsTo(Call, {
  foreignKey: 'call_id',
  as: 'call'
});

Call.hasMany(AIResult, {
  foreignKey: 'call_id',
  as: 'aiResults'
});
AIResult.belongsTo(Call, {
  foreignKey: 'call_id',
  as: 'call'
});

Call.hasMany(Alert, {
  foreignKey: 'call_id',
  as: 'alerts'
});
Alert.belongsTo(Call, {
  foreignKey: 'call_id',
  as: 'call'
});

Call.hasMany(Transfer, {
  foreignKey: 'call_id',
  as: 'transfers'
});
Transfer.belongsTo(Call, {
  foreignKey: 'call_id',
  as: 'call'
});

Officer.hasMany(Transfer, {
  foreignKey: 'officer_id',
  as: 'transfers'
});
Transfer.belongsTo(Officer, {
  foreignKey: 'officer_id',
  as: 'officer'
});

module.exports = {
  sequelize,
  Call,
  Transcript,
  AIResult,
  Alert,
  Officer,
  Transfer,
  Notification
};