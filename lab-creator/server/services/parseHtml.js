const { parse } = require('dotenv');
const { JSDOM } = require('jsdom');

const parseCodeFromHtml = (htmlContent) => {
    // Create a JSDOM instance
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;

    // Extract text from all <p> tags
    //  HTMLParagraphElement {}, HTMLParagraphElement {}, HTMLParagraphElement {},
    const paragraphs = Array.from(doc.querySelectorAll('p'));

    //extract text content from each paragraph and join with new line
    let code = paragraphs.map(p => p.textContent).join('\n');

    // Sanitize: replace non-breaking spaces and other problematic Unicode characters
    //these characters are created by the &nbsp; and similar html entities that are removed by JSDOM
    code = code
        .replace(/\u00A0/g, ' ')      // non-breaking space (from &nbsp;)
        .replace(/\u2003/g, ' ')      // em space
        .replace(/\u2002/g, ' ')      // en space
        .replace(/\u200B/g, '')       // zero-width space
        .replace(/\uFEFF/g, '');      // BOM

    // Replace the class name with "Solution"
    // Matches: public class ClassName {
    code = code.replace(/public\s+class\s+\w+\s*\{/, 'public class Solution {');

    //replace any constructor names with Solution
    // Matches: public ClassName(
    code = code.replace(/public\s+\w+\s*\(/, 'public Solution(');

    // console.log('Parsed code:');
    // console.log(code);
    return code;
};

// Test with example HTML
const testHtml = '<p>public class ActivityTracker {</p><p>&nbsp;&nbsp;private int targetGoal;</p><p>&nbsp;&nbsp;private int totalMinutes;</p><p>&nbsp;&nbsp;private int sessions;</p><p>&nbsp;&nbsp;private int maxMinutes;</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Constructor</p><p>&nbsp;&nbsp;public ActivityTracker(int targetGoal) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;this.targetGoal = targetGoal;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;totalMinutes = 0;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;sessions = 0;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;maxMinutes = 0;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns the target goal</p><p>&nbsp;&nbsp;public int getTargetGoal() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return targetGoal;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Logs minutes of activity</p><p>&nbsp;&nbsp;public void logMinutes(int minutes) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;totalMinutes = totalMinutes + minutes;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;sessions++;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;// Bug: This logic is incorrect - should compare with maxMinutes</p><p>&nbsp;&nbsp;&nbsp;&nbsp;if (minutes &gt; totalMinutes) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;maxMinutes = minutes;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns number of sessions logged</p><p>&nbsp;&nbsp;public int getSessions() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return sessions;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns total minutes logged</p><p>&nbsp;&nbsp;public int getTotalMinutes() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return totalMinutes;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns the maximum minutes in a single session</p><p>&nbsp;&nbsp;public int getMaxMinutes() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return maxMinutes;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Checks if goal has been achieved</p><p>&nbsp;&nbsp;public boolean goalAchieved() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;if (totalMinutes &gt;= targetGoal) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return true;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;} else {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return false;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;}</p><p>}</p><p><br></p>';

module.exports = { parseCodeFromHtml };