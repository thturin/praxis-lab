--VIEWS
--PORTAL DATABASE
-- Clean submissions: excludes admins, super admins, 
-- users without sections, and test sections
CREATE OR REPLACE VIEW real_submissions AS
SELECT s.*, u."name", u."sectionId", sec."name" AS section_name
FROM "Submission" s
JOIN "User" u ON u.id = s."userId"
JOIN "Section" sec ON sec.id = u."sectionId"
WHERE u."sectionId" IS NOT NULL
  AND u."role" != 'admin'
  AND u."isSuperAdmin" = false
  AND sec."name" NOT ILIKE '%test%';


-- Clean assignments: excludes test/draft assignments 
-- and assignments only in test sections
CREATE OR REPLACE VIEW real_assignments AS
SELECT DISTINCT a.*
FROM "Assignment" a
JOIN "AssignmentSection" asec ON a.id = asec."assignmentId"
JOIN "Section" sec ON sec.id = asec."sectionId"
WHERE a.title NOT ILIKE '%test%'
  AND a."isDraft" = false
  AND sec."name" NOT ILIKE '%test%';


---LAB-CREATOR DATABASE
CREATE OR REPLACE VIEW real_sessions AS
SELECT s.*
FROM "Session" s
JOIN "Lab" l ON l.id = s."labId"
WHERE s.username NOT ILIKE '%admin%';

--------------------------ASSIGNMENT LEVEL ANALYTICS
--AVERAGE SCORE PER ASSIGNMENT
-- Find average score for all assignments, grouped by assignment 
SELECT ra.title AS assignment_name, ROUND(AVG(rs."rawScore")) AS avg_percent_score
FROM real_assignments ra
JOIN real_submissions rs ON ra.id = rs."assignmentId"
GROUP BY ra.id, ra.title
ORDER BY ra.id;

--Find the average score for all assignments, grouped by sections and ordered by assignments
SELECT rs.section_name, ra.title AS assignment_name, ROUND(AVG(rs."rawScore")) AS avg_percent_score
FROM real_assignments ra
JOIN real_submissions rs ON ra.id = rs."assignmentId"
GROUP BY ra.id, ra.title, rs."sectionId", rs.section_name
ORDER BY ra.id, ra.title;


-- WHY LEFT JOIN WITH AND?
-- LEFT JOIN "Submission" sub ON sub."assignmentId" = a.id
-- This joins: "Give me all submissions for this assignment."
-- But you get every submission for every user, not tied to specific users.

-- LEFT JOIN "Submission" sub ON sub."assignmentId" = a.id AND sub."userId" = u.id
-- This joins: "Give me submissions for this assignment AND match them to this specific user."

--COMPLETION RATE PER ASSIGNMENT
SELECT
	ra.title AS assignment_name,
	COUNT(DISTINCT rs.id) AS total_submission,
	COUNT(DISTINCT u.id) AS students_assigned,
	ROUND(100.0 * COUNT(DISTINCT rs.id) / COUNT(DISTINCT u.id)) AS complete_rate_percent
FROM real_assignments ra
JOIN "AssignmentSection" asec ON ra.id = asec."assignmentId"
JOIN "Section" sec ON sec.id = asec."sectionId"
JOIN "User" u ON u."sectionId" = sec.id
LEFT JOIN real_submissions rs ON rs."assignmentId" = ra.id AND rs."userId" = u.id
WHERE u."role" != 'admin' AND u."isSuperAdmin" = false
  AND sec."name" NOT ILIKE '%test%'
GROUP BY ra.id, ra.title
ORDER BY ra.id;


--COMPLETION RATE PER SECTION AND ASSIGNMENT
SELECT
	sec.name AS section_name,
	ra.title AS assignment_name,
	COUNT(DISTINCT rs.id) AS total_submission,
	COUNT(DISTINCT u.id) AS students_assigned,
	ROUND(100.0 * COUNT(DISTINCT rs.id) / COUNT(DISTINCT u.id)) AS complete_rate_percent
FROM real_assignments ra
JOIN "AssignmentSection" asec ON ra.id = asec."assignmentId"
JOIN "Section" sec ON sec.id = asec."sectionId"
JOIN "User" u ON u."sectionId" = sec.id
LEFT JOIN real_submissions rs ON rs."assignmentId" = ra.id AND rs."userId" = u.id
WHERE u."role" != 'admin' AND u."isSuperAdmin" = false
  AND sec."name" NOT ILIKE '%test%'
GROUP BY ra.id, ra.title, sec.id, sec.name
ORDER BY ra.id;

--WHY SUBQUERY?? 
--We are using a CASE statement but we can't use the alias late_submissions in the same
-- SELECT  clause so we use a subquery so we don't have to repeat the CASE 
--statement
--LATE SUBMISSION RATE 
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


