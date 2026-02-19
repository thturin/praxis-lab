#!/usr/bin/env tsx

/**
 * Quick script to add test cases to documentation
 * Usage: npm run add-test-case
 *
 * Or integrate directly in grading routes for automatic logging
 */

import { logTestCase } from '../utils/logTestCase';

// Example: Add the first test case (Java Array Multiplication)
async function addArrayMultiplicationCase() {
  await logTestCase(
    {
      questionType: 'Java Coding',
      question: `/** Multiplies each number in numList by multiplier.
 *
 * THIS METHOD MUTATES (MODIFIES) ORIGINAL ARRAY
 * PRECONDITION: numList.length > 0
 */
public static void multiplyBy(int[] numList, int multiplier) {
  // IMPLEMENT ME
}`,
      testCode: `int[] nums = {5, 10, 15, 12, 2, 4};
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
}`,
      expectedOutput: `30 60 90 72 12 24
60 84 -168 0 -60 -240 360`,
      answerKey: `public static void multiplyBy(int[] numList, int multiplier) {
  for (int i = 0; i < numList.length; i++) {
    numList[i] = numList[i] * multiplier;
  }
}`,
      studentResponse: `public static void multiplyBy(int[] numList, int multiplier) {
  for (int i = 0; i < numList.length; i++) {
    numList[i] *= multiplier;
  }
}`,
      breakdown: {
        lge: 'fail',
        tsm: 0.987,
        kpm: 0.782,
        pqm: 0.672
      },
      overrideTriggered: true,
      finalResult: 'PASS',
      feedback: 'You passed both criteria. Your code correctly multiplies each element in the array by the multiplier, producing the expected output when tested. It uses the compound assignment operator (*=), which is semantically equivalent to the expected answer\'s explicit multiplication. All required elements are present and clear. Great job!',
      analysis: `- Demonstrates the value of the multi-module approach
- LGE (DeepSeek) incorrectly failed syntactically equivalent code
- KPM successfully identified semantic equivalence (0.782)
- TSM also scored very high (0.987), confirming similarity
- System correctly overrode false negative`,
      lesson: 'The KPM override mechanism is working as intended - catching valid alternative implementations that LGE might miss due to strict pattern matching.'
    },
    'Java Array Multiplication (Syntax Equivalence)'
  );
}

// Add more test cases here
async function addPolymorphismCase() {
  await logTestCase(
    {
      questionType: 'Short Answer',
      question: 'What is polymorphism in object-oriented programming? Provide an example to illustrate your explanation.',
      answerKey: 'Polymorphism is the ability of objects of different classes to respond to the same method call in different ways. It allows a single interface to represent different underlying forms (data types). For example, a Shape class might have a draw() method, and both Circle and Rectangle classes that inherit from Shape can implement draw() differently - Circle draws a circle while Rectangle draws a rectangle.',
      studentResponse: 'Polymorphism means that different objects can respond to the same message differently. Like if you have a Vehicle class with a move() method, a Car would drive on roads and a Boat would sail on water when you call move() on each one.',
      breakdown: {
        lge: 'pass',
        tsm: 0.889,
        kpm: 0.850,
        pqm: 0.920
      },
      overrideTriggered: false,
      finalResult: 'PASS',
      feedback: 'Excellent answer! You correctly defined polymorphism and provided a clear, relatable example with Vehicle, Car, and Boat. Your explanation demonstrates strong understanding of the concept.',
      analysis: `- Good test case for non-coding question grading
- Student used different example (Vehicle vs Shape) but concept is identical
- All modules scored high (TSM: 0.889, KPM: 0.850, PQM: 0.920)
- LGE correctly identified this as PASS without needing override`,
      lesson: 'When core concepts are understood and well-explained, all grading modules align and no override is needed.'
    },
    'Polymorphism Definition (Good Answer)'
  );
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Available test cases to add:');
    console.log('  1 - Java Array Multiplication');
    console.log('  2 - Polymorphism Definition');
    console.log('\nUsage: npm run add-test-case <number>');
    process.exit(0);
  }

  const caseNumber = args[0];

  try {
    switch (caseNumber) {
      case '1':
        await addArrayMultiplicationCase();
        break;
      case '2':
        await addPolymorphismCase();
        break;
      default:
        console.error(`Unknown test case: ${caseNumber}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Failed to add test case:', error);
    process.exit(1);
  }
}

main();
