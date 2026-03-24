-- TABLEAU VIEWS
-- These views are designed to be consumed by Tableau for visualization.
-- Run the base views (real_submissions, real_assignments, real_sessions) first from analytics.sql.

-----------------------------------------------------------
-- PORTAL DATABASE
-----------------------------------------------------------

-- 1. Average score per assignment
CREATE OR REPLACE VIEW v_avg_score_per_assignment AS
SELECT
    ra.id AS assignment_id,
    ra.title AS assignment_name,
    ROUND(AVG(rs."rawScore")) AS avg_percent_score
FROM real_assignments ra
JOIN real_submissions rs ON ra.id = rs."assignmentId"
GROUP BY ra.id, ra.title;


-- 2. Average score per assignment by section
CREATE OR REPLACE VIEW v_avg_score_per_assignment_section AS
SELECT
    rs.section_name,
    ra.id AS assignment_id,
    ra.title AS assignment_name,
    ROUND(AVG(rs."rawScore")) AS avg_percent_score
FROM real_assignments ra
JOIN real_submissions rs ON ra.id = rs."assignmentId"
GROUP BY ra.id, ra.title, rs."sectionId", rs.section_name;


-- 3. Completion rate per assignment
CREATE OR REPLACE VIEW v_completion_rate_per_assignment AS
SELECT
    ra.id AS assignment_id,
    ra.title AS assignment_name,
    COUNT(DISTINCT rs.id) AS total_submissions,
    COUNT(DISTINCT u.id) AS students_assigned,
    ROUND(100.0 * COUNT(DISTINCT rs.id) / COUNT(DISTINCT u.id)) AS complete_rate_percent
FROM real_assignments ra
JOIN "AssignmentSection" asec ON ra.id = asec."assignmentId"
JOIN "Section" sec ON sec.id = asec."sectionId"
JOIN "User" u ON u."sectionId" = sec.id
LEFT JOIN real_submissions rs ON rs."assignmentId" = ra.id AND rs."userId" = u.id
WHERE u."role" != 'admin' AND u."isSuperAdmin" = false
  AND sec."name" NOT ILIKE '%test%'
GROUP BY ra.id, ra.title;


-- 4. Completion rate per section and assignment
CREATE OR REPLACE VIEW v_completion_rate_per_section AS
SELECT
    sec.name AS section_name,
    ra.id AS assignment_id,
    ra.title AS assignment_name,
    COUNT(DISTINCT rs.id) AS total_submissions,
    COUNT(DISTINCT u.id) AS students_assigned,
    ROUND(100.0 * COUNT(DISTINCT rs.id) / COUNT(DISTINCT u.id)) AS complete_rate_percent
FROM real_assignments ra
JOIN "AssignmentSection" asec ON ra.id = asec."assignmentId"
JOIN "Section" sec ON sec.id = asec."sectionId"
JOIN "User" u ON u."sectionId" = sec.id
LEFT JOIN real_submissions rs ON rs."assignmentId" = ra.id AND rs."userId" = u.id
WHERE u."role" != 'admin' AND u."isSuperAdmin" = false
  AND sec."name" NOT ILIKE '%test%'
GROUP BY ra.id, ra.title, sec.id, sec.name;


-- 5. Late submission rate per assignment
CREATE OR REPLACE VIEW v_late_submission_rate AS
SELECT
    ra.id AS assignment_id,
    ra.title AS assignment_name,
    COUNT(rs.id) AS total_submissions,
    COUNT(CASE WHEN rs."submittedAt" > ra."dueDate" THEN 1 END) AS late_submissions,
    ROUND(100.0 * COUNT(CASE WHEN rs."submittedAt" > ra."dueDate" THEN 1 END) / COUNT(rs.id)) AS late_percent
FROM real_submissions rs
JOIN real_assignments ra ON rs."assignmentId" = ra.id
GROUP BY ra.id, ra.title;


-- 6. Individual student scores across all assignments
CREATE OR REPLACE VIEW v_student_scores AS
SELECT
    u."name",
    u.id,
    rs.section_name,
    ROUND(AVG(rs."rawScore")) AS raw_score_average
FROM real_submissions rs
JOIN "User" u ON rs."userId" = u.id
GROUP BY u.id, u."name", rs.section_name;


-- 7. Student lateness trends
CREATE OR REPLACE VIEW v_student_lateness AS
SELECT
    u."name",
    u.id,
    rs.section_name,
    COUNT(*) AS total_submissions,
    COUNT(CASE WHEN rs."submittedAt" > ra."dueDate" THEN 1 END) AS late_submissions
FROM real_submissions rs
JOIN "User" u ON rs."userId" = u.id
JOIN real_assignments ra ON ra.id = rs."assignmentId"
GROUP BY u.id, u."name", rs.section_name;


-- 8. Student ranking per section (with window function)
CREATE OR REPLACE VIEW v_student_ranking_per_section AS
SELECT
    u."name",
    u.id,
    rs.section_name,
    ROUND(AVG(rs."rawScore")) AS raw_score_average,
    ROW_NUMBER() OVER (
        PARTITION BY rs.section_name
        ORDER BY AVG(rs."rawScore") DESC
    ) AS rank
FROM real_submissions rs
JOIN "User" u ON rs."userId" = u.id
GROUP BY u.id, u."name", rs.section_name;


-----------------------------------------------------------
-- LAB-CREATOR DATABASE
-----------------------------------------------------------

-- 9. Per-question scores with question text (question difficulty ranking)
CREATE OR REPLACE VIEW v_question_scores AS
WITH scores AS (
    SELECT
        s."labId",
        q.key AS question_key,
        cast(q.value ->> 'score' AS numeric) AS score
    FROM real_sessions s
    CROSS JOIN jsonb_each(s."gradedResults") AS q
),
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
SELECT
    s.question_key,
    q.title AS lab_title,
    q.question_text,
    round(AVG(s.score), 2) AS avg_score
FROM scores s
JOIN questions q
    ON q.lab_id = s."labId"
    AND q.question_id = s.question_key
GROUP BY s.question_key, q.title, q.question_text;
