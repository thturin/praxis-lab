# Educational Platform - Developer Guide

## Project Overview

This is an educational lab/assignment platform with AI-powered grading capabilities. The system allows instructors to create interactive labs with various question types (short answer, paragraph, Java code) and automatically grades student submissions using AI and automated testing.

**Tech Stack:**
- Frontend: React
- Backend: Express.js (Node.js)
- Databases: PostgreSQL (both services) with Prisma ORM
- Containerization: Docker, docker-compose
- AI: DeepSeek API
- Testing: JUnit 5 (for Java code execution)

---

## Architecture

### Microservices Overview

```
edu-platform/
├── portal/                     # Admin & student frontend + backend
│   ├── client/                # React application
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── admin/    # Admin dashboard, assignment management
│   │   │   │   ├── lab/      # Lab editor, preview, student interface
│   │   │   │   └── student/  # Student-specific views
│   │   └── public/
│   └── server/                # Express API
│       ├── controllers/       # Request handlers
│       ├── models/           # PostgreSQL models
│       └── routes/           # API routes
│
├── lab-creator/               # Lab creation & grading backend
│   └── server/
│       ├── controllers/       # gradeController, labController, sessionController
│       ├── prisma/           # Prisma schema & migrations (Lab, Session models)
│       ├── services/         # gradingService, dockerExecutionService, parseHtml
│       ├── routes/           # API routes
│       └── docker/
│           └── java-sandbox/ # Docker image for Java code execution
│
└── docker-compose.yml         # Orchestrates both services
```

### Service Communication

**Portal Service** (port 5000 / 3001)
- Manages users, assignments, submissions
- PostgreSQL database
- Proxies lab-related requests to lab-creator service

**Lab-Creator Service** (port 3000)
- Manages lab content (stored as JSON columns in PostgreSQL)
- Tracks student sessions (responses, graded results)
- Executes grading pipeline (Docker + AI)
- PostgreSQL database with Prisma ORM

---

## Key Data Models

### Lab Structure (PostgreSQL - lab-creator)

**Prisma Schema:**
```prisma
model Lab {
  id           Int        @id @default(autoincrement())
  title        String
  blocks       Json       // Stored as JSON column
  createdAt    DateTime   @default(now())
  assignmentId Int        @unique
  sessions     Session[]
  aiPrompt     String?
}
```

**Example blocks JSON:**
```javascript
[
  {
    id: "1765678253268",      // Timestamp-based unique ID
    blockType: "material",     // or "question"
    content: "<p>Introduction...</p>"
  },
  {
    id: "1765678253269",
    blockType: "question",
    type: "code",              // "short", "textarea", "code"
    prompt: "<p>Write a method...</p>",
    key: "<p>public class Solution...</p>",  // Answer key
    explanation: "<p>The solution should...</p>",
    generatedTestCode: "import org.junit...",  // JUnit tests
    isScored: true,
    subQuestions: [            // Optional nested questions
      {
        id: "1765678253270",
        prompt: "<p>a. What is...</p>",
        type: "short",
        isScored: true
      }
    ]
  }
]
```

### Session Structure (PostgreSQL - lab-creator)

**Prisma Schema:**
```prisma
model Session {
  id            String   @id @default(uuid())
  labId         Int
  lab           Lab      @relation(fields: [labId], references: [id])
  labTitle      String
  username      String
  userId        Int
  responses     Json     // Stored as JSON column
  gradedResults Json     // Stored as JSON column
  finalScore    Json     // Stored as JSON column
  lastModified  DateTime @updatedAt
  createdAt     DateTime @default(now())
  @@unique([labId, userId])
}
```

**Example JSON data:**
```javascript
// responses
{
  "1765678253269": "public class Solution { ... }",  // questionId: answer
  "1765678253270": "A variable is..."
}

// gradedResults
{
  "1765678253269": {
    score: 0.85,
    feedback: "Good solution! However, consider edge cases...",
    testResults: { total: 10, passed: 8, failed: 2 },
    generatedTests: "import org.junit..."
  },
  "1765678253270": {
    score: 1.0,
    feedback: "Correct!"
  }
}

// finalScore
{
  percent: "92.5",
  totalScore: 1.85,
  maxScore: 2
}
```

