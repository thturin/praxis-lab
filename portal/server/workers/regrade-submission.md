####Regrading Flow Summary
1. Initiation (Frontend)

User clicks "Dry Run" or "Apply Regrade Updates" in SubmissionRegrade.jsx
2. API Request

POST /submissions/regrade → submissionController.js:227-245
3. Queue Job

BullMQ queue adds job via submissionRegradeQueue.js
4. Worker Processing (Background)

submissionRegradeWorker.js processes each submission
For GitHub assignments: Clones repo, runs tests, scores
For Lab assignments:
Calls lab-creator API /grade/regrade
gradeController.js:110-177 processes each question
Uses gradeWithBinaryRubric() → DeepSeek AI grading
Calls computeFinalScore() (line 8 you selected!) to calculate final score
Applies late penalties if enabled
5. Score Update

If not dry run: Updates submission.rawScore and submission.score in database
6. Status Polling

Frontend polls GET /submissions/regrade/:jobId for job completion
The computeFinalScore function you selected calculates the final percentage and total score from all graded question results.

Is there a specific part of this flow you'd like me to explain in more detail, or were you planning to modify the regrading system?