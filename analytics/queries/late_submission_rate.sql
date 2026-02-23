-- Late submission rate per assignment
WITH stats AS (
    SELECT
        ra.title,
        COUNT(rs.id) AS total_submissions,
        COUNT(CASE
                WHEN rs."submittedAt" > ra."dueDate"
                THEN 1
              END) AS late_submissions
    FROM real_submissions rs
    JOIN real_assignments ra ON rs."assignmentId" = ra.id
    GROUP BY ra.id, ra.title
)
SELECT
    title,
    total_submissions,
    late_submissions,
    ROUND(100.0 * late_submissions / total_submissions) AS late_percent
FROM stats;
