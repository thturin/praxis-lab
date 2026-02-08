// Binary Pass/Fail rubric for all non-Java questions
const BINARY_RUBRIC = {
  name: "Binary Pass/Fail Rubric",
  criteria: [
    {
      name: "answerQuality",
      description: "PASS: Semantically equivalent to expected answer - demonstrates correct understanding and produces equivalent outcomes, even if expressed or structured differently. Includes all required elements. FAIL: Incorrect logic, missing key concepts, or produces different/wrong outcomes."
    },
    {
      name: "compliance",
      description: "PASS: Contains all required elements clearly. Structural variations (e.g., different organization, additional context) are acceptable if core content is present. FAIL: Missing required elements, unclear/confusing presentation."

    }
  ]
};

module.exports = { BINARY_RUBRIC };
