-- GROUP BY Rule: Always group by the primary key of tables you SELECT non-aggregated columns from.
-- Why: PostgreSQL needs to know how to collapse non-grouped columns into single rows. 
-- If you select a.title but don't group by a.id (the primary key), it errors. 
-- Primary key guarantees 1-to-1 relationship so dependent columns are safe.




--------------------------ASSIGNMENT LEVEL ANALYTICS
--AVERAGE SCORE PER ASSIGNMENT
-- Find average score for all assignments, grouped by assignment 
SELECT a.title as assignment_name,ROUND( AVG(s."rawScore")) as avg_percent_score  FROM public."Assignment" a
join "Submission" s on a.id=s."assignmentId" 
group by a.id, a.title  ---you don't need a.title but if a.id breaks, it is good to have
order by a.id;



--Find the average score for all assignments, grouped by sections and ordered by assignments
 SELECT sec.name as section_name, a.title as assignment_name ,ROUND( AVG(s."rawScore"))  as avg_percent_score 
 FROM public."Assignment" a
join "Submission" s on a.id=s."assignmentId" 
join "User" u on u.id = s."userId" 
join "Section" sec on sec.id=u."sectionId" 
join "AssignmentSection" asec on asec."sectionId"  = sec.id and asec."assignmentId" = a.id
group by a.id, a.title,  sec.id , sec.name
order by a.id;


--COMPLETION RATE PER ASSIGNMENT
select 
	a.title as assignment_name, 
	COUNT(distinct s.id) as total_submission, 
	COUNT(distinct u.id) as students_assigned,
	ROUND(100.0* COUNT(distinct s.id)/ count(distinct u.id)) as complete_rate_percent
from "Assignment" a 
join "AssignmentSection" asec on a.id = asec."assignmentId" 
join "Section" sec on sec.id = asec."sectionId" 
join "User" u on u."sectionId"  = sec.id 
left join "Submission" s on s."assignmentId" = a.id
group by a.id, a.title
order by a.id;


--COMPLETION RATE PER SECTION AND ASSIGNMENT
select 
	sec.name as section_name,
	a.title as assignment_name, 
	COUNT(distinct s.id) as total_submission, 
	COUNT(distinct u.id) as students_assigned,
	ROUND(100.0* COUNT(distinct s.id)/ count(distinct u.id)) as complete_rate_percent
from "Assignment" a 
join "AssignmentSection" asec on a.id = asec."assignmentId" 
join "Section" sec on sec.id = asec."sectionId" 
join "User" u on u."sectionId"  = sec.id 
left join "Submission" s on s."assignmentId" = a.id and s."userId" =u.id
group by a.id, a.title, sec.id
order by a.id;

-- WHY LEFT JOIN WITH AND?
-- LEFT JOIN "Submission" sub ON sub."assignmentId" = a.id
-- This joins: "Give me all submissions for this assignment." 
-- But you get every submission for every user, not tied to specific users.

-- LEFT JOIN "Submission" sub ON sub."assignmentId" = a.id AND sub."userId" = u.id
-- This joins: "Give me submissions for this assignment AND match them to this specific user."


--LATE SUBMISSION RATE 





--------------------------STUDENT LEVEL ANALYTICS
--INDIVIDUAL STUDENT SCORES ACROSS ALL ASSIGNMENTS 

--STUDENT PERFORMANCE TREND (LATENESS)

--TOP/BOTTOM n PERFORMERS PER SECTION 

--STUDENTS WITH DECLINING PERFORMANCE (COMPARE NEWEST AVERAGE WITH EARLIER AVERAGE)


--------------------------QUESTION LEVEL ANALYTICS
--PER-QUESTION SCORES FOR A LAB

--QUESTION DIFFICULTY RANKING (AVG SCORE PER QUESTION KEY ACROSS ALL SESSION FOR A LAB)

--QUESTIONS WITH LOWEST PASS RATES 