### Submission Structure (PostgreSQL - portal)

```javascript
{
  id: 123,
  assignmentId: "assign_123",
  userId: 789,
  type: "lab",
  score: 87.5,              // After late penalty
  submittedAt: "2026-01-20T10:30:00Z",
  dueDate: "2026-01-20T23:59:59Z"
}
```

---

## Critical Data Flows

### 1. Lab Creation Flow

**Path:** Admin creates lab → Saves to PostgreSQL

```
Admin UI (QuestionEditor.jsx)
  ↓
Creates blocks array with questions
  ↓
POST /lab/save-lab
  ↓
labController.saveLab()
  ↓
PostgreSQL: Lab table (blocks stored as JSON column via Prisma)
```

**Key Files:**
- [portal/client/src/features/lab/components/QuestionEditor.jsx](portal/client/src/features/lab/components/QuestionEditor.jsx) - Question editing UI
- [portal/client/src/features/lab/models/block.js](portal/client/src/features/lab/models/block.js) - Block factory functions
- [lab-creator/server/controllers/labController.js](lab-creator/server/controllers/labController.js) - Lab CRUD operations
- [lab-creator/server/prisma/schema.prisma](lab-creator/server/prisma/schema.prisma) - Database schema (Lab & Session models)

### 2. Student Submission Flow

**Path:** Student answers → Auto-save → Submit → Grade → Store results

```
Student answers question in LabPreview
  ↓
handleResponseChange() updates session state
  ↓
Auto-save useEffect (1 second debounce)
  ↓
POST /session/save-session (PostgreSQL via Prisma)
  ↓
Student clicks Submit
  ↓
submitResponses() function
  ↓
For each response:
  ├─ Java code? → POST /grade/java
  │    ↓
  │    gradeJavaCode()
  │    ├─ parseCodeFromHtml() - Strip HTML
  │    ├─ compileAndRunJavaWithTests() - Docker execution
  │    └─ analyzeStudentCode() - DeepSeek AI feedback
  │
  └─ Text answer? → POST /grade/deepseek
       ↓
       gradeWithDeepSeek() - AI grading
  ↓
Calculate final score
  ↓
Update session.gradedResults & session.finalScore (PostgreSQL - JSON columns)
  ↓
POST /submissions/upsertLab (PostgreSQL)
```

**Key Files:**
- [portal/client/src/features/lab/components/LabPreview.jsx](portal/client/src/features/lab/components/LabPreview.jsx) - Student interface, submission logic
- [lab-creator/server/services/gradingService.js](lab-creator/server/services/gradingService.js) - Grading algorithms
- [lab-creator/server/services/dockerExecutionService.js](lab-creator/server/services/dockerExecutionService.js) - Java code execution
- [lab-creator/server/services/parseHtml.js](lab-creator/server/services/parseHtml.js) - HTML parsing utilities

### 3. Java Grading Pipeline

**Detailed flow for Java code questions:**

```
gradeJavaCode({ studentCode, problemDescription, testCode })
  ↓
1. Student code is HTML from ReactQuill editor
   parseCodeFromHtml() → Clean Java code
   Normalize class name to "Solution"
  ↓
2. Create temporary directory structure:
   /tmp/exec-{timestamp}/
     ├── pom.xml (JUnit 5 dependencies)
     └── src/
         ├── main/java/Solution.java (student code)
         └── test/java/SolutionTest.java (generated tests)
  ↓
3. Spawn Docker container:
   - Image: java-grading-sandbox:latest
   - Network: disabled (offline)
   - Memory: 512MB, CPU: 50%
   - Volume: Mount temp dir to /workspace
   - Command: mvn clean test
  ↓
4. Parse JUnit output:
   Extract: total tests, passed, failed
  ↓
5. Send results to DeepSeek AI:
   analyzeStudentCode() → Generate feedback
  ↓
6. Return:
   {
     gradingResults: { score: 0.8, feedback: "..." },
     testResults: { total: 10, passed: 8, failed: 2 },
     generatedTests: "JUnit code..."
   }
```

