# SQL Reference - PostgreSQL JSON & Analytics Patterns

## JSON Operators

| Operator | What it does | Returns |
|----------|-------------|---------|
| `->` | Get JSON value by key | JSON (can chain more operations) |
| `->>` | Get JSON value by key | Text (plain string) |

```sql
-- Example: blocks is a JSON column
l.blocks -> 'someKey'       -- returns JSON
l.blocks ->> 'someKey'      -- returns text
q.value -> 'nested' ->> 'field'  -- chain: dig into nested, get field as text
```

## JSON Expansion Functions

### jsonb_each / jsonb_each_text
Expands a JSON **object** into rows of (key, value) pairs.

```sql
-- Given gradedResults: {"q1": {"score": 8}, "q2": {"score": 5}}
SELECT q.key, q.value
FROM "Session" s,
    jsonb_each(s."gradedResults") AS q;

-- Result:
-- key | value
-- q1  | {"score": 8}
-- q2  | {"score": 5}
```

- `jsonb_each` returns value as JSON (can use -> on it)
- `jsonb_each_text` returns value as text

### jsonb_array_elements
Expands a JSON **array** into rows.

```sql
-- Given blocks: [{"id": "q1", "type": "question"}, {"id": "m1", "type": "material"}]
SELECT b.value ->> 'id' AS block_id
FROM "Lab" l,
    jsonb_array_elements(l.blocks::jsonb) AS b;

-- Result:
-- block_id
-- q1
-- m1
```

## JOIN Types for JSON Expansion

### CROSS JOIN (or comma syntax)
Expands JSON for each row. If the JSON is empty/null, the row is **dropped**.

```sql
-- These two are equivalent:
FROM "Session" s, jsonb_each(s."gradedResults") AS q
FROM "Session" s CROSS JOIN jsonb_each(s."gradedResults") AS q
```

**WARNING:** Don't mix comma syntax with explicit JOINs. Pick one style.

```sql
-- BAD: causes "invalid reference" errors
FROM sessions s, jsonb_each(s.data) AS q
JOIN other_table t ON t.id = s.id

-- GOOD: all explicit
FROM sessions s
CROSS JOIN jsonb_each(s.data) AS q
JOIN other_table t ON t.id = s.id

-- GOOD: move explicit join before comma expansion
FROM sessions s
JOIN other_table t ON t.id = s.id,
jsonb_each(s.data) AS q
```

### LEFT JOIN LATERAL ... ON true
Same as CROSS JOIN but **keeps rows** when the expansion produces nothing (null/empty).

```sql
-- Question block WITH subQuestions: produces rows for each sub-question
-- Question block WITHOUT subQuestions: keeps the row, sq columns are NULL

LEFT JOIN LATERAL jsonb_array_elements(b.value -> 'subQuestions') AS sq ON true
```

**Why LATERAL?** Regular JOINs can't reference other tables in the FROM clause.
`LATERAL` means "this subquery is allowed to reference tables to its left."

**Why ON true?** We always want to keep the row. The filtering happens in WHERE instead.

**When to use which:**

| Situation | Use |
|-----------|-----|
| Every row is guaranteed to have data to expand | `CROSS JOIN` |
| Some rows might have null/empty JSON | `LEFT JOIN LATERAL ... ON true` |

## Aggregate Functions with GROUP BY

**Rule:** Every column in SELECT must either be inside an aggregate function OR listed in GROUP BY.

```sql
SELECT
    l.title,                    -- in GROUP BY
    q.key,                      -- in GROUP BY
    AVG(score),                 -- aggregated
    COUNT(*),                   -- aggregated
    ROUND(AVG(score), 2)        -- aggregated
FROM ...
GROUP BY l.title, q.key;
```

## Useful Functions

### CAST - Convert types
`->>` returns text. To do math on it, cast to numeric:

```sql
cast(q.value ->> 'score' AS numeric)
-- or shorthand:
(q.value ->> 'score')::numeric
```

### COALESCE - First non-null value
Returns the first argument that isn't NULL:

```sql
COALESCE(sq.value ->> 'prompt', b.value ->> 'prompt')
-- If sub-question prompt exists, use it; otherwise use parent prompt
```

### regexp_replace - Strip HTML tags

```sql
regexp_replace(some_text, '<[^>]+>', '', 'g')
-- '<p>Hello <b>world</b></p>' becomes 'Hello world'
-- 'g' flag = global (replace ALL matches, not just first)
```

### CONCAT - Combine strings (null-safe)

```sql
CONCAT(col1, ' - ', col2)
-- If col1 or col2 is NULL, treats it as empty string

col1 || ' - ' || col2
-- If either is NULL, entire result is NULL
```

## CASE Expressions
Conditional logic inside a query:

```sql
COUNT(CASE WHEN condition THEN 1 END) AS conditional_count
-- Counts only rows where condition is true
-- CASE without ELSE returns NULL, and COUNT ignores NULLs
```

