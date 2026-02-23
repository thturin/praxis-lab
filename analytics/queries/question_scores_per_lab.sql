-- Per-question scores for a lab
SELECT
    q.key AS question_key,
    l.title,
    ROUND(AVG(CAST(q.value ->> 'score' AS numeric)), 2) AS avg_score
FROM real_sessions s
CROSS JOIN jsonb_each(s."gradedResults") AS q
JOIN "Lab" l ON l.id = s."labId"
GROUP BY l.title, question_key
ORDER BY l.title;