**Security:**
- Network disabled in container (no internet access)
- Resource limits (512MB RAM, 50% CPU)
- Timeout after 60 seconds
- Code runs as root (sandbox user removed for simplicity)

---

## Important Patterns & Conventions

### Question ID System

Questions use **timestamp-based unique IDs** (e.g., `"1765678253268"`):
- Generated when question is created: `Date.now().toString()`
- Used as keys in `session.responses` and `session.gradedResults`
- Subquestions have their own IDs and are scored independently

**Example:**
```javascript
const newQuestion = {
  id: Date.now().toString(),
  blockType: "question",
  type: "short",
  isScored: true,
  subQuestions: []
};
```

### HTML Handling

ReactQuill editor produces HTML. **Always strip HTML before sending to AI or Docker.**

**Functions:**
- `parseTextFromHtml(htmlContent)` - Extracts plain text
- `parseCodeFromHtml(htmlContent)` - Extracts code + normalizes class name to "Solution"

**Location:** [lab-creator/server/services/parseHtml.js](lab-creator/server/services/parseHtml.js)

**Example:**
```javascript
const { parseCodeFromHtml } = require('./services/parseHtml');

// Input: "<p>public class ActivityTracker {</p><p>&nbsp;&nbsp;private int x;</p>"
// Output: "public class Solution {\n  private int x;\n}"
const cleanCode = parseCodeFromHtml(htmlFromEditor);
```

### Docker Sandboxing

**Key Points:**
1. **Offline execution**: `NetworkMode: 'none'` - no internet access
2. **Pre-downloaded dependencies**: Maven dependencies cached during image build
3. **Class name normalization**: All student classes renamed to "Solution"
4. **Volume mounting**: Host path mounted to `/workspace` in container

**Gotcha:** Use host paths for volume mounts, not container paths.

```javascript
// ❌ Wrong - container path
Binds: [`/app/tmp/exec-123:/workspace:rw`]

// ✅ Correct - host path
Binds: [`/home/user/projects/edu-platform/lab-creator/server/tmp/exec-123:/workspace:rw`]
```

### Auto-save Pattern

Sessions auto-save every 1 second to prevent data loss.

**Implementation in LabPreview.jsx:**
```javascript
useEffect(() => {
  saveSession();
  const timeoutId = setTimeout(saveSession, 1000);
  return () => clearTimeout(timeoutId);
}, [saveSession]);
```

### Async State Updates

**Problem:** `setSession()` is async, don't rely on immediate updates.

**Solution:** Use local variables for calculations.

**Example from submitResponses():**
```javascript
// ❌ Wrong - session.finalScore may not be updated yet
setSession(prev => ({ ...prev, finalScore: newScore }));
const scoreToSubmit = session.finalScore.percent; // May be old value!

// ✅ Correct - use local variable
const newFinalScorePercent = response.data.session.finalScore.percent;
setSession(prev => ({ ...prev, finalScore: newScore }));
const scoreToSubmit = newFinalScorePercent; // Guaranteed correct
```

### PostgreSQL JSON Columns with Prisma

The system uses **PostgreSQL JSON columns** instead of MongoDB for flexible data structures.

**Why JSON columns?**
- Flexible nested structures (blocks arrays with varying question types)
- No fixed schema needed for lab content
- Relational benefits (foreign keys, transactions) where needed
- Single database technology for entire platform

**Prisma Schema:**
```prisma
model Lab {
  id           Int        @id @default(autoincrement())
  blocks       Json       // Stores entire blocks array as JSON
  sessions     Session[]
}

model Session {
  id            String   @id @default(uuid())
  responses     Json     // questionId → answer mapping
  gradedResults Json     // questionId → { score, feedback }
  finalScore    Json     // { percent, totalScore, maxScore }
}
```

