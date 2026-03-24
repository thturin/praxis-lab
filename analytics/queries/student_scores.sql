-- Individual student scores across all assignments
SELECT
	u."name",
	u."id",
	u."sectionId" AS section_id,
	ROUND(AVG(rs."rawScore")) AS raw_score_average
FROM real_submissions rs
JOIN "User" u ON rs."userId" = u.id
GROUP BY u.id;
