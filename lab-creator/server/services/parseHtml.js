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
    const classNameMatch = code.match(/public\s+class\s+(\w+)\s*\{/);
    const originalClassName = classNameMatch ? classNameMatch[1] : null;

    code = code.replace(/public\s+class\s+\w+\s*\{/, 'public class Solution {');

    // If we found an original class name, replace all instances
    //REPLACE CONSTRUCTOR METHOD AND CONSTRUCTOR INSTANCES
    //PUBLIC CLASS ActivityTracker { -> PUBLIC CLASS Solution {
    //ActivityTracker tracker = new ActivityTracker(120); -> Solution tracker = new Solution(120);
    if (originalClassName && originalClassName !== 'Solution') {
        // Replace constructor declarations: public ClassName(
        code = code.replace(new RegExp(`public\\s+${originalClassName}\\s*\\(`, 'g'), 'public Solution(');

        // Replace instantiation: new ClassName(
        code = code.replace(new RegExp(`new\\s+${originalClassName}\\s*\\(`, 'g'), 'new Solution(');

        // Replace variable type declarations: ClassName varName =
        // This handles cases like: EnhancedArray a = new Solution(0);
        code = code.replace(new RegExp(`\\b${originalClassName}\\s+\\w+\\s*=`, 'g'), (match) => {
            return match.replace(originalClassName, 'Solution');
        });
    }

    // console.log('Parsed code:');
    // console.log(code);
    return code;
};

const parseTextFromHtml = (htmlContent) => {
    // Create a JSDOM instance
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;

    // Extract text from all <p> tags
    const paragraphs = Array.from(doc.querySelectorAll('p'));
    
    //extract text content from each paragraph and join with new line
    let text = paragraphs.map(p => p.textContent).join('\n');
    text=text.replace(/\u00A0/g, ' ')      // non-breaking space (from &nbsp;)
        .replace(/\u2003/g, ' ')      // em space
        .replace(/\u2002/g, ' ')      // en space
        .replace(/\u200B/g, '')       // zero-width space
        .replace(/\uFEFF/g, '');      // BOM
    return text;
};

// Test with example HTML
//const testHtml = '<p>public class ActivityTracker {</p><p>&nbsp;&nbsp;private int targetGoal;</p><p>&nbsp;&nbsp;private int totalMinutes;</p><p>&nbsp;&nbsp;private int sessions;</p><p>&nbsp;&nbsp;private int maxMinutes;</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Constructor</p><p>&nbsp;&nbsp;public ActivityTracker(int targetGoal) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;this.targetGoal = targetGoal;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;totalMinutes = 0;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;sessions = 0;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;maxMinutes = 0;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns the target goal</p><p>&nbsp;&nbsp;public int getTargetGoal() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return targetGoal;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Logs minutes of activity</p><p>&nbsp;&nbsp;public void logMinutes(int minutes) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;totalMinutes = totalMinutes + minutes;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;sessions++;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;// Bug: This logic is incorrect - should compare with maxMinutes</p><p>&nbsp;&nbsp;&nbsp;&nbsp;if (minutes &gt; totalMinutes) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;maxMinutes = minutes;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns number of sessions logged</p><p>&nbsp;&nbsp;public int getSessions() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return sessions;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns total minutes logged</p><p>&nbsp;&nbsp;public int getTotalMinutes() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return totalMinutes;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Returns the maximum minutes in a single session</p><p>&nbsp;&nbsp;public int getMaxMinutes() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return maxMinutes;</p><p>&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;&nbsp;</p><p>&nbsp;&nbsp;// Checks if goal has been achieved</p><p>&nbsp;&nbsp;public boolean goalAchieved() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;if (totalMinutes &gt;= targetGoal) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return true;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;} else {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return false;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;}</p><p>}</p><p><br></p>';
//const testHtml = '<p>Here is the sample solution. Student response doesn't have to be identical.</p><p>public class ActivityTracker {</p><p>&nbsp;&nbsp;private int targetGoal;</p><p>&nbsp;&nbsp;private int totalMinutes;</p><p>&nbsp;&nbsp;private int sessions;</p><p>&nbsp;&nbsp;private int maxMinutes;</p><p><br></p><p>&nbsp;&nbsp;public ActivityTracker(int targetGoal) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;this.targetGoal = targetGoal;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;totalMinutes = 0; // default value</p><p>&nbsp;&nbsp;&nbsp;&nbsp;sessions = 0; // default value</p><p>&nbsp;&nbsp;&nbsp;&nbsp;maxMinutes = 0; // default value</p><p>&nbsp;&nbsp;}</p><p><br></p><p>&nbsp;&nbsp;public int getTotalMinutes() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return totalMinutes;</p><p>&nbsp;&nbsp;}</p><p><br></p><p>&nbsp;&nbsp;public int getSessions() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return sessions;</p><p>&nbsp;&nbsp;}</p><p><br></p><p>&nbsp;&nbsp;public int getMaxMinutes() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return maxMinutes;</p><p>&nbsp;&nbsp;}</p><p><br></p><p>&nbsp;&nbsp;public void logMinutes(int minutes) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;totalMinutes += minutes;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;sessions++;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;if (minutes &gt; maxMinutes) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;maxMinutes = minutes;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;}</p><p><br></p><p>&nbsp;&nbsp;public boolean goalAchieved() {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;return (totalMinutes &gt;= targetGoal);</p><p><br></p><p>&nbsp;&nbsp;&nbsp;&nbsp;// or:&nbsp;if (totalMinutes &gt;= targetGoal) {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return true;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;} else {</p><p>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return false;</p><p>&nbsp;&nbsp;&nbsp;&nbsp;//&nbsp;&nbsp;&nbsp;}</p><p>&nbsp;&nbsp;}</p><p>}</p><p><br></p><p>Run the tests below against the answer key and student's solution</p><p><span style=\\\"background-color: transparent;\\\">public class Main {</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;public static void main(String[] args) {</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;// target goal of 120 minutes of activity</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;ActivityTracker tracker = new ActivityTracker(120);</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;int total = tracker.getTotalMinutes();</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;System.out.println(total);</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;int sessions = tracker.getSessions();</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;System.out.println(sessions);</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;int maxMinTracked = tracker.getMaxMinutes();</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;System.out.println(maxMinTracked);</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;boolean goalMet = tracker.goalAchieved();</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;&nbsp;&nbsp;System.out.println(goalMet);</span></p><p><span style=\\\"background-color: transparent;\\\">&nbsp;&nbsp;}</span></p><p><span style=\\\"background-color: transparent;\\\">}</span></p>';

//console.log(parseTextFromHtml(testHtml));

module.exports = { parseTextFromHtml, parseCodeFromHtml };