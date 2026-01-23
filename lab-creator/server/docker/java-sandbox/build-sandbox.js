const fs = require('fs');
const path = require('path');
const { pomXml } = require('../../services/pomXmlFile');

// Write pom.xml to the same directory as this script
const outputPath = path.join(__dirname, 'pom.xml');
fs.writeFileSync(outputPath, pomXml);

console.log(`Generated: ${outputPath}`);

//node lab-creator/server/docker/java-sandbox/build-sandbox.js

// if you update the pomXmlFile.js in services folder 
// you are going to need to run the above command 
// so the dockerfile builds with the updated pom.xml file