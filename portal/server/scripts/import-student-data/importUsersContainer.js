const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
    const filePath = path.join(__dirname, '../scripts/DE_Roster.csv');
    const csv = fs.readFileSync(filePath);
    const rows = parse(csv, { columns: true, skip_empty_lines: true });


    for (const row of rows) {
        //int to insert in
        //find the sectionId (89,82, etc) string in the section list
        const section = await prisma.section.findUnique({ where: { sectionId: row.sectionId } });

        await prisma.user.upsert({
          where: { username: row.username},
          update: {
            firstName: row.FirstName || null,
            lastName: row.LastName || null,
            name: row.name || `${row.FirstName ?? ''} ${row.LastName ?? ''}`.trim(),
            password: row.password || null,
            githubId: row.githubId || null,
            githubUsername: row.githubUsername || null,
            role: row.role || 'student',
            sectionId:section.id //number (1 for sectionId "89")
          },
          create: {
            firstName: row.FirstName || null,
            lastName: row.LastName || null,
            name: row.name || `${row.FirstName ?? ''} ${row.LastName ?? ''}`.trim(),
            username: row.username,
            password: row.password || null,
            githubId: row.githubId || null,
            githubUsername: row.githubUsername || null,
            role: row.role || 'student',
            sectionId:section.id
          }
        });
    }

    console.log('Import complete');
})();