**Querying:**
```javascript
// Prisma handles JSON automatically
const lab = await prisma.lab.findUnique({ where: { id: labId } });
console.log(lab.blocks); // JavaScript object, not string

// Update JSON field
await prisma.session.update({
  where: { id: sessionId },
  data: {
    responses: { ...existingResponses, [questionId]: answer }
  }
});
```

---

## Common Tasks

### Adding a New Question Type

1. **Update QuestionEditor.jsx dropdown** ([portal/client/src/features/lab/components/QuestionEditor.jsx:203-213](portal/client/src/features/lab/components/QuestionEditor.jsx))
   ```javascript
   <option value="short">Short Answer</option>
   <option value="textarea">Paragraph</option>
   <option value="code">Java</option>
   <option value="multiple-choice">Multiple Choice</option> {/* NEW */}
   ```

2. **Add grading logic in LabPreview.jsx** ([portal/client/src/features/lab/components/LabPreview.jsx:210-248](portal/client/src/features/lab/components/LabPreview.jsx))
   ```javascript
   if (type === 'multiple-choice') {
     response = await axios.post(`${...}/grade/multiple-choice`, {
       userAnswer,
       answerKey,
       question
     });
   }
   ```

3. **Create backend endpoint** (lab-creator/server/controllers/gradeController.js)
   ```javascript
   router.post('/multiple-choice', async (req, res) => {
     // Grading logic
   });
   ```

### Modifying Grading Logic

**For Java questions:**
- **Test generation:** [lab-creator/server/services/gradingService.js:22-86](lab-creator/server/services/gradingService.js) - `generateJUnitTests()`
- **Execution:** [lab-creator/server/services/dockerExecutionService.js:76-139](lab-creator/server/services/dockerExecutionService.js) - `compileAndRunJavaWithTests()`
- **AI feedback:** [lab-creator/server/services/gradingService.js:88-136](lab-creator/server/services/gradingService.js) - `analyzeStudentCode()`

**For text questions:**
- **Grading:** [lab-creator/server/services/gradingService.js:175-229](lab-creator/server/services/gradingService.js) - `gradeWithDeepSeek()`
- **Prompt template:** [lab-creator/server/services/gradingService.js:175-193](lab-creator/server/services/gradingService.js) - `buildPrompt()`

**Example: Adjust scoring strictness**
```javascript
// In analyzeStudentCode() prompt:
"Overall score (0-1) - award partial credit generously for partially correct solutions"
```

### Debugging Docker Issues

**1. Check logs:**
```bash
docker ps  # Find container ID
docker logs <container-id>
```

**2. Inspect sandbox content:**
Modify cmdString in [dockerExecutionService.js:99](lab-creator/server/services/dockerExecutionService.js):
```javascript
// Show file contents before running tests
const cmdString = 'ls -la /workspace && cat /workspace/src/main/java/Solution.java && mvn clean test';
```

**3. Rebuild Docker image:**
```bash
docker build -t java-grading-sandbox:latest ./lab-creator/server/docker/java-sandbox
```

**4. Test locally without Docker:**
```bash
cd lab-creator/server/tmp/exec-{timestamp}
mvn clean test
```

---

## Environment Variables

### Portal Service

**File:** `portal/.env` or `portal/server/.env`

```env
# Backend
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/portal_db
SESSION_SECRET=your-secret-key

# Frontend (Create React App)
REACT_APP_API_HOST=http://localhost:5000
REACT_APP_API_LAB_HOST=http://localhost:3000
```

### Lab-Creator Service

**File:** `lab-creator/server/.env`

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/labcreator_db
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# For Docker volume mounting
HOST_APP_PATH=/home/tatiana-turin/projects/edu-platform/lab-creator/server
```

---

## Known Issues & Gotchas

### 1. Maven Offline Dependencies

**Problem:** Maven's surefire plugin does lazy dependency resolution. Running `mvn test -DskipTests` doesn't download the JUnit platform launcher.

**Solution:** Dockerfile creates a dummy test and runs `mvn clean test` during build.

**File:** [lab-creator/server/docker/java-sandbox/Dockerfile:18-31](lab-creator/server/docker/java-sandbox/Dockerfile)

```dockerfile
RUN mkdir -p /tmp/src/main/java /tmp/src/test/java && \
    echo 'public class Dummy {}' > /tmp/src/main/java/Dummy.java && \
    echo 'import org.junit.jupiter.api.Test; import static org.junit.jupiter.api.Assertions.*; public class DummyTest { @Test public void test() { assertTrue(true); } }' > /tmp/src/test/java/DummyTest.java

