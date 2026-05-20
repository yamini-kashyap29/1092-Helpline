'use strict';

/**
 * seed/index.js
 *
 * Entry point for seeding the database with mock data.
 * Initializes tables first, then runs seedMockData.js.
 *
 * Run:  node src/database/seed/index.js
 * Or add to package.json scripts:  "db:seed": "node src/database/seed/index.js"
 *
 * Guards:
 *  - Will NOT run in production unless ALLOW_SEED_IN_PROD=true is explicitly set.
 *  - Logs total records inserted per model.
 */

const { sequelize } = require('../index');

// Models are already initialized and associated in ../index.js

const { seedMockData } = require('./seedMockData');

const ENV = process.env.NODE_ENV || 'development';
const ALLOW_IN_PROD = process.env.ALLOW_SEED_IN_PROD === 'true';

async function runSeed() {
  // ── Production guard ────────────────────────────────────────────────────────
  if (ENV === 'production' && !ALLOW_IN_PROD) {
    console.error(
      '🚫 Seeding is disabled in production. ' +
      'Set ALLOW_SEED_IN_PROD=true to override (use with caution).'
    );
    process.exit(1);
  }

  try {
    // ── Connect ──────────────────────────────────────────────────────────────
    console.log('🔌 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log(`✅ Connected. Environment: ${ENV}`);

    // ── Sync tables bypassed (safe when server is running) ───────────────────
    // console.log('📦 Syncing tables...');
    // await sequelize.sync({ force: false, alter: false });
    // console.log('✅ Tables ready.');

    // ── Run seed ─────────────────────────────────────────────────────────────
    console.log('\n🌱 Starting seed...\n');
    const result = await seedMockData();

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────');
    console.log('📊 Seed Summary:');
    if (result && typeof result === 'object') {
      for (const [model, count] of Object.entries(result)) {
        console.log(`   ✔ ${model}: ${count} record(s) inserted`);
      }
    } else {
      console.log('   ✔ Seed completed (no summary returned).');
    }
    console.log('─────────────────────────────\n');
    console.log('🎉 Database seeded successfully.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed.');
  }
}

// ─────────────────────────────────────────────
// Run directly
// ─────────────────────────────────────────────
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSeed };