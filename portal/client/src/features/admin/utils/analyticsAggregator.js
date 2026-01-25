// Analytics data aggregation utility functions

// Extract all scored questions from lab blocks (including subQuestions)
export function extractQuestions(blocks) {
  if (!blocks || !Array.isArray(blocks)) return [];

  return blocks.flatMap(block => {
    if (block.blockType !== 'question') return [];

    // Check for subQuestions first
    const scoredSubQuestions = (block.subQuestions || []).filter(sq => sq.isScored);
    if (scoredSubQuestions?.length) {
      return scoredSubQuestions;
    }

    // Return parent question if it's scored
    if (block.isScored) {
      return [block];
    }

    return [];
  });
}

// Helper: Check if submission is late
function isLate(submission, assignment) {
  if (!submission?.submittedAt || !assignment?.dueDate) return null;
  return new Date(submission.submittedAt) > new Date(assignment.dueDate);
}

// Helper: Calculate late penalty
function calculateLatePenalty(submission) {
  if (!submission) return 0;
  const rawScore = submission.rawScore || 0;
  const finalScore = submission.score || 0;
  return rawScore - finalScore;
}

// Aggregate student progress data
export function aggregateStudentProgress(sessions, submissions, questions, users = []) {
  if (!sessions || !Array.isArray(sessions)) return [];

  return sessions.map(session => {
    const submission = submissions?.find(s => s.userId === session.userId);
    const user = users?.find(u => u.id === session.userId);
    const questionScores = session.gradedResults || {};

    // Count correct answers (score >= 0.8 considered correct)
    const correctCount = Object.values(questionScores)
      .filter(r => r && r.score >= 0.8).length;

    return {
      userId: session.userId,
      username: session.username || user?.username || 'Unknown',
      name: user?.name || session.username || 'Unknown',
      section: user?.section?.name || 'No Section',
      overallScore: parseFloat(session.finalScore?.percent || 0),
      questionsAnswered: Object.keys(session.responses || {}).length,
      questionsCorrect: correctCount,
      submittedAt: submission?.submittedAt || null,
      isLate: submission ? isLate(submission) : null,
      latePenalty: submission ? calculateLatePenalty(submission) : 0,
      questionScores
    };
  });
}

// Calculate question-level statistics
export function aggregateQuestionStats(sessions, questionId) {
  if (!sessions || !Array.isArray(sessions)) {
    return { avgScore: 0, passRate: 0, responseCount: 0 };
  }

  const scores = sessions
    .map(s => s.gradedResults?.[questionId]?.score)
    .filter(score => score !== undefined && score !== null);

  if (scores.length === 0) {
    return { avgScore: 0, passRate: 0, responseCount: 0 };
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const passRate = scores.filter(s => s >= 0.8).length / scores.length;

  return {
    avgScore: (avgScore * 100).toFixed(1), // Convert to percentage
    passRate: (passRate * 100).toFixed(1), // Convert to percentage
    responseCount: scores.length
  };
}

// Get all responses for a specific question
export function getQuestionResponses(sessions, questionId, questions) {
  if (!sessions || !Array.isArray(sessions)) return [];

  const question = questions?.find(q => q.id === questionId);

  return sessions.map(session => ({
    userId: session.userId,
    username: session.username,
    response: session.responses?.[questionId] || 'No response',
    score: session.gradedResults?.[questionId]?.score || 0,
    feedback: session.gradedResults?.[questionId]?.feedback || 'No feedback',
    questionPrompt: question?.prompt || 'Unknown question'
  })).filter(r => r.response !== 'No response'); // Only include students who answered
}
