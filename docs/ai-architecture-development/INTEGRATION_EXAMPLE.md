# Integration Example: Auto-Logging in Grade Controller

## How to add auto-logging to your grading endpoints

### 1. Import the auto-logging utility

At the top of `controllers/gradeController.ts`, add:

```typescript
import { autoLogIfInteresting } from '../utils/autoLogGrading';
```

### 2. Modify `gradeQuestionDeepSeek` function

**Before:**
```typescript
export const gradeQuestionDeepSeek = async (req: Request, res: Response) => {
    const { userAnswer, answerKey, question, questionType, AIPrompt } = req.body;
    // ... validation code ...

    try {
        const result = await gradeWithBinaryRubric({
            userAnswer: parsedUserAnswer,
            answerKey: parsedAnswerKey,
            question: parsedQuestion,
            questionType,
            AIPrompt
        });
        return res.json(result);
    } catch (err: any) {
        console.log('Error in accessing deep seek api. Request failed.', err.message);
        return res.status(400).json({ error: 'cannot access deep seek api' });
    }
};
```

**After (with auto-logging):**
```typescript
export const gradeQuestionDeepSeek = async (req: Request, res: Response) => {
    const { userAnswer, answerKey, question, questionType, AIPrompt } = req.body;
    const hasUserAnswer = Boolean(userAnswer && userAnswer.trim().length > 0);
    const hasAnswerKey = Boolean(answerKey && answerKey.trim().length > 0);
    if (!hasUserAnswer) {
        return res.status(400).json({ score: 0, feedback: 'No response submitted' });
    }
    if (!hasAnswerKey) {
        return res.status(400).json({ score: 1, feedback: 'Answer key missing; awarding full credit' });
    }
    const parsedUserAnswer = parseTextFromHtml(userAnswer);
    const parsedAnswerKey = parseTextFromHtml(answerKey);
    const parsedQuestion = parseTextFromHtml(question);

    try {
        const result = await gradeWithBinaryRubric({
            userAnswer: parsedUserAnswer,
            answerKey: parsedAnswerKey,
            question: parsedQuestion,
            questionType,
            AIPrompt
        });

        // 🆕 AUTO-LOG interesting test cases (only if ENABLE_GRADING_LOG=true)
        await autoLogIfInteresting({
            question: parsedQuestion,
            answerKey: parsedAnswerKey,
            studentResponse: parsedUserAnswer,
            questionType,
            lgeResult: {
                answerQuality: result.breakdown?.answerQuality || 'fail',
                compliance: result.breakdown?.compliance || 'fail',
                feedback: result.feedback
            },
            breakdown: {
                textSimilarity: result.breakdown?.textSimilarity,
                keyPointsSimilarity: result.breakdown?.keyPointsSimilarity,
                pseudoQuestionSimilarity: result.breakdown?.pseudoQuestionSimilarity
            },
            finalResult: result.result,
            overrideTriggered: result.breakdown?.answerQuality !== 'PASS' &&
                              (result.breakdown?.keyPointsSimilarity || 0) >= 0.65
        }).catch(err => {
            // Don't let logging errors break grading
            console.error('Failed to auto-log test case:', err);
        });

        return res.json(result);
    } catch (err: any) {
        console.log('Error in accessing deep seek api. Request failed.', err.message);
        return res.status(400).json({ error: 'cannot access deep seek api' });
    }
};
```

### 3. Optional: Add to Java grading too

```typescript
export const gradeJavaCodeDeepSeek = async (req: Request, res: Response) => {
    const { userAnswer, testCode, question } = req.body;

    try {
        const result = await gradeJavaCode({
            studentCode: parseCodeFromHtml(userAnswer),
            problemDescription: parseTextFromHtml(question),
            testCode
        });

        // 🆕 AUTO-LOG Java coding cases
        // Note: Java grading doesn't use the same multi-module approach,
        // so you might want different logging logic here
        // For now, you can manually log interesting Java cases

        res.json(result);
    } catch (err: any) {
        console.error('Error in gradeJavaCode controller', err.message);
        return res.status(500).json({
            error: 'Failed to grade Java code',
            score: 0,
            feedback: 'An error occurred while grading the code. Please try again later.'
        });
    }
};
```

### 4. Enable logging in environment

Add to your `.env` file:

```bash
# Enable automatic test case logging
ENABLE_GRADING_LOG=true
```

### 5. What gets logged automatically?

The system will automatically log cases where:
- ✅ KPM override was triggered (most important!)
- ✅ Modules disagree significantly (TSM, KPM, PQM have high variance)
- ✅ KPM score is close to threshold (0.60-0.70 range)

### 6. Manual logging for specific cases

If you want to force-log a specific case (for testing or documentation):

```typescript
await autoLogIfInteresting(
    {
        // ... grading data ...
    },
    true  // ← Force logging, ignore automatic filters
);
```

---

## Benefits

1. **Zero manual work** - Interesting cases get logged automatically
2. **No impact on performance** - Logging happens asynchronously
3. **Safe** - Logging errors won't break grading
4. **Smart filtering** - Only logs edge cases, not every single grade
5. **Builds dataset** - Accumulates real-world test cases over time

---

## Next Steps

1. Add the import and logging code to `gradeController.ts`
2. Set `ENABLE_GRADING_LOG=true` in your `.env`
3. Grade some questions and watch the test cases file populate
4. Review weekly to spot patterns and adjust thresholds
5. Use accumulated data to evaluate model performance
