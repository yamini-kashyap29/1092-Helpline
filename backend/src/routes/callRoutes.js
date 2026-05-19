const express = require('express');
const router = express.Router();

// 1. Swap raw models with your actual repository singleton
const callRepository = require('../../Database/repositories/callRepository');

// ==========================================
// 1. STATIC/LITERAL ROUTES FIRST 
// ==========================================

// GET /api/v1/calls/dashboard/stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Leverage your built-in group-by aggregations directly
    const rawStats = await callRepository.getCallStats();

    let totalCalls = 0;
    let completedResolved = 0;
    let escalatedCount = 0;

    rawStats.forEach(row => {
      const countNum = parseInt(row.count, 10) || 0;
      totalCalls += countNum;
      
      // Map across your database enum flags ('completed', 'escalated', etc.)
      if (row.status === 'completed' || row.status === 'resolved') {
        completedResolved += countNum;
      }
      if (row.status === 'escalated') {
        escalatedCount += countNum;
      }
    });

    res.json({
      totalCallsToday: totalCalls,
      aiHandledPercent: totalCalls ? Math.round((completedResolved / totalCalls) * 100) : 0,
      escalatedToHuman: escalatedCount,
      avgConfidenceScore: 88 // Replace with live analytical field math when desired
    });
  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/calls - Base history log lookup
router.get('/', async (req, res) => {
  try {
    const { status, language } = req.query;

    // 2. Delegate directly to your repo's advanced pagination/filtering core
    // Note: your repo defaults to limit=20, page=1. Let's ask for 100 on history view
    const repoResponse = await callRepository.getAllCalls({
      status: status === 'All' ? undefined : status,
      limit: 100 
    });

    // Handle both wrapped repository structures or raw fallback data gracefully
    const callsArray = Array.isArray(repoResponse) ? repoResponse : (repoResponse.data || []);

    // 3. Transform structure to match frontend expectations
    const mappedCalls = callsArray.map(c => ({
      callId: c.id.toString(),
      startTime: c.started_at || c.created_at,
      duration: c.duration_seconds || c.duration || 0,
      language: c.language || 'English',
      emotion: c.emotion || 'neutral',
      intent: c.intent || 'General Query',
      confidence: parseFloat(c.confidence) || 85,
      status: c.status === 'completed' ? 'resolved' : c.status, // Normalizes status strings
      handledBy: c.handled_by || 'AI System',
      issue: c.issue_summary || 'No summary provided',
      // If scripts weren't preloaded in bulk, verify array boundaries safely
      transcript: (c.transcripts || []).map(t => ({
        id: t.id,
        speaker: t.speaker, 
        text: t.text
      })),
      verifications: []
    }));

    res.json(mappedCalls);
  } catch (error) {
    console.error('[Backend Routes History Error]:', error);
    res.status(500).json({ error: 'Failed to fetch call records' });
  }
});

// ==========================================
// 2. DYNAMIC / PARAMETERIZED ROUTES LAST
// ==========================================

// POST /api/v1/calls/:id/end
router.post('/:id/end', async (req, res) => {
  try {
    const callId = req.params.id;
    
    // Check if record exists before running update statement calculations
    const checkCall = await callRepository.getCallById(callId);
    if (!checkCall) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    // 4. Fire the native update engine from your repository layer
    await callRepository.endCall(callId, {
      ended_at: new Date(),
      duration_seconds: checkCall.started_at ? Math.round((new Date().getTime() - new Date(checkCall.started_at).getTime()) / 1000) : 0
    });

    res.json({ success: true, message: 'Call ended successfully' });
  } catch (error) {
    console.error('[End Call Route Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;