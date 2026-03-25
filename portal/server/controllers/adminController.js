const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const folderPath = path.join(__dirname, '../templates');
const csvParse = require('csv-parse/sync');


const exportAssignmentsCsvByName = async (req, res) => {
    // Only admins can export
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
        const { assignmentId, sectionId } = req.query;
        
        // Regular admin: verify they manage this section
        if (!req.user.isSuperAdmin) {
            if (!req.user.adminSectionIds.includes(Number(sectionId))) {
                return res.status(403).json({ error: 'Access denied to this section' });
            }
        }

        // Fetch submissions and map by normalized name
        const submissions = await prisma.submission.findMany({
            where: {
                assignmentId: Number(assignmentId),
                user: { sectionId: Number(sectionId) }
            },
            include: { user: true, assignment: true }
        });

      
        // Build score map by normalized name
        const scoreMap = {};
        submissions.forEach(sub => {
            if (sub.user && sub.user.lastName && sub.user.firstName) {
                const normName = `${sub.user.lastName}, ${sub.user.firstName}`.toLowerCase();
                scoreMap[normName] = sub.score;
            }
        });

        //if in production, use the environtment variable
        // Find the template file
        console.log('DEBUG: __dirname =', __dirname);
        console.log('DEBUG: folderPath =', folderPath);
        console.log('DEBUG: Checking if folderPath exists:', fs.existsSync(folderPath));
        const files = fs.readdirSync(folderPath);
        const section = await prisma.section.findUnique({ where: { id: Number(sectionId) } });
        console.log(`Section info: ${JSON.stringify(section,null,2)}`);
        let templateFile = '';
        console.log('Files in template folder:',files);
        console.log('DEBUG: Total file count:', files.length);
        files.forEach(file => {
            console.log('   Checking file:', file);
            if (file.includes(section.sectionCode)) {
                console.log('sectionCode found');
                templateFile = path.join(folderPath, file);
            }
        });
        if (!templateFile) return res.status(404).send('Template File Not found');

        // Read and parse CSV
        const csvContent = fs.readFileSync(templateFile, 'utf8');
        const records = csvParse.parse(csvContent, { relax_column_count: true });

        // Find the index where student data starts (after header row)
        const dataStartIdx = records.findIndex(row => row[1] && row[1].toLowerCase().includes('score'));
        if (dataStartIdx === -1) return res.status(400).send('CSV format error: header not found');

        // Update assignment name and date if needed
        records.forEach(row => {
            if (row[0] && row[0].toLowerCase().startsWith('assignment:')) {
                row[1] = submissions[0]?.assignment?.title || '';
            }
            if (row[0] && row[0].toLowerCase().startsWith('date:')) {
                row[1] = submissions[0]?.assignment?.dueDate
                    ? formatDateMMDDYYYY(submissions[0].assignment.dueDate)
                    : '';
            }
        });
        //console.log(scoreMap);

        // Update scores/comments by name for student rows (do not change names)
        for (let i = dataStartIdx + 1; i < records.length; i++) {
            let row = records[i];
            if (!row[0]) continue; // skip empty rows
            const csvName = row[0].replace(/"/g, '').replace(/\(\d+\)/, '').trim().toLowerCase();
            //console.log(`Processing row: ${row[0]} normalized to ${csvName}`);
            if (scoreMap.hasOwnProperty(csvName)) {
                row[1] = scoreMap[csvName];
                row[2] = '';
            } else if (row.length > 2) {
                row[1] = 0;
                row[2] = 'no submission';
            }
        }

        //console.log('HELLO HELLO--->>', submissions[0].assignment.title);
        // Convert back to CSV
        const exportFileName = `Jupiter_Assignment_${section.name}_${submissions[0].assignment.title}_export.csv`;
        //const exportFilePath = path.join(require('os').homedir(), 'Downloads', exportFileName);
        const csvString = records.map((row,i) => {
            // Add quotes to the name column if it's a student row (after header)
            if (row[0] && i > dataStartIdx) {
                row[0] = `"${row[0].replace(/"/g, '')}"`;
            }
            return row.join(',');
        }).join('\n');
        //fs.writeFileSync(exportFilePath, csvString, 'utf8');

        if(process.env)
        //res.download(exportFilePath);
        res.setHeader('Content-Disposition',`attachment; filename="${exportFileName}"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvString);
    } catch (err) {
        console.error('Error exporting assignment by name', err);
        res.status(500).send('Error exporting assignment by name');
    }
}

const exportAssignmentsCsv = async (req, res) => {
        // Only admins can export
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    

    try {
        const { assignmentId, sectionId } = req.query; //the query params from front end url 

          // Regular admin: verify they manage this section
        if (!req.user.isSuperAdmin) {
            if (!req.user.adminSectionIds.includes(Number(sectionId))) {
                return res.status(403).json({ error: 'Access denied to this section' });
            }
        }

        //find submissions with the same assignmentId and users in the sectionId
        let searchCriteria = {
            assignmentId: Number(assignmentId),
            user: { sectionId: Number(sectionId) }
        };

        const submissions = await prisma.submission.findMany({
            where: searchCriteria,
            include: {
                user: true,
                assignment: true
            }
        });


        //map the student's school id to score
        const scoreMap = {};
        submissions.forEach(sub => {
            //if there exists a user and schoolId for that user 
            if (sub.user && sub.user.schoolId) {
                scoreMap[sub.user.schoolId] = sub.score;
            } else {
                console.log('either no user or schoolId was found');
            }
        });

        //console.log(`look here ->>>> ${ JSON.stringify(scoreMap, null, 2)}`);

        //find the section Id from query params
        const files = fs.readdirSync(folderPath);
        const section = await prisma.section.findUnique({
            where: {
                id: Number(sectionId)
            }
        });
        let templateFile = '';
        files.forEach(file => {
            const fileName = path.basename(file);
            //console.log(`LOOK HERE --> ${fileName} -  ${JSON.stringify(section,null,2)}`);
            if (fileName.includes(section.sectionCode)) {
                console.log('File found');
                templateFile = path.join(folderPath, file);
            };
        });
        if (!templateFile) return res.status(404).send('Template File Not found');


        //READ AND PROCESS CSV -------------------------------------------------

        const csvLines = fs.readFileSync(templateFile, 'utf8').split('\n');

        //update the assignment name
        const assignmentLineIndex = csvLines.findIndex(line => line.trim().startsWith('Assignment:'));
        if (assignmentLineIndex !== -1) {
            const parts = csvLines[assignmentLineIndex].split(',');
            parts[1] = submissions[0].assignment.title;
            csvLines[assignmentLineIndex] = parts.join(',');

        }

        //update the date
        const dateLineIndex = csvLines.findIndex(line => line.trim().startsWith('Date:'));
        if (dateLineIndex !== -1) {
            const parts = csvLines[dateLineIndex].split(',');
            parts[1] = formatDateMMDDYYYY(submissions[0].assignment.dueDate);
            csvLines[dateLineIndex] = parts.join(',');
        }

        //update the scores
        const updatedLines = csvLines.map(line => {
            // \( -> find a (
            // \) -> find a )
            // (\d+) -> capturing a group of 1 or more numbers
            const match = line.match(/\((\d+)\)/);
            if (match) {
                const schoolId = match[1];
                const parts = line.split(',');
                if (scoreMap[schoolId] === undefined) { //add a 0 and comment missing 
                    //insert score 
                    parts[2] = 0; //AUTOMATIC 0%
                    //insert comment
                    parts[3] = 'no submission\r'; //assume the user did not submit anything
                } else {
                    parts[2] = scoreMap[schoolId];
                }

                return parts.join(',');
            } else {
                return line;
            }
        });

        //write the updated CSV to a new file 
        
        const exportFileName = `Jupiter_Assignment_${section.name}_${JSON.stringify(submissions[0].assignment.title)}_export.csv`;
        const exportFilePath = path.join(folderPath, exportFileName);
        fs.writeFileSync(exportFilePath, updatedLines.join('\n'), 'utf8');

        res.download(exportFilePath);

        //res.status(200).send(submissions);//send response 
    } catch (err) {
        console.error('Error exporting assignment', err);
    }
}

function formatDateMMDDYYYY(date) { //copied and pasted
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}


module.exports = { exportAssignmentsCsv, exportAssignmentsCsvByName };