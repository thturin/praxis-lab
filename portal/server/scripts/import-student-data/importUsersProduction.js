// portal/server/scripts/importUsers.js
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();


// IF YOU WOULD LIKE TO ADD USERS TO PRODUCTION (RAILWAY), THIS WILL IGNORE EXISTING USERS 
// AND ADD NEW ONES 

(async () => {
  const rows = parse(
    fs.readFileSync(path.join(__dirname, '../scripts/DE_Roster.csv')),
    { columns: true, skip_empty_lines: true }
  );


  //SECTION ID CHANGED TO SECTION CODE YOU MUST UPDATE . THIS WILL NOT WORK
  for (const row of rows) {
    const section = row.sectionId //find the section by sectionID "89, 90"
      ? await prisma.section.findUnique({ where: { sectionId: row.sectionId.trim() } })
      : null;
    if (!section) {
      console.log(`Skipping ${row.username}: missing section ${row.sectionID}`);
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { username: row.username } });
    if (existing) {
      console.log(`Skipping existing ${row.username}`);
      continue;
    }

    await prisma.user.create({
      data: {
        firstName: row.FirstName || null,
        lastName: row.LastName || null,
        name: row.name || `${row.FirstName ?? ''} ${row.LastName ?? ''}`.trim(),
        username: row.username,
        password: row.password || null,
        githubId: row.githubId || null,
        githubUsername: row.githubUsername || null,
        role: row.role || 'student',
        sectionId: section.id
      }
    });
  }

  console.log('Import complete');
})();