--------------------------STUDENT LEVEL ANALYTICS---------------------------
--INDIVIDUAL STUDENT SCORES ACROSS ALL ASSIGNMENTS 
select 
	u."name",
	u."id",
	u."sectionId" as section_id,
	ROUND(AVG(rs."rawScore" ) ) as raw_score_average
from real_submissions rs 
join "User" u 
on rs."userId" =u.id 
group by u.id;

--STUDENT PERFORMANCE TREND (LATENESS)
select 
	u."name",
	u."id",
	u."sectionId" as section_id,
	count(*) as total_submissions,
	count(
	case 
		when rs."submittedAt" > ra."dueDate"
		then 1
	end
	) as late_submissions
from real_submissions rs 
join "User" u 
on rs."userId" =u.id
join real_assignments ra 
on ra.id=rs."assignmentId" 
group by u.id;


--TOP/BOTTOM n PERFORMERS PER SECTION 
select 
	u."name",
	u."id",
	rs.section_name,
	ROUND(AVG(rs."rawScore" ) ) as raw_score_average
from real_submissions rs 
join "User" u on rs."userId" =u.id 
join "Section" s on s.id = u."sectionId" 
group by u.id, rs.section_name
order by rs.section_name, raw_score_average DESC;


 --with the window function to rank the students
SELECT
    u."name",
    rs.section_name,
    ROUND(AVG(rs."rawScore")) AS raw_score_average,
    ROW_NUMBER() OVER (
        PARTITION BY rs.section_name 
        ORDER BY AVG(rs."rawScore") DESC
    ) AS rank
FROM real_submissions rs
JOIN "User" u ON rs."userId" = u.id
GROUP BY u.id, u."name", rs.section_name
ORDER BY rs.section_name, rank;


--------------------------QUESTION LEVEL ANALYTICS
--PER-QUESTION SCORES FOR A LAB

SELECT 
    q.key AS question_key,
    l.title,
    round(AVG(cast(q.value->>'score'as numeric)),2) as avg_score
FROM real_sessions s
 cross join jsonb_each(s."gradedResults") AS q
 join "Lab" l on l.id=s."labId"
group by l.title, question_key
order by l.title;

---*** this is just helpful to see
---all question prompts for a lab (including subquestions) - need to clean html tags
SELECT 
	concat(b.value ->> 'id',sq.value ->> 'id') as all_questions_id,
    concat(regexp_replace(b.value ->> 'prompt', '<[^>]+>', '', 'g'),regexp_replace(sq.value ->> 'prompt', '<[^>]+>', '', 'g')) as all_prompts
 FROM "Lab" l,
    jsonb_array_elements(l.blocks::jsonb) AS b,
    jsonb_array_elements(b.value -> 'subQuestions') AS sq
WHERE b.value ->> 'blockType' != 'material'
group by l.id, l.title, ;




--QUESTION DIFFICULTY RANKING (AVG SCORE PER QUESTION KEY ACROSS ALL SESSION FOR A LAB)
-- SELECT 
--     q.key AS question_key,
--     l.title,
--     regexp_replace(
--         COALESCE(sq.value ->> 'prompt', b.value ->> 'prompt'),
--         '<[^>]+>', '', 'g'
--     ) AS question_text,
--     round(AVG(cast(q.value ->> 'score' AS numeric)), 2) AS avg_score
-- FROM real_sessions s
-- CROSS JOIN jsonb_each(s."gradedResults") AS q
-- JOIN "Lab" l ON l.id = s."labId"
-- CROSS JOIN jsonb_array_elements(l.blocks::jsonb) AS b
-- LEFT JOIN LATERAL jsonb_array_elements(b.value -> 'subQuestions') AS sq ON true
-- WHERE b.value ->> 'blockType' != 'material'
--   AND (b.value ->> 'id' = q.key OR sq.value ->> 'id' = q.key)
-- GROUP BY q.key, l.title, question_text
-- ORDER BY l.title, avg_score ASC;



-- Step 1: Flatten graded results into one row per (session, question)
WITH scores AS (
    SELECT 
        s."labId",
        q.key AS question_key,
        cast(q.value ->> 'score' AS numeric) AS score
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

-- Step 3: Join and aggregate — now it's just a simple JOIN
SELECT 
    s.question_key,
    q.title,
    q.question_text,
    round(AVG(s.score), 2) AS avg_score
FROM scores s
JOIN questions q 
    ON q.lab_id = s."labId" 
    AND q.question_id = s.question_key
GROUP BY s.question_key, q.title, q.question_text
ORDER BY q.title, avg_score ASC;


--QUESTIONS WITH LOWEST PASS RATES 

