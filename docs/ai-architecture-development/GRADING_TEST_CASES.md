# AI Grading Architecture - Test Cases & Results

This document tracks real-world test cases to evaluate the performance of our multi-module grading system (LGE + KPM + PQM + TSM).

## Test Case Format

Each test case includes:
- **Question**: The problem statement
- **Answer Key**: Expected/reference solution
- **Student Response**: Actual student submission
- **Grading Breakdown**: Scores from all 4 modules
- **Final Result**: Pass/Fail with feedback
- **Analysis**: Why this case is interesting/important

---

## Test Case #1: Java Array Multiplication (Syntax Equivalence)

**Date**: 2026-02-19
**Question Type**: Java Coding

### Question
```java
/** Multiplies each number in numList by multiplier.
 *
 * THIS METHOD MUTATES (MODIFIES) ORIGINAL ARRAY
 * PRECONDITION: numList.length > 0
 */
public static void multiplyBy(int[] numList, int multiplier) {
  // IMPLEMENT ME
}
```

**Test Code**:
```java
int[] nums = {5, 10, 15, 12, 2, 4};
ArrayAlgorithms.multiplyBy(nums, 6);
// original nums array IS modified
for (int i = 0; i < nums.length; i++) {
    System.out.print(nums[i] + " ");
}
System.out.println();

int[] nums2 = {-5, -7, 14, 0, 5, 20, -30};
ArrayAlgorithms.multiplyBy(nums2, -12);
// original nums2 array IS modified
for (int i = 0; i < nums2.length; i++) {
    System.out.print(nums2[i] + " ");
}
```

**Expected Output**:
```
30 60 90 72 12 24
60 84 -168 0 -60 -240 360
```

### Answer Key
```java
public static void multiplyBy(int[] numList, int multiplier) {
  for (int i = 0; i < numList.length; i++) {
    numList[i] = numList[i] * multiplier;
  }
}
```

### Student Response
```java
public static void multiplyBy(int[] numList, int multiplier) {
  for (int i = 0; i < numList.length; i++) {
    numList[i] *= multiplier;
  }
}
```

### Grading Breakdown
```
LGE (Primary):  fail
TSM (Text Sim): 0.987
KPM (Key Pts):  0.782
PQM (Pseudo-Q): 0.672
```

**Override Triggered**: YES
- KPM score (0.782) >= 0.65 threshold → Override LGE failure to PASS

### Final Result
✅ **PASS** (via KPM override)

**Feedback**:
> "You passed both criteria. Your code correctly multiplies each element in the array by the multiplier, producing the expected output when tested. It uses the compound assignment operator (*=), which is semantically equivalent to the expected answer's explicit multiplication. All required elements are present and clear. Great job!"

### Analysis
**Why This Case Matters**:
- Demonstrates the value of the multi-module approach
- LGE (DeepSeek) incorrectly failed syntactically equivalent code
- KPM successfully identified semantic equivalence (0.782)
- TSM also scored very high (0.987), confirming similarity
- System correctly overrode false negative

**Lesson**: The KPM override mechanism is working as intended - catching valid alternative implementations that LGE might miss due to strict pattern matching.

---

## Template for New Test Cases

```markdown
## Test Case #X: [Brief Description]

**Date**: YYYY-MM-DD
**Question Type**: [Java Coding / Short Answer / Multiple Choice]

### Question
[Full question text]

### Answer Key
[Reference answer]

### Student Response
[Student's actual answer]

### Grading Breakdown
```
LGE (Primary):  [pass/fail]
TSM (Text Sim): [0.000]
KPM (Key Pts):  [0.000]
PQM (Pseudo-Q): [0.000]
```

**Override Triggered**: [YES/NO]

### Final Result
[✅ PASS / ❌ FAIL]

**Feedback**:
> [Actual feedback given to student]

### Analysis
**Why This Case Matters**:
- [Key insights]

**Lesson**: [What we learned]
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total Test Cases | 1 |
| Correct Grades | 1 |
| False Positives (Wrong PASS) | 0 |
| False Negatives (Wrong FAIL) | 0 |
| KPM Overrides Triggered | 1 |
| KPM Overrides Correct | 1 |

**KPM Override Accuracy**: 100% (1/1)
