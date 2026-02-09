#To find a user's submission by their username or name 

select * 
from "Submission" s 
join "User" u on s."userId" =u.id 
join "Assignment" a on s."assignmentId" =a.id 
where a.title like '%XOR%' 
and u.name like '%Jaheen%';

