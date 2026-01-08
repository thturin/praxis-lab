const fs = require('fs');
const path = require('path');

// Find all CSV_TEMPLATE_* environment variables
const csvTemplateEnvVars = Object.keys(process.env).filter(key => key.startsWith('CSV_TEMPLATE_'));

if (csvTemplateEnvVars.length === 0) {
  console.log('No CSV_TEMPLATE_* environment variables found');
  process.exit(0);
}

console.log(`Found ${csvTemplateEnvVars.length} CSV template(s) to restore:`);

// Process each template
csvTemplateEnvVars.forEach(envVar => {
  const b64 = process.env[envVar];

  if (!b64) {
    console.warn(`⚠️  ${envVar} is empty, skipping...`);
    return;
  }

  // Extract the number from CSV_TEMPLATE_XX
  const templateNumber = envVar.replace('CSV_TEMPLATE_', '');

  // Build the path to the template file
  const templatePath = path.join(
    process.cwd(),
    'portal',
    'server',
    'templates',
    `JUPITER_TEMPLATE_${templateNumber}.csv`
  );

  try {
    // Ensure directory exists, then write the decoded file
    fs.mkdirSync(path.dirname(templatePath), { recursive: true });
    fs.writeFileSync(templatePath, Buffer.from(b64, 'base64'));
    console.log(`✓ ${envVar} → ${templatePath}`);
  } catch (error) {
    console.error(`✗ Failed to write ${envVar}:`, error.message);
  }
});

console.log('\nAll Jupiter templates restored successfully!');