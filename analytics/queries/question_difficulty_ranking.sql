-- Question difficulty ranking (avg score per question across all sessions for a lab)
-- Step 1: Flatten graded results into one row per (session, question)
WITH scores AS (
    SELECT
        s."labId",
        q.key AS question_key,
        CAST(q.value ->> 'score' AS numeric) AS score
    FROM real_sessions s
    CROSS JOIN jsonb_each(s."gradedResults") AS q
),

-- Step 2: Flatten lab blocks + sub-questions into one row per question
questions AS (
    SELECT
        l.id AS lab_id,
        l.title,
        COALESCE(sq.value ->> 'id', b.value ->> 'id') AS question_id,
        regexp_replace(
            COALESCE(sq.value ->> 'prompt', b.value ->> 'prompt'),
            '<[^>]+>', '', 'g'
        ) AS question_text
    FROM "Lab" l
    CROSS JOIN jsonb_array_elements(l.blocks::jsonb) AS b
    LEFT JOIN LATERAL jsonb_array_elements(b.value -> 'subQuestions') AS sq ON true
    WHERE b.value ->> 'blockType' != 'material'
)

-- Step 3: Join and aggregate
SELECT
    s.question_key,
    q.title,
    q.question_text,
    ROUND(AVG(s.score), 2) AS avg_score
FROM scores s
JOIN questions q
    ON q.lab_id = s."labId"
    AND q.question_id = s.question_key
GROUP BY s.question_key, q.title, q.question_text
ORDER BY q.title, avg_score ASC;
