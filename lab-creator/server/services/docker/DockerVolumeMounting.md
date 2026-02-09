# The Complete Flow: Volume Mounting Visualization
Step 1: Before Anything Happens

🖥️ YOUR HOST MACHINE (Physical Computer)
└── /home/tatiana-turin/projects/edu-platform/
    └── lab-creator/
        └── server/
            ├── services/
            │   └── dockerExecutionService.js  ← Your code runs here
            └── tmp/                           ← DOESN'T EXIST YET
Step 2: Docker Compose Starts lab-creator-api Container

🖥️ HOST MACHINE
├── Docker Daemon (manages all containers)
│
└── /home/tatiana-turin/projects/edu-platform/
    └── lab-creator/server/  ← This gets mounted into container

    ┌─────────────────────────────────────────────┐
    │ 🐳 lab-creator-api CONTAINER                │
    │                                             │
    │ /app/  ← Mounted from host                  │
    │  ├── services/                              │
    │  │   ├── dockerExecutionService.js          │
    │  │   └── gradingService.js                  │
    │  ├── controllers/                           │
    │  ├── node_modules/                          │
    │  └── tmp/  ← Will be created here          │
    │                                             │
    │ Also has access to:                         │
    │ /var/run/docker.sock → Host's Docker       │
    └─────────────────────────────────────────────┘
Step 3: Student Submits Code → gradeJavaCode() Called


// Inside lab-creator-api container at /app/services/dockerExecutionService.js
const tempDir = path.join(__dirname, '..', 'tmp', `exec-${startTime}`);
// Resolves to: /app/tmp/exec-1234567890
What this means:
__dirname = /app/services (inside container)
.. = go up one level = /app
Result: /app/tmp/exec-1234567890
Step 4: createMavenProject() Creates Files

🖥️ HOST MACHINE                          🐳 lab-creator-api CONTAINER
                                         
/home/tatiana-turin/projects/           /app/  (same files via mount!)
edu-platform/lab-creator/server/        
├── services/                           ├── services/
├── controllers/                        ├── controllers/
└── tmp/  ← CREATED!                    └── tmp/  ← CREATED!
    └── exec-1234567890/                    └── exec-1234567890/
        ├── pom.xml                             ├── pom.xml
        ├── src/                                ├── src/
        │   ├── main/java/                      │   ├── main/java/
        │   │   └── Solution.java               │   │   └── Solution.java
        │   └── test/java/                      │   └── test/java/
        │       └── SolutionTest.java               └── SolutionTest.java

        ⬆️ Same physical files!
        (Because of docker-compose volume mount)
Step 5: Create Grading Sandbox Container

// Still inside lab-creator-api container
const container = await docker.createContainer({
    Image: 'java-grading-sandbox:latest',
    Binds: [`/app/tmp/exec-1234567890:/workspace:rw`]
    //       ^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^
    //       Source (in lab-creator) → Destination (in sandbox)
});

Now we have 3 layers:

🖥️ HOST MACHINE
└── /home/tatiana-turin/projects/edu-platform/lab-creator/server/tmp/exec-1234567890/
    ├── pom.xml
    └── src/...
    
    ↕️ (mounted via docker-compose)
    
🐳 lab-creator-api CONTAINER
└── /app/tmp/exec-1234567890/
    ├── pom.xml  ← Same files
    └── src/...
    
    ↕️ (mounted via dockerode)
    
🐳 java-grading-sandbox CONTAINER (NEW!)
└── /workspace/
    ├── pom.xml  ← Same files again!
    └── src/...
Step 6: Sandbox Container Runs Maven

🐳 java-grading-sandbox CONTAINER
┌─────────────────────────────────────────┐
│ Working Directory: /workspace           │
│                                         │
│ $ ls -la /workspace                     │
│ drwxr-xr-x    sandbox  /workspace      │
│ -rw-r--r--    sandbox  pom.xml         │ ← Sees the file!
│ drwxr-xr-x    sandbox  src/            │
│                                         │
│ $ mvn clean test                        │
│ [INFO] Scanning for projects...        │
│ [INFO] Found pom.xml ✅                │
│ [INFO] Building...                     │
│ [INFO] Running tests...                │
└─────────────────────────────────────────┘
Complete Visual Timeline

