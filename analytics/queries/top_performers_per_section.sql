-- Top/bottom performers per section with rank (window function)
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
