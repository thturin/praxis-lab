interface Block {
  id: string;
  blockType: 'question' | 'material';
  subQuestions?: Array<{ id: string }>;
}

/**
 * Generate display numbers for questions in a lab
 * Returns map of questionId -> displayNumber
 *
 * Format: "1", "2", "3" for top-level questions
 *         "1a", "1b", "1c" for sub-questions
 *
 * @param blocks - Array of blocks from Lab.blocks JSON field
 * @returns Record mapping question IDs to display numbers
 *
 * @example
 * const blocks = [
 *   { id: '123', blockType: 'question' },
 *   { id: '456', blockType: 'question', subQuestions: [
 *     { id: '789' },
 *     { id: '012' }
 *   ]},
 *   { id: '345', blockType: 'material' }
 * ];
 * const displayNumbers = generateDisplayNumbers(blocks);
 * // Returns: { '123': '1', '456': '2', '789': '2a', '012': '2b' }
 */
export function generateDisplayNumbers(blocks: Block[]): Record<string, string> {
  const displayMap: Record<string, string> = {};
  let questionIndex = 0;

  blocks.forEach(block => {
    if (block.blockType === 'question') {
      questionIndex++;
      displayMap[block.id] = `${questionIndex}`;

      // Handle sub-questions with letter suffixes
      if (block.subQuestions?.length > 0) {
        block.subQuestions.forEach((subQ, subIdx) => {
          const letter = String.fromCharCode(97 + subIdx); // 97 = 'a'
          displayMap[subQ.id] = `${questionIndex}${letter}`; //'789':'2a'
        });
      }
    }
  });

  return displayMap;
}

module.exports = { generateDisplayNumbers };