TIME  HOST                           lab-creator-api          java-sandbox
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
t0    lab-creator/server/           [CONTAINER STARTS]       [doesn't exist]
      (no tmp/ folder yet)           /app/ ← mounted
                                     
t1    lab-creator/server/            Code creates files:      [doesn't exist]
      tmp/exec-123/                  /app/tmp/exec-123/
      ├── pom.xml ✅                 ├── pom.xml ✅
      └── src/ ✅                    └── src/ ✅
      ↑                              ↑
      └──────── SAME FILES ──────────┘
      
t2    tmp/exec-123/                  Creates sandbox          [CONTAINER CREATED]
      still exists                   container with           /workspace/ ← mounted
                                     volume mount             from /app/tmp/exec-123
                                     
t3    tmp/exec-123/                  Sandbox running          $ ls /workspace
      still exists                                            pom.xml ✅
                                                              src/ ✅
                                                              
                                                              $ mvn test
                                                              ✅ Works!
                                                              
t4    tmp/exec-123/                  Cleanup:                 [CONTAINER DESTROYED]
      DELETED ❌                     rm -rf /app/tmp/exec-123
The Key Insight: Three-Layer Cake

┌─────────────────────────────────────────────────────────────┐
│ 🐳 java-grading-sandbox (Ephemeral)                        │
│    /workspace/pom.xml                                       │
│    ↑ Mounted via Binds                                     │
└────│────────────────────────────────────────────────────────┘
     │
┌────│────────────────────────────────────────────────────────┐
│ 🐳 lab-creator-api (Long-running)                          │
│    /app/tmp/exec-123/pom.xml                               │
│    ↑ Mounted via docker-compose                            │
└────│────────────────────────────────────────────────────────┘
     │
┌────│────────────────────────────────────────────────────────┐
│ 🖥️ HOST (Physical Machine)                                 │
│    /home/tatiana-turin/.../tmp/exec-123/pom.xml            │
└─────────────────────────────────────────────────────────────┘
         ↑
         └─ ACTUAL PHYSICAL FILE LOCATION
Why Your Code Works Now
Before (with ./tmp/):

const tempDir = `./tmp/exec-${startTime}`;  // Relative path
// Might resolve differently in different contexts
// Could be /tmp/exec-123 or /app/tmp/exec-123 (confusing!)
After (with path.join(__dirname, '..', 'tmp')):

const tempDir = path.join(__dirname, '..', 'tmp', `exec-${startTime}`);
// ALWAYS resolves to: /app/tmp/exec-1234567890
// ✅ Consistent absolute path
The "No POM" Error Explained
What was happening before:

lab-creator-api creates files at: ./tmp/exec-123/
                                  (ambiguous! Could be anywhere)
                                  
Docker tries to mount:            /some/wrong/path/tmp/exec-123:/workspace
                                  
Sandbox container sees:           /workspace/ is EMPTY! ❌
Maven says:                       "No POM in this directory!"
What happens now:

lab-creator-api creates files at: /app/tmp/exec-123/ ✅
                                  (absolute path, unambiguous)
                                  
Docker mounts:                    /app/tmp/exec-123:/workspace ✅
                                  
Sandbox container sees:           /workspace/pom.xml ✅
                                                /src/ ✅
Maven says:                       "Found POM! Building..." ✅
Verification You Can Do
Check host filesystem:

ls -la /home/tatiana-turin/projects/edu-platform/lab-creator/server/tmp/
# Should see: exec-1234567890/
Check inside lab-creator-api:

docker exec -it lab-creator-api ls -la /app/tmp/
# Should see: exec-1234567890/ (same directory!)
Check the binding is working:

# In lab-creator-api container
docker exec -it lab-creator-api cat /app/tmp/exec-*/pom.xml
# Should show the pom.xml content