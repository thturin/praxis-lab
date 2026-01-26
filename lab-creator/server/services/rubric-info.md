SIMPLE BINARY RUBRIC

| Criterion                | PASS (Required)                                                    | FAIL (If Any Occur)                                    |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------ |
| **Answer Quality**       | Directly answers the question, addresses all parts, and is correct | Off-topic, incomplete, or contains incorrect reasoning |
| **Support**              | Includes reasoning, evidence, or explanation **when required**     | Missing explanation or unsupported claims              |
| **Compliance & Clarity** | Follows all directions (format, length, constraints) and is clear  | Ignores directions or is unclear/confusing             |

const BINARY_RUBRIC = {
  name: "Binary Pass/Fail Rubric",
  criteria: [
    {
      name: "answerQuality",
      description: "PASS: Directly answers the question, addresses all parts, and is correct. FAIL: Off-topic, incomplete, or contains incorrect reasoning."
    },
    {
      name: "support",
      description: "PASS: Includes reasoning, evidence, or explanation when required. FAIL: Missing explanation or unsupported claims."
    },
    {
      name: "complianceClarity",
      description: "PASS: Follows all directions (format, length, constraints) and is clear. FAIL: Ignores directions or is unclear/confusing."
    }
  ]
};