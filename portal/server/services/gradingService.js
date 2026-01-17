const {exec} = require('child_process'); // alllows you to run external commands (terminal) in node js
const fs = require('fs');
const path = require('path');


async function gradeJavaSubmission(clonePath){
    console.log(`--------------GRADING SERVICE -------------`);
    console.log(clonePath);
    console.log('Files in clonePath:', fs.readdirSync(clonePath));
  
    return new Promise((resolve, reject) => { 
        // Debug: Check if gradlew exists and is executable
        const gradlewPath = path.join(clonePath, 'gradlew');
        const hasGradlew = fs.existsSync(gradlewPath);
        
        // Add test-specific flags and timeout to prevent hanging
        const isWin = process.platform === 'win32';
        console.log(process.platform);
        const gradleCommand = hasGradlew ? isWin? 'gradlew.bat' :'./gradlew test' 
            : 
            'gradle test';
        console.log('Running command:', gradleCommand);

        
        // Set a shorter timeout for debugging
        const timeoutId = setTimeout(() => {
            console.error('Gradle command timed out after 5 minutes');
            resolve(-100);
        }, 300000); // 5 minutes
        
        // exec is synchronous and returns IMMEDIATELY
        //but gradleCommand continues to run in the background
        const child = exec(gradleCommand, {
            cwd: clonePath,
            timeout:300000, // 5 minutes
            env: { ...process.env }
        }, (err, stdout, stderr) => { //when gradle finished, this callback executes
            clearTimeout(timeoutId); // this stops the timeout if the exec callback executes before the timer
            console.log('=== GRADLE EXECUTION COMPLETE ===');           
            if (err) {
                console.error('Not all test cases passed or there was a system error');
                const testResultsDir = path.join(clonePath, 'build', 'test-results', 'test');
                if (fs.existsSync(testResultsDir)) {
                console.log('Test results directory contents:', fs.readdirSync(testResultsDir));
                } else {
                console.log('Test results directory does not exist:', testResultsDir);
                }

              //  if you want to print the error message uncomment below
                console.error(err.message);
                console.error('stderr:', stderr);
                
                // Check if it's a build failure vs system error
                if (stderr.includes('BUILD FAILED') || stderr.includes('test')) {
                    console.log('----Build failed, checking for partial results...----');
                    // Try to parse results even if build failed
                }else{
                    console.log('----System error occurred----');
                }
 
            }else{
                console.log('----Gradle succeeded - all tests passed-----');
                //console.log('stdout preview:', stdout.substring(0, 1000));
            }
            
            console.log('-----Calling parseTestResults-----');
            parseTestResults(clonePath, resolve, stdout);
            console.log('----Called parseTestResults----');
        });
        

        //these are event listeners that run before gradle finishes
        // Monitor the child process to see exactly what's happening
        child.on('spawn', () => {
            console.log('✓ Gradle process spawned successfully');
        });
        
        child.on('error', (error) => {
            clearTimeout(timeoutId);
            console.error('✗ Process failed to spawn:', error.message);
        });
        
        child.on('exit', (code, signal) => {
            console.log(`Process exited with code ${code}, signal ${signal}`);
        });
        
        // Add stdout/stderr monitoring to see real-time output
        // child.stdout.on('data', (data) => {
        //     console.log('Gradle stdout:', data.toString().substring(0, 200));
        // });
        
        // child.stderr.on('data', (data) => {
        //     console.log('Gradle stderr:', data.toString().substring(0, 200));
        // });
    });
}

function parseTestResults(clonePath, resolve, stdout) {
    try {
        const testResultsDir = path.join(clonePath, 'build/test-results/test');
        console.log('Looking for test results in:', testResultsDir);
        
        if (!fs.existsSync(testResultsDir)) {
            console.error('Test results directory not found');
            return resolve(0);
        }

        let totalTest = 0;
        let totalPassedTests = 0;

        const files = fs.readdirSync(testResultsDir).filter(file => file.endsWith('.xml'));
        console.log('Found XML files:', files);
        
        files.forEach(file => {
            const filePath = path.join(testResultsDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            console.log('Processing file:', file);

            const totalMatch = fileContent.match(/tests="(\d+)"/);
            const failuresMatch = fileContent.match(/failures="(\d+)"/);
            const errorsMatch = fileContent.match(/errors="(\d+)"/);
            
            if (totalMatch) {
                const total = parseInt(totalMatch[1], 10);
                const failures = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
                const errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;
                const passed = total - failures - errors;

                console.log(`File ${file}: total=${total}, failures=${failures}, errors=${errors}, passed=${passed}`);

                totalTest += total;
                totalPassedTests += passed;
            }
        });

        if (totalTest > 0) {
            const score = Math.round((totalPassedTests / totalTest) * 100);
            console.log(`Final Score: ${totalPassedTests}/${totalTest} = ${score}%`);
            resolve({score:score, output:stdout || 'Gradle tests completed successfully'});
        } else {
            console.log('No tests found, returning 0');
            resolve({score: 0, output:stdout || 'No Tests found'});
        }
    } catch (parseError) {
        console.error('Error in parsing phase:', parseError);
        resolve({score:0, output:stdout || 'Error parsing test results'});
    }
}




module.exports = {gradeJavaSubmission};
