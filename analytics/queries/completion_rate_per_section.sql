-- Completion rate per section and assignment
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
  AND sec."name" NOT ILIKE '%%test%%'
GROUP BY ra.id, ra.title, sec.id, sec.name
ORDER BY ra.id;