RUN cd /tmp && mvn clean test && cd / && rm -rf /tmp/*
```

### 2. HTML in Prompts

**Problem:** ReactQuill produces HTML (`<p>`, `&nbsp;`, etc.) which clutters AI prompts and breaks Java compilation.

**Solution:** Always use `parseTextFromHtml()` or `parseCodeFromHtml()` before sending to AI/Docker.

**File:** [lab-creator/server/services/parseHtml.js](lab-creator/server/services/parseHtml.js)

### 3. Class Name Mismatches

**Problem:** Student writes `public class ActivityTracker`, but sandbox expects `public class Solution`.

**Solution:** `parseCodeFromHtml()` automatically renames class and constructor to "Solution".

**Code:** [lab-creator/server/services/parseHtml.js:27-31](lab-creator/server/services/parseHtml.js)

```javascript
code = code.replace(/public\s+class\s+\w+\s*\{/, 'public class Solution {');
code = code.replace(/public\s+\w+\s*\(/, 'public Solution(');
```

Generated tests also reference "Solution" (handled in `generateJUnitTests()`).

### 4. Docker Container Networking

**Problem:** Containers can't see each other's files by default.

**How it works:**
- `lab-creator-api` container creates files at `/app/tmp/exec-123/`
- These files exist on host at `./lab-creator/server/tmp/exec-123/` (due to volume mount)
- Sandbox container mounts the **host path**, not the container path

**File:** [lab-creator/server/services/dockerExecutionService.js:80-85](lab-creator/server/services/dockerExecutionService.js)

### 5. Subquestion Scoring

**Important:** Only scored questions appear in final grade calculation.

**Rules:**
- If a question has subquestions, the parent is NOT scored (only subquestions are)
- Each subquestion can be individually marked as `isScored: true/false`
- Checkbox only shown for: (1) questions without subquestions, or (2) subquestions

**File:** [portal/client/src/features/lab/components/QuestionEditor.jsx:252-262](portal/client/src/features/lab/components/QuestionEditor.jsx)

---

## File Naming Conventions

- **React components:** PascalCase - `QuestionEditor.jsx`, `LabPreview.jsx`
- **Backend services:** camelCase - `gradingService.js`, `dockerExecutionService.js`
- **Controllers:** camelCase - `gradeController.js`, `labController.js`
- **Routes:** camelCase - `gradeRoutes.js`, `labRoutes.js`
- **Models:** PascalCase - `Lab.js`, `Session.js`, `User.js`

---

## Testing Approach

Currently **minimal automated tests**. Manual testing workflow:

### Testing Java Grading End-to-End

1. **Create Lab** (Admin UI)
   - Add Java code question
   - Write answer key in "Answer Key" section
   - Click "Generate Java Test Code" button
   - Review/edit generated JUnit tests
   - Save lab

2. **Assign to Students** (Admin UI)
   - Create assignment linking to lab
   - Set due date

3. **Submit as Student**
   - Open lab in student mode
   - Write Java solution
   - Click Submit
   - Verify Docker execution logs in backend console

4. **Verify Results**
   - Check feedback from AI
   - Check test results (passed/failed count)
   - Verify score calculation
   - Check submission in admin dashboard

### Debug Checklist

- [ ] Docker image rebuilt? `docker build -t java-grading-sandbox:latest ...`
- [ ] .env variables set? Check `DEEPSEEK_API_KEY`, `DATABASE_URL`
- [ ] PostgreSQL running? `docker ps | grep postgres`
- [ ] Prisma schema synced? `npx prisma generate`
- [ ] Network disabled in sandbox? Check `NetworkMode: 'none'`
- [ ] Test code uses "Solution" class name?
- [ ] HTML stripped from student code before execution?

---

## API Endpoints Reference

### Lab-Creator Service (port 3000)

**Labs:**
- `GET /lab/load-lab?labId={id}` - Load lab by ID or assignment ID
- `POST /lab/save-lab` - Save/update lab
- `POST /lab/delete-lab` - Delete lab

**Sessions:**
- `GET /session/load-session/:labId?userId={id}&username={name}` - Load user session
- `POST /session/save-session` - Save session
- `GET /session/get-sessions/labId?labId={id}` - Get all sessions for a lab

**Grading:**
- `POST /grade/java` - Grade Java code (Docker + AI)
- `POST /grade/deepseek` - Grade text answer (AI only)
- `POST /grade/java/generate-tests` - Generate JUnit tests from problem description
- `POST /grade/calculate-score` - Calculate final score from graded results

### Portal Service (port 5000)

**Assignments:**
- `GET /assignments` - List all assignments
- `POST /assignments` - Create assignment
- `PUT /assignments/:id` - Update assignment
- `DELETE /assignments/:id` - Delete assignment

**Submissions:**
- `GET /submissions` - List submissions (with filters)
- `POST /submissions/upsertLab` - Create/update lab submission

**Users:**
- `GET /users` - List users
- `POST /users` - Create user

---

## Troubleshooting Guide

### "Container not found" error

**Cause:** Trying to access container files from host.

**Fix:** Use host paths for volume mounts, not container paths.

### "Maven BUILD FAILURE - junit-platform-launcher not found"

**Cause:** Surefire plugin dependencies not downloaded during image build.

**Fix:** Rebuild Docker image with dummy test (already fixed in Dockerfile).

### "Class 'ActivityTracker' not found"

**Cause:** Student class name doesn't match "Solution" expected by tests.

**Fix:** Ensure `parseCodeFromHtml()` is called before Docker execution (already implemented).

### Infinite re-renders in React

**Cause:** useEffect missing dependencies or changing reference.

**Fix:** Use `useCallback` for functions, check dependency arrays.

### Session not saving

**Cause:** PostgreSQL connection issue, Prisma client error, or session structure mismatch.

**Fix:** Check PostgreSQL logs, verify `session` object has required fields (id, labId, userId), ensure Prisma client is properly initialized.

---

## Future Enhancements

**Planned features:**
- Analytics dashboard for instructors (student progress, misconceptions)
- Export session data to CSV
- Support for Python, JavaScript code questions
- Peer review workflow
- LLM-powered misconception clustering
- Plagiarism detection
- Time-series score tracking
- Individual student profiles

---

## Getting Started (Quick Reference)

```bash
# 1. Install dependencies
cd portal/client && npm install
cd ../server && npm install
cd ../../lab-creator/server && npm install

# 2. Set up environment variables
cp portal/.env.example portal/.env
cp lab-creator/server/.env.example lab-creator/server/.env
# Edit .env files with your values

# 3. Start databases
docker-compose up -d portal-db lab-creator-db

# 4. Build Docker sandbox image
docker build -t java-grading-sandbox:latest ./lab-creator/server/docker/java-sandbox

# 5. Start services
docker-compose up

# OR start manually:
cd portal/client && npm start          # React dev server (port 3001)
cd portal/server && npm start          # Portal API (port 5000)
cd lab-creator/server && npm start     # Lab-creator API (port 3000)
```

**Access:**
- Frontend: http://localhost:3001
- Portal API: http://localhost:5000
- Lab-Creator API: http://localhost:3000

---

## Contributing

**Code Style:**
- Use ESLint configuration
- Follow existing patterns
- Add comments for complex logic
- Keep functions focused (single responsibility)

**Before committing:**
- Test manually (no automated tests yet)
- Check Docker containers work offline
- Verify env variables are in `.env.example` (not committed with values)
- Update this claude.md if architecture changes

---

## Contact

For questions about this codebase, refer to:
- This claude.md file (architecture overview)
- Inline code comments (implementation details)
- Git history (why decisions were made)
