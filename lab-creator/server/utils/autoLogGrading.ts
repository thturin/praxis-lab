/**
 * Auto-logging utility for grading results
 *
 * Usage: Set ENABLE_GRADING_LOG=true in .env to automatically log interesting test cases
 */

import { logTestCase } from './logTestCase';

interface GradingData {
  question: string;
  answerKey: string;
  studentResponse: string;
  questionType: string;
  lgeResult: { answerQuality: string; compliance: string; feedback: string };
  breakdown: {
    textSimilarity?: number;
    keyPointsSimilarity?: number;
    pseudoQuestionSimilarity?: number;
  };
  finalResult: 'PASS' | 'FAIL';
  overrideTriggered: boolean;
  testCode?: string;
  expectedOutput?: string;
}

/**
 * Automatically logs grading results if certain conditions are met
 * (e.g., override triggered, edge cases, or manual flag set)
 */
export async function autoLogIfInteresting(
  data: GradingData,
  forceLog: boolean = false
): Promise<void> {
  const shouldLog = forceLog || shouldLogCase(data);

  if (!shouldLog || !process.env.ENABLE_GRADING_LOG) {
    return;
  }

  try {
    // Generate a descriptive title
    const title = generateTitle(data);

    // Convert to TestCaseData format
    const testCaseData = {
      questionType: mapQuestionType(data.questionType),
      question: data.question,
      answerKey: data.answerKey,
      studentResponse: data.studentResponse,
      breakdown: {
        lge: data.lgeResult.answerQuality.toLowerCase() as 'pass' | 'fail',
        tsm: data.breakdown.textSimilarity || 0,
        kpm: data.breakdown.keyPointsSimilarity || 0,
        pqm: data.breakdown.pseudoQuestionSimilarity || 0
      },
      overrideTriggered: data.overrideTriggered,
      finalResult: data.finalResult,
      feedback: data.lgeResult.feedback,
      analysis: generateAnalysis(data),
      lesson: generateLesson(data),
      testCode: data.testCode,
      expectedOutput: data.expectedOutput
    };

    await logTestCase(testCaseData, title);
  } catch (error) {
    console.error('Error auto-logging test case:', error);
    // Don't throw - logging shouldn't break grading
  }
}

/**
 * Determines if a case is interesting enough to log automatically
 */
function shouldLogCase(data: GradingData): boolean {
  // Log if override was triggered
  if (data.overrideTriggered) return true;

  // Log if there's a disagreement between modules (high variance)
  const scores = [
    data.breakdown.textSimilarity || 0,
    data.breakdown.keyPointsSimilarity || 0,
    data.breakdown.pseudoQuestionSimilarity || 0
  ];
  const variance = calculateVariance(scores);
  if (variance > 0.05) return true; // Scores differ significantly

  // Log edge cases (close to threshold)
  const kpm = data.breakdown.keyPointsSimilarity || 0;
  if (Math.abs(kpm - 0.65) < 0.05) return true; // Close to override threshold

  return false;
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
}

function mapQuestionType(type: string): 'Java Coding' | 'Short Answer' | 'Multiple Choice' | 'Essay' {
  if (type.toLowerCase().includes('code') || type.toLowerCase().includes('java')) {
    return 'Java Coding';
  }
  if (type.toLowerCase().includes('essay')) {
    return 'Essay';
  }
  if (type.toLowerCase().includes('multiple') || type.toLowerCase().includes('choice')) {
    return 'Multiple Choice';
  }
  return 'Short Answer';
}

function generateTitle(data: GradingData): string {
  if (data.overrideTriggered) {
    return `Override Case: ${data.finalResult} (LGE: ${data.lgeResult.answerQuality})`;
  }

  const questionPreview = data.question.substring(0, 50).replace(/\n/g, ' ');
  return questionPreview + (data.question.length > 50 ? '...' : '');
}

function generateAnalysis(data: GradingData): string {
  let analysis = '';

  if (data.overrideTriggered) {
    analysis += '- KPM override was triggered, overriding LGE decision\n';
    analysis += `- LGE initially marked as ${data.lgeResult.answerQuality.toUpperCase()}\n`;
  }

  analysis += `- TSM: ${(data.breakdown.textSimilarity || 0).toFixed(3)} (text similarity)\n`;
  analysis += `- KPM: ${(data.breakdown.keyPointsSimilarity || 0).toFixed(3)} (key points matching)\n`;
  analysis += `- PQM: ${(data.breakdown.pseudoQuestionSimilarity || 0).toFixed(3)} (pseudo-question matching)\n`;

  return analysis;
}

function generateLesson(data: GradingData): string {
  if (data.overrideTriggered) {
    return 'Multi-module approach successfully caught a potential false negative from LGE.';
  }

  const scores = [
    data.breakdown.textSimilarity || 0,
    data.breakdown.keyPointsSimilarity || 0,
    data.breakdown.pseudoQuestionSimilarity || 0
  ];
  const allHigh = scores.every(s => s > 0.8);
  const allLow = scores.every(s => s < 0.5);

  if (allHigh) {
    return 'All modules aligned on high similarity - clear correct answer.';
  }
  if (allLow) {
    return 'All modules aligned on low similarity - clear incorrect answer.';
  }

  return 'Mixed signals from different modules - interesting edge case for further analysis.';
}

export { GradingData };
