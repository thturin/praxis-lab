--VIEWS
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


--------------------------STUDENT LEVEL ANALYTICS
--INDIVIDUAL STUDENT SCORES ACROSS ALL ASSIGNMENTS 

"



--STUDENT PERFORMANCE TREND (LATENESS)

--TOP/BOTTOM n PERFORMERS PER SECTION 

--STUDENTS WITH DECLINING PERFORMANCE (COMPARE NEWEST AVERAGE WITH EARLIER AVERAGE)


--------------------------QUESTION LEVEL ANALYTICS
--PER-QUESTION SCORES FOR A LAB

--QUESTION DIFFICULTY RANKING (AVG SCORE PER QUESTION KEY ACROSS ALL SESSION FOR A LAB)

--QUESTIONS WITH LOWEST PASS RATES 

