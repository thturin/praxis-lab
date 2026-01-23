const Docker = require('dockerode');
const fs = require('fs').promises;
const path = require('path');
const {pomXml} = require('./pomXmlFile');

//create dockerode instance
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

//creates maven project in temporary directory with student code 
//and ai generated test unit code 
async function createMavenProject(tempDir, studentCode, testCode) {
  const fs = require('fs').promises;
  const path = require('path');

  // Create directory structure
  await fs.mkdir(path.join(tempDir, 'src/main/java'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'src/test/java'), { recursive: true });

  // Write student code to Solution.java
  await fs.writeFile(
    path.join(tempDir, 'src/main/java/Solution.java'),
    studentCode,
    'utf8'
  );

  // Write test code to SolutionTest.java
  await fs.writeFile(
    path.join(tempDir, 'src/test/java/SolutionTest.java'),
    testCode,
    'utf8'
  );
    //pom.xml imported with Junit5 dependencies
    // Write pom.xml
   await fs.writeFile(path.join(tempDir, 'pom.xml'), pomXml, 'utf8');
        // ✅ DEBUG: Verify pom.xml was created on HOST
    console.log('📁 Files created in:', tempDir);
    const files = await fs.readdir(tempDir);
    console.log('📄 Files in temp dir:', files);
}


 //Parses JUnit/Maven output to extract test results
function parseJUnitOutput(output) {
    const results = {
        totalTests: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0,
        details: []
    };

    // Parse summary line: "Tests run: X, Failures: Y, Errors: Z, Skipped: W"
    const summaryMatch = output.match(/Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/);
    
    if (summaryMatch) {
        results.totalTests = parseInt(summaryMatch[1]);
        results.failed = parseInt(summaryMatch[2]);
        results.errors = parseInt(summaryMatch[3]);
        results.skipped = parseInt(summaryMatch[4]);
        results.passed = results.totalTests - results.failed - results.errors - results.skipped;
    }

    return results;
}

// Cleans up temporary directory used for code execution
async function cleanupExecutionEnvironment(dirPath) {
  try {
    if (process.env.AUTO_CLEANUP_TEMP_DIRS !== 'false') {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Cleanup failed:', err);
  }
}

//studentCodde is the code written by the student
//testCode is the code with junit tests created by llm model
//timeout is max time to allow for execution
async function compileAndRunJavaWithTests({ studentCode, testCode, timeout = 60000 }) {
    //create a temporary directory for the code execution
    const startTime = Date.now();
    const tempHostDir = path.join(process.env.HOST_APP_PATH || '/app', 'tmp', `exec-${startTime}`);
   // const tempHostDir = ('/home/tatiana-turin/projects/edu-platform/lab-creator/server/tmp/exec-' + startTime);
    const tempDir = path.join(__dirname, '..', 'tmp', `exec-${startTime}`);
    //tatiana-turin/projects/edu-platform/lab-creator/server/tmp/exec-1686948572345
    console.log('Creating temp dir at LOOK HERE ', tempDir);
    // Create Maven project structure in sandbox directory (/workspace in docker)
    await createMavenProject(tempDir, studentCode, testCode);

    // Run the code in Docker
    //DOCKER CONTAINERS DO NOT SEE EACH OTHER . THERE IS NO SUCH THING AS DOCKER INSIDE DOCKER UNLESS YOU SET IT UP SPECIFICALLY
    //HERE WE ARE USING THE DOCKER DAEMON OF THE HOST MACHINE TO SPAWN A CONTAINER THAT WILL RUN THE STUDENT CODE
    
    //const cmdString = 'echo "=== WORKSPACE CONTENTS ===" && ls -la /workspace && echo "=== POM.XML ===" && cat /workspace/pom.xml && echo "=== RUNNING MAVEN ===" && mvn clean test';
     // const cmdString = 'echo "=== SOLUTIONS.JAVA ===" && cat /workspace/src/main/java/Solution.java && echo "=== SOLUTIONSTEST.JAVA ===" && cat /workspace/src/test/java/SolutionTest.java && echo "=== RUNNING MAVEN ===" && mvn clean test';

    const cmdString = 'echo "=== RUNNING MAVEN ===" && mvn clean test';

    const container = await docker.createContainer({
        Image: 'java-grading-sandbox:latest',   
        Cmd: ['sh', '-c', cmdString],

        //Cmd: ['sh', '-c', 'ls -la /workspace && mvn clean test'], // First list files issue with pom.xml file missing , then run tests
        WorkingDir: '/workspace',
        //we deleted the sandbox user in dockerfile to avoid permission issues so you down need the line below
        //User: `${process.getuid()}:${process.getgid()}`,  // Use host user's UID:GID
        HostConfig: {
            Memory: 512 * 1024 * 1024, // 512MB
            CpuQuota: 50000, // 50% of a CPU
            NetworkMode: 'none', // Disable networking but that means no internet access for maven dependencies
            Binds: [`${tempHostDir}:/workspace:rw`],//mount temp dir
            AutoRemove: false //we will remove manually after getting logs
        }
    });

    // Start the container
    await container.start();

    // Wait with timeout
    // Use Promise
    // If timeout occurs, kill the container
    const result = await Promise.race([
        container.wait(),//wait for completion
        //kill the container on timeout
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);

    const logs = await container.logs({ stdout: true, stderr: true });
    await container.remove();//clean up container
    console.log(logs.toString());
    return {
        success: true,
        stdout: logs.toString(),
        stderr: '',
        testResults: parseJUnitOutput(logs.toString()),
        executionTime: Date.now() - startTime
    };
}

//we are mounting the volume from host to docker container
//then running the container to execute the code
// Host Machine (Lab Creator Server)
// └── ./tmp/exec-123456/          ← We create this first
//     ├── pom.xml
//     ├── src/main/java/Solution.java
//     └── src/test/java/SolutionTest.java

// Docker Container (created after)
// └── /workspace/                  ← Mounted from host
//     ├── pom.xml                 ← Same files!
//     ├── src/main/java/Solution.java
//     └── src/test/java/SolutionTest.java

module.exports = {
  compileAndRunJavaWithTests,
  parseJUnitOutput,
  cleanupExecutionEnvironment
};