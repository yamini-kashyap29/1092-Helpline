const callRepository = require('../../Database/repositories/callRepository');

class CallService {
  async getDashboardStats() {
    // Leverage built-in group-by aggregations directly
    const rawStats = await callRepository.getCallStats();

    let totalCalls = 0;
    let completedResolved = 0;
    let escalatedCount = 0;

    rawStats.forEach(row => {
      const countNum = parseInt(row.count, 10) || 0;
      totalCalls += countNum;
      
      // Map across database enum flags ('completed', 'escalated', etc.)
      if (row.status === 'completed' || row.status === 'resolved') {
        completedResolved += countNum;
      }
      if (row.status === 'escalated') {
        escalatedCount += countNum;
      }
    });

    return {
      totalCallsToday: totalCalls,
      aiHandledPercent: totalCalls ? Math.round((completedResolved / totalCalls) * 100) : 0,
      escalatedToHuman: escalatedCount,
      avgConfidenceScore: 88 // Replace with live analytical field math when desired
    };
  }

  async getCalls(filters) {
    const { status, language } = filters;

    let queryStatus = status === 'All' ? undefined : status;
    if (status === 'ongoing') {
      queryStatus = ['initiated', 'active', 'on_hold'];
    } else if (status === 'resolved') {
      queryStatus = 'completed';
    }

    // Delegate directly to repo's advanced pagination/filtering core
    // Note: repo defaults to limit=20, page=1. Let's ask for 100 on history view
    const repoResponse = await callRepository.getAllCalls({
      status: queryStatus,
      limit: 100 
    });

    // Handle both wrapped repository structures or raw fallback data gracefully
    const callsArray = Array.isArray(repoResponse) ? repoResponse : (repoResponse.data || []);

    // Transform structure to match frontend expectations
    const mappedCalls = callsArray.map(c => ({
      callId: c.id.toString(),
      startTime: c.started_at || c.created_at,
      duration: c.duration_seconds || c.duration || 0,
      language: c.language || 'English',
      emotion: c.metadata?.emotion || c.emotion || 'neutral',
      intent: c.metadata?.intent || c.intent || 'General Query',
      confidence: parseFloat(c.metadata?.confidence) || parseFloat(c.confidence) || 85,
      status: c.status === 'completed' ? 'resolved' : c.status, // Normalizes status strings
      handledBy: c.metadata?.handledBy || c.metadata?.handled_by || c.handled_by || 'AI System',
      issue: c.metadata?.issue_summary || c.issue_summary || 'No summary provided',
      // If scripts weren't preloaded in bulk, verify array boundaries safely
      transcript: (c.transcripts || []).map(t => ({
        id: t.id,
        speaker: t.speaker, 
        text: t.text
      })),
      verifications: []
    }));

    return mappedCalls;
  }

  async getCallDetails(callId) {
    const call = await callRepository.getCallById(callId, { withRelations: true });
    
    if (!call) {
      return null;
    }
    
    // Transform to match frontend expectations
    const mappedCall = {
      callId: call.id.toString(),
      startTime: call.started_at || call.created_at,
      duration: call.duration_seconds || call.duration || 0,
      language: call.language || 'English',
      emotion: call.metadata?.emotion || call.emotion || 'neutral',
      intent: call.metadata?.intent || call.intent || 'General Query',
      confidence: parseFloat(call.metadata?.confidence) || parseFloat(call.confidence) || 85,
      status: call.status === 'completed' ? 'resolved' : call.status,
      handledBy: call.metadata?.handledBy || call.metadata?.handled_by || call.handled_by || 'AI System',
      issue: call.metadata?.issue_summary || call.issue_summary || 'No summary provided',
      urgency: call.severity_level || 'low',
      transcript: (call.transcripts || []).map(t => ({
        id: t.id,
        speaker: t.speaker, 
        text: t.text,
        timestamp: t.created_at || new Date().toISOString()
      })),
      verifications: [],
      suggestedActions: call.metadata?.ai_reply ? [call.metadata.ai_reply] : [],
      emotionHistory: []
    };
    
    return mappedCall;
  }

  async updateSeverity(callId, severity_level) {
    const checkCall = await callRepository.getCallById(callId);
    if (!checkCall) {
      return null;
    }

    const updatedCall = await callRepository.updateSeverity(callId, severity_level);
    return updatedCall;
  }

  async endCall(callId) {
    // Check if record exists before running update statement calculations
    const checkCall = await callRepository.getCallById(callId);
    if (!checkCall) {
      return false;
    }

    // Fire the native update engine from your repository layer
    await callRepository.endCall(callId, {
      ended_at: new Date(),
      duration_seconds: checkCall.started_at ? Math.round((new Date().getTime() - new Date(checkCall.started_at).getTime()) / 1000) : 0
    });

    return true;
  }
}

module.exports = new CallService();
