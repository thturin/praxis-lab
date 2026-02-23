-- Average score per assignment, grouped by section
SELECT rs.section_name, ra.title AS assignment_name, ROUND(AVG(rs."rawScore")) AS avg_percent_score
FROM real_assignments ra
JOIN real_submissions rs ON ra.id = rs."assignmentId"
GROUP BY ra.id, ra.title, rs."sectionId", rs.section_name
ORDER BY ra.id, ra.title;
