#!/usr/bin/env node
// Script to remove student ID numbers in parentheses from Jupiter CSV files

const fs = require('fs');
const path = require('path');

// File to clean
const csvPath = path.join(__dirname,'..', '..', 'templates', 'JUPITER_TEMPLATE_85.csv');

function cleanJupiterCsv(filePath) {
  try {
    // Read the CSV file
    const content = fs.readFileSync(filePath, 'utf8');

    // Remove numbers in parentheses: (123456789)
    // This regex matches: space + open paren + digits + close paren
    const cleanedContent = content.replace(/ \(\d+\)/g, '');

    // Overwrite the file
    fs.writeFileSync(filePath, cleanedContent, 'utf8');

    console.log('✅ Successfully cleaned CSV file!');
    console.log(`📄 File: ${filePath}`);
    console.log('🧹 Removed all student ID numbers in parentheses');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanJupiterCsv(csvPath);