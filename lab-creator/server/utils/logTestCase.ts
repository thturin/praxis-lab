import * as fs from 'fs';
import * as path from 'path';

interface TestCaseData {
  questionType: 'Java Coding' | 'Short Answer' ;
  question: string;
  answerKey: string;
  studentResponse: string;
  breakdown: {
    lge: 'pass' | 'fail';
    tsm: number;
    kpm: number;
    pqm: number;
  };
  overrideTriggered: boolean;
  finalResult: 'PASS' | 'FAIL';
  feedback: string;
  analysis: string;
  lesson: string;
  testCode?: string; // Optional, for coding questions
  expectedOutput?: string; // Optional, for coding questions
}

const TEST_CASES_FILE = path.join(__dirname, '../../../docs/ai-architecture-development/GRADING_TEST_CASES.md');

/**
 * Appends a new test case to the GRADING_TEST_CASES.md file
 */
export async function logTestCase(data: TestCaseData, title: string): Promise<void> {
  try {
    // Read existing file
    const fileContent = fs.readFileSync(TEST_CASES_FILE, 'utf-8');

    // Extract current test case count
    const testCaseMatches = fileContent.match(/## Test Case #(\d+):/g);
    const nextNumber = testCaseMatches ? testCaseMatches.length + 1 : 1;

    // Build new test case markdown
    const testCaseMarkdown = buildTestCaseMarkdown(data, title, nextNumber);

    // Find insertion point (before "## Template for New Test Cases" or "## Summary Statistics")
    const templateIndex = fileContent.indexOf('## Template for New Test Cases');
    const summaryIndex = fileContent.indexOf('## Summary Statistics');
    const insertionPoint = templateIndex !== -1 ? templateIndex : summaryIndex;

    if (insertionPoint === -1) {
      throw new Error('Could not find insertion point in test cases file');
    }

    // Insert new test case
    const beforeInsertion = fileContent.substring(0, insertionPoint);
    const afterInsertion = fileContent.substring(insertionPoint);
    const updatedContent = beforeInsertion + testCaseMarkdown + '\n---\n\n' + afterInsertion;

    // Update summary statistics
    const finalContent = updateSummaryStats(updatedContent, data);

    // Write back to file
    fs.writeFileSync(TEST_CASES_FILE, finalContent, 'utf-8');

    console.log(`✅ Test case #${nextNumber} logged successfully: "${title}"`);
  } catch (error) {
    console.error('Error logging test case:', error);
    throw error;
  }
}

function buildTestCaseMarkdown(data: TestCaseData, title: string, number: number): string {
  const today = new Date().toISOString().split('T')[0];
  const resultEmoji = data.finalResult === 'PASS' ? '✅' : '❌';

  let markdown = `## Test Case #${number}: ${title}\n\n`;
  markdown += `**Date**: ${today}\n`;
  markdown += `**Question Type**: ${data.questionType}\n\n`;

  markdown += `### Question\n`;
  if (data.questionType === 'Java Coding') {
    markdown += '```java\n' + data.question + '\n```\n\n';

    if (data.testCode) {
      markdown += `**Test Code**:\n\`\`\`java\n${data.testCode}\n\`\`\`\n\n`;
    }

    if (data.expectedOutput) {
      markdown += `**Expected Output**:\n\`\`\`\n${data.expectedOutput}\n\`\`\`\n\n`;
    }
  } else {
    markdown += `${data.question}\n\n`;
  }

  markdown += `### Answer Key\n`;
  if (data.questionType === 'Java Coding') {
    markdown += '```java\n' + data.answerKey + '\n```\n\n';
  } else {
    markdown += `${data.answerKey}\n\n`;
  }

  markdown += `### Student Response\n`;
  if (data.questionType === 'Java Coding') {
    markdown += '```java\n' + data.studentResponse + '\n```\n\n';
  } else {
    markdown += `${data.studentResponse}\n\n`;
  }

  markdown += `### Grading Breakdown\n`;
  markdown += '```\n';
  markdown += `LGE (Primary):  ${data.breakdown.lge}\n`;
  markdown += `TSM (Text Sim): ${data.breakdown.tsm.toFixed(3)}\n`;
  markdown += `KPM (Key Pts):  ${data.breakdown.kpm.toFixed(3)}\n`;
  markdown += `PQM (Pseudo-Q): ${data.breakdown.pqm.toFixed(3)}\n`;
  markdown += '```\n\n';

  markdown += `**Override Triggered**: ${data.overrideTriggered ? 'YES' : 'NO'}\n`;
  if (data.overrideTriggered) {
    markdown += `- KPM score (${data.breakdown.kpm.toFixed(3)}) >= 0.65 threshold → Override LGE failure to PASS\n`;
  }
  markdown += '\n';

  markdown += `### Final Result\n`;
  markdown += `${resultEmoji} **${data.finalResult}**${data.overrideTriggered ? ' (via KPM override)' : ''}\n\n`;

  markdown += `**Feedback**:\n`;
  markdown += `> "${data.feedback}"\n\n`;

  markdown += `### Analysis\n`;
  markdown += `**Why This Case Matters**:\n`;
  markdown += `${data.analysis}\n\n`;
  markdown += `**Lesson**: ${data.lesson}\n\n`;

  return markdown;
}

function updateSummaryStats(content: string, newCase: TestCaseData): string {
  // Extract current stats
  const totalMatch = content.match(/\| Total Test Cases \| (\d+) \|/);
  const correctMatch = content.match(/\| Correct Grades \| (\d+) \|/);
  const falsePositiveMatch = content.match(/\| False Positives \(Wrong PASS\) \| (\d+) \|/);
  const falseNegativeMatch = content.match(/\| False Negatives \(Wrong FAIL\) \| (\d+) \|/);
  const overridesTriggeredMatch = content.match(/\| KPM Overrides Triggered \| (\d+) \|/);
  const overridesCorrectMatch = content.match(/\| KPM Overrides Correct \| (\d+) \|/);

  if (!totalMatch) return content; // Stats section not found

  // Update counts (assuming new case is correct for now - you can make this configurable)
  const newTotal = parseInt(totalMatch[1]) + 1;
  const newCorrect = parseInt(correctMatch![1]) + 1;
  const newOverridesTriggered = parseInt(overridesTriggeredMatch![1]) + (newCase.overrideTriggered ? 1 : 0);
  const newOverridesCorrect = parseInt(overridesCorrectMatch![1]) + (newCase.overrideTriggered ? 1 : 0);

  // Replace stats
  let updatedContent = content;
  updatedContent = updatedContent.replace(/\| Total Test Cases \| \d+ \|/, `| Total Test Cases | ${newTotal} |`);
  updatedContent = updatedContent.replace(/\| Correct Grades \| \d+ \|/, `| Correct Grades | ${newCorrect} |`);
  updatedContent = updatedContent.replace(/\| KPM Overrides Triggered \| \d+ \|/, `| KPM Overrides Triggered | ${newOverridesTriggered} |`);
  updatedContent = updatedContent.replace(/\| KPM Overrides Correct \| \d+ \|/, `| KPM Overrides Correct | ${newOverridesCorrect} |`);

  // Update accuracy
  const accuracy = newOverridesTriggered > 0 ? `${((newOverridesCorrect / newOverridesTriggered) * 100).toFixed(0)}% (${newOverridesCorrect}/${newOverridesTriggered})` : 'N/A';
  updatedContent = updatedContent.replace(/\*\*KPM Override Accuracy\*\*: .+/, `**KPM Override Accuracy**: ${accuracy}`);

  return updatedContent;
}

// Example usage function
export function exampleUsage() {
  const exampleCase: TestCaseData = {
    questionType: 'Java Coding',
    question: '/** Example method */\npublic static void example() {\n  // TODO\n}',
    answerKey: 'public static void example() {\n  System.out.println("Hello");\n}',
    studentResponse: 'public static void example() {\n  System.out.println("Hello");\n}',
    breakdown: {
      lge: 'pass',
      tsm: 0.999,
      kpm: 0.950,
      pqm: 0.880
    },
    overrideTriggered: false,
    finalResult: 'PASS',
    feedback: 'Perfect implementation!',
    analysis: 'This case shows exact match between student and answer key.',
    lesson: 'System correctly identified perfect match without needing override.'
  };

  // logTestCase(exampleCase, 'Perfect Match Example');
}
