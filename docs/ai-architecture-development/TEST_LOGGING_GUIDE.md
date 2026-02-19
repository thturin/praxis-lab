# Test Case Logging Guide

Automated system for documenting grading test cases and results.

## Overview

Three ways to log test cases:
1. **Automatic logging** - Logs interesting cases automatically during grading
2. **Manual script** - Add predefined test cases via CLI
3. **Programmatic API** - Call `logTestCase()` directly from code

---

## 1. Automatic Logging (Recommended)

Automatically logs interesting test cases (overrides, edge cases, high variance) during normal grading.

### Setup

Add to your `.env`:
```bash
ENABLE_GRADING_LOG=true
```

### Integration

In your grading route or service, add:

```typescript
import { autoLogIfInteresting } from '../utils/autoLogGrading';

// After grading is complete
const gradingResult = await gradeWithBinaryRubric({...});

// Auto-log if interesting (override, edge case, etc.)
await autoLogIfInteresting({
  question: req.body.question,
  answerKey: req.body.answerKey,
  studentResponse: req.body.userAnswer,
  questionType: req.body.questionType,
  lgeResult: {
    answerQuality: gradingResult.breakdown.answerQuality,
    compliance: gradingResult.breakdown.compliance,
    feedback: gradingResult.feedback
  },
  breakdown: {
    textSimilarity: gradingResult.breakdown.textSimilarity,
    keyPointsSimilarity: gradingResult.breakdown.keyPointsSimilarity,
    pseudoQuestionSimilarity: gradingResult.breakdown.pseudoQuestionSimilarity
  },
  finalResult: gradingResult.result,
  overrideTriggered: gradingResult.breakdown.keyPointsSimilarity >= 0.65 &&
                     gradingResult.breakdown.answerQuality !== 'PASS'
});

// Return result to user
res.json(gradingResult);
```

**What gets logged automatically:**
- Cases where KPM override was triggered
- Cases where modules disagree significantly (high variance)
- Cases close to the override threshold (0.60-0.70)

---

## 2. Manual Script (For Testing)

Add predefined test cases via command line.

### Usage

```bash
# From lab-creator/server/
npm run add-test-case 1    # Add test case #1
npm run add-test-case 2    # Add test case #2
```

### Adding New Cases

Edit `scripts/addTestCase.ts` and add a new function:

```typescript
async function addMyNewCase() {
  await logTestCase(
    {
      questionType: 'Short Answer',
      question: 'What is encapsulation?',
      answerKey: 'Encapsulation is...',
      studentResponse: 'Student writes...',
      breakdown: {
        lge: 'pass',
        tsm: 0.850,
        kpm: 0.780,
        pqm: 0.820
      },
      overrideTriggered: false,
      finalResult: 'PASS',
      feedback: 'Good answer!',
      analysis: 'Key observations...',
      lesson: 'What we learned...'
    },
    'Encapsulation Definition'
  );
}

// Add to switch statement in main()
case '3':
  await addMyNewCase();
  break;
```

---

## 3. Programmatic API

Call directly from anywhere in your code:

```typescript
import { logTestCase } from '../utils/logTestCase';

await logTestCase(
  {
    questionType: 'Java Coding',
    question: 'Write a method...',
    answerKey: 'public void method() {...}',
    studentResponse: 'public void method() {...}',
    breakdown: {
      lge: 'fail',
      tsm: 0.987,
      kpm: 0.782,
      pqm: 0.672
    },
    overrideTriggered: true,
    finalResult: 'PASS',
    feedback: 'Your answer...',
    analysis: 'This case demonstrates...',
    lesson: 'The system correctly...',
    testCode: 'Optional test code...',
    expectedOutput: 'Optional expected output...'
  },
  'Test Case Title'
);
```

---

## Output

All test cases are logged to:
```
docs/ai-architecture-development/GRADING_TEST_CASES.md
```

### What's tracked:
- Question, answer key, student response
- All module scores (LGE, TSM, KPM, PQM)
- Override information
- Final result and feedback
- Analysis and lessons learned
- Summary statistics (accuracy, override rate, etc.)

---

## Summary Statistics

The file automatically maintains:
- Total test cases logged
- Correct vs incorrect grades
- False positive/negative counts
- KPM override trigger rate
- KPM override accuracy

These update automatically each time a case is logged.

---

## Example Integration in Routes

```typescript
// routes/gradeRoutes.js or similar

router.post('/grade', async (req, res) => {
  try {
    const { userAnswer, answerKey, question, questionType, AIPrompt } = req.body;

    // Perform grading
    const result = await gradeWithBinaryRubric({
      userAnswer,
      answerKey,
      question,
      questionType,
      AIPrompt
    });

    // Auto-log if interesting (only when ENABLE_GRADING_LOG=true)
    await autoLogIfInteresting({
      question,
      answerKey,
      studentResponse: userAnswer,
      questionType,
      lgeResult: {
        answerQuality: result.breakdown.answerQuality,
        compliance: result.breakdown.compliance,
        feedback: result.feedback
      },
      breakdown: result.breakdown,
      finalResult: result.result,
      overrideTriggered: result.breakdown.answerQuality !== 'PASS' &&
                        result.breakdown.keyPointsSimilarity >= 0.65
    });

    res.json(result);
  } catch (error) {
    console.error('Grading error:', error);
    res.status(500).json({ error: 'Grading failed' });
  }
});
```

---

## Tips

1. **Start with automatic logging** - Set `ENABLE_GRADING_LOG=true` and let it collect edge cases
2. **Review regularly** - Check the test cases file weekly to spot patterns
3. **Adjust thresholds** - If you see many false overrides, consider adjusting the 0.65 threshold
4. **Add manual cases** - For specific scenarios you want to test, use the script or API
5. **Track accuracy** - Use the summary stats to measure system performance over time
