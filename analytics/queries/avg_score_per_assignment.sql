-- Average score per assignment
SELECT ra.title AS assignment_name, ROUND(AVG(rs."rawScore")) AS avg_percent_score
FROM real_assignments ra
JOIN real_submissions rs ON ra.id = rs."assignmentId"
GROUP BY ra.id, ra.title
ORDER BY ra.id;
