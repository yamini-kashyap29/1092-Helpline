const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

router.get('/dashboard/stats', callController.getDashboardStats);
router.get('/', callController.getCalls);
router.get('/:id', callController.getCallDetails);
router.patch('/:id/severity', callController.updateSeverity);
router.post('/:id/end', callController.endCall);

module.exports = router;