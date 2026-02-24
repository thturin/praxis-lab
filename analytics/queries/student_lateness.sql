-- Student performance trend (lateness)
SELECT
	u."name",
	u."id",
	rs.section_name,
	COUNT(*) AS total_submissions,
	COUNT(
		CASE
			WHEN rs."submittedAt" > ra."dueDate"
			THEN 1
		END
	) AS late_submissions
FROM real_submissions rs
JOIN "User" u ON rs."userId" = u.id
JOIN real_assignments ra ON ra.id = rs."assignmentId"
GROUP BY u.id, rs.section_name;
