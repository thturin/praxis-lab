#!/usr/bin/env node
// Seed 30 fake student users for portal DB.

const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load DATABASE_URL from the server .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SECTION_ID = 18; // set SECTION_CODE "100"-> name: "TEST"
const ASSIGNMENT_ID = 35; // set to your test assignment id "test_1"
const COUNT = 30;

async function main() {
  // Ensure section exists
  const section = await prisma.section.findFirst({
    where: { id: SECTION_ID }
  });

  if(!section) return console.error('Error, could not find seciont');

  for (let i = 1; i <= COUNT; i++) {
    const username = `dev-stud-${i}`;

    await prisma.user.upsert({
      where: { username },
      update: {
        firstName: 'Dev',
        lastName: `Stud${i}`,
        role: 'student',
        sectionId: section.id,
        password: '123',
      },
      create: {
        username,
        firstName: 'Dev',
        lastName: `User${i}`,
        role: 'student',
        sectionId: section.id,
        password: '123',
      },
    });
  }

  console.log(`Seeded ${COUNT} users into section ${section.sectionCode} (id=${section.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
