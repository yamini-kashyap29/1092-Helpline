const { sequelize, Officer, Alert } = require('../Database');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connected.');
    
    const officers = await Officer.findAll();
    console.log('--- Officers ---');
    console.log(officers.map(o => ({ id: o.id, employee_id: o.employee_id, full_name: o.full_name })));
    
    const alerts = await Alert.findAll();
    console.log('--- Alerts ---');
    console.log(alerts.map(a => ({ id: a.id, assigned_officer_id: a.assigned_officer_id })));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

check();