## CTE (Common Table Expression) - WITH clause
Lets you name a subquery and reference it like a table.
Useful when you need to reference a calculated column (aliases can't be reused in the same SELECT).

```sql
WITH stats AS (
    SELECT
        title,
        COUNT(*) AS total,
        COUNT(CASE WHEN late THEN 1 END) AS late_count
    FROM ...
    GROUP BY title
)
SELECT
    title,
    total,
    late_count,
    ROUND(100.0 * late_count / total) AS late_percent  -- can use late_count here!
FROM stats;
```

## Complete Example: Per-Question Scores with Question Text

This query combines scores from sessions with question text from lab blocks.
Using CTEs, we break it into 3 readable steps instead of one giant query.

```sql
-- Step 1: Flatten graded results into one row per (session, question)
WITH scores AS (
    SELECT
        s."labId",
        q.key AS question_key,
        cast(q.value ->> 'score' AS numeric) AS score
    FROM real_sessions s
    CROSS JOIN jsonb_each(s."gradedResults") AS q
),

-- Step 2: Flatten lab blocks + sub-questions into one row per question
questions AS (
    SELECT
        l.id AS lab_id,
        l.title,
        COALESCE(sq.value ->> 'id', b.value ->> 'id') AS question_id,
        regexp_replace(
            COALESCE(sq.value ->> 'prompt', b.value ->> 'prompt'),
            '<[^>]+>', '', 'g'
        ) AS question_text
    FROM "Lab" l
    CROSS JOIN jsonb_array_elements(l.blocks::jsonb) AS b
    LEFT JOIN LATERAL jsonb_array_elements(b.value -> 'subQuestions') AS sq ON true
    WHERE b.value ->> 'blockType' != 'material'
)

-- Step 3: Join and aggregate — now it's just a simple JOIN
SELECT
    s.question_key,
    q.title,
    q.question_text,
    round(AVG(s.score), 2) AS avg_score
FROM scores s
JOIN questions q
    ON q.lab_id = s."labId"
    AND q.question_id = s.question_key
GROUP BY s.question_key, q.title, q.question_text
ORDER BY q.title;
```

### Why CTEs make this easier

Each CTE does **one job**, and the final query just connects them:
- **`scores`** — handles session/JSON stuff. Output: lab id, question key, score
- **`questions`** — handles block/sub-question expansion. Output: lab id, question id, text
- **Final SELECT** — joins two clean tables. No JSON, no LATERAL, no COALESCE

### Visualizing the `questions` CTE (LEFT JOIN LATERAL + COALESCE)

Given this lab data:

```
Lab (id: 1, title: "Intro to SQL")
└── blocks: [
      { id: "q1", blockType: "question", prompt: "What is SELECT?", subQuestions: null },
      { id: "q2", blockType: "question", prompt: "Parent prompt", subQuestions: [
            { id: "sq2a", prompt: "Part A?" },
            { id: "sq2b", prompt: "Part B?" }
      ]},
      { id: "m1", blockType: "material", content: "Read this..." }
    ]
```

**After CROSS JOIN (expand blocks into rows):**

| lab_id | b.id | b.blockType | b.prompt        |
|--------|------|-------------|-----------------|
| 1      | q1   | question    | What is SELECT? |
| 1      | q2   | question    | Parent prompt   |
| 1      | m1   | material    | Read this...    |

**After WHERE (filter out materials):**

| lab_id | b.id | b.blockType | b.prompt        |
|--------|------|-------------|-----------------|
| 1      | q1   | question    | What is SELECT? |
| 1      | q2   | question    | Parent prompt   |

**After LEFT JOIN LATERAL (expand sub-questions):**

| lab_id | b.id | b.prompt        | sq.id  | sq.prompt |
|--------|------|-----------------|--------|-----------|
| 1      | q1   | What is SELECT? | **NULL** | **NULL** |
| 1      | q2   | Parent prompt   | sq2a   | Part A?   |
| 1      | q2   | Parent prompt   | sq2b   | Part B?   |

- **q1** has no sub-questions -> LEFT JOIN keeps the row, sq columns are NULL
- **q2** has 2 sub-questions -> expands into 2 rows

**After COALESCE (pick the right id and prompt):**

```
COALESCE(sq.id, b.id)         -> first non-null
COALESCE(sq.prompt, b.prompt) -> first non-null
```

| lab_id | question_id | question_text   |
|--------|-------------|-----------------|
| 1      | **q1**      | What is SELECT? |
| 1      | **sq2a**    | Part A?         |
| 1      | **sq2b**    | Part B?         |

- For **q1**: `sq.id` is NULL -> COALESCE falls back to `b.id` = "q1"
- For **sq2a**: `sq.id` is "sq2a" -> COALESCE uses that (first non-null wins)

COALESCE is saying: "If there's a sub-question, use its id/prompt. Otherwise use the parent's."

### How the data flows (full query):

```
scores CTE:
  Session (1 row)
    -> CROSS JOIN jsonb_each(gradedResults) = 5 rows (one per question)
    Output: labId, question_key, score

questions CTE:
  Lab (1 row)
    -> CROSS JOIN jsonb_array_elements(blocks)       = 10 rows (one per block)
    -> WHERE blockType != 'material'                 = 7 rows (questions only)
    -> LEFT JOIN LATERAL (subQuestions)               = 12 rows (blocks expanded)
    -> COALESCE picks correct id/prompt per row
    Output: lab_id, question_id, question_text

Final SELECT:
  scores JOIN questions ON lab_id + question_id match
    -> Only matching rows kept (like a filter)
    -> GROUP BY averages scores across sessions
    Output: question_key, title, question_text, avg_score
```
