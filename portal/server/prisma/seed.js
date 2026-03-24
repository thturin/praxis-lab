const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {parse }= require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🗑️ Cleaning database...');
  
  // Delete all existing data in order (to handle foreign key constraints)
  await prisma.submission.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.section.deleteMany({});
  
  console.log('✅ Database cleaned');
  
  console.log('🌱 Creating minimal seed data...');
  
  // Create 2 sections
  const section1 = await prisma.section.create({
    data: {
      name: 'AP Computer Science A 89',
      sectionId: '89'
    }
  });
  
  
  console.log('✅ Sections created');
  
  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      schoolId: null,
      email: 'tatiana.turin@gmail.com',
      username: 'ad',
      name: 'Admin TEST',
      role: 'admin',
      githubUsername: null,
      githubId: null,
      sectionId: null, // Admin doesn't belong to a section
      password: '123'
    }
  });

  // Create student test user
  const studentUser = await prisma.user.create({
    data: {
      schoolId: null,
      email: '',
      username: 'stud',
      name: 'Student TEST',
      role: 'student',
      githubUsername: null,
      githubId: null,
      sectionId: null, // Admin doesn't belong to a section
      password: '123'
    }
  });
  
  console.log('✅ Admin created');

  //read csv file 
  const csvPath = path.resolve('/home/tatiana-turin/Documents/APCSA/classroom_roster.csv');
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvData,{
    columns:true,
    skip_empty_lines:true,
    trim: true
  });

  for(const row of records){
    const rawName = row.name.replace(/"/g, '');
    let name = rawName;
    let first; let last;
    if(rawName.includes(',')){
       [last,first] = rawName.split(',').map(s=> s.trim());
      name = `${first} ${last}`;
      console.log();
    }

    await prisma.user.create({
      data:{
        firstName:first,
        lastName:last,
        name,
        username:row.username,
        password:row.password,
        githubUsername:row.github_username || null,
        githubId: row.github_id? row.github_id.toString() : null,
        role: 'student',
        sectionId: section1.id
  
      }
    });
  }
  console.log('✅ Users created');

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });