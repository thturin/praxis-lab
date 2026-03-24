const fs = require('fs');

// Read and convert to base64
const csvContent = fs.readFileSync('portal/server/templates/JUPITER_TEMPLATE_85.csv');
const base64String = csvContent.toString('base64');
console.log(base64String);

