const Q1_Variants = [
/* ===== FULL SCORE ===== */
`<p>The procedure starts at index 0 and checks each element in order. If the current value equals the target, it immediately returns that index. If the entire array is checked without finding the target, it returns -1.</p>`,
`<p>Beginning from the first element, the procedure compares each value to the target. When a match is found, it stops and returns the index. If no match is found, it returns -1.</p>`,
`<p>The array is scanned from left to right. Each element is compared to the target value, and the index of the first match is returned. If the target does not appear, -1 is returned.</p>`,
`<p>The procedure examines each array element sequentially. If an element matches the target, its index is returned immediately. Otherwise, the procedure returns -1 after checking all elements.</p>`,
`<p>The procedure loops through the array starting at the beginning. It returns the index when the target is first found or -1 if the target is not present.</p>`,
`<p>Starting at index 0, the procedure compares each element to the target. If a match occurs, the index is returned; if not, the procedure returns -1.</p>`,
`<p>The procedure performs a linear search through the array, returning the index of the first matching value or -1 if none exists.</p>`,
`<p>The array is checked one element at a time from start to finish. The procedure returns the index of the target when found, otherwise -1.</p>`,
`<p>The procedure searches the array in order and stops as soon as the target value is found, returning its index. If not found, it returns -1.</p>`,
`<p>The procedure compares each element in the array to the target until a match is found or the array ends, returning the index or -1.</p>`,

/* ===== MID SCORE ===== */
`<p>The procedure looks through the array to find the target value and returns its position.</p>`,
`<p>The array is checked to see if it contains the target and returns where it is.</p>`,
`<p>The procedure searches the array and gives back the index if it finds the value.</p>`,
`<p>The procedure checks each value and returns the index when it matches.</p>`,
`<p>The array is scanned for the target value and the index is returned.</p>`,
`<p>The procedure goes through the array and stops when it finds the target.</p>`,
`<p>The procedure compares values until it finds the target.</p>`,
`<p>The procedure searches the array for the target value.</p>`,
`<p>The array is checked for a match and returns the location.</p>`,
`<p>The procedure finds the target in the array if it exists.</p>`,

/* ===== LOW SCORE ===== */
`<p>The procedure sorts the array and then finds the target.</p>`,
`<p>The procedure counts how many times the target appears.</p>`,
`<p>The procedure checks if the array is equal to the target.</p>`,
`<p>The procedure removes the target from the array.</p>`,
`<p>The procedure finds the largest value in the array.</p>`,
`<p>The procedure loops forever until the target is found.</p>`,
`<p>The procedure compares the target to the whole array at once.</p>`,
`<p>The procedure returns the value of the target.</p>`,
`<p>The procedure checks only the last element.</p>`,
`<p>The procedure randomly checks elements.</p>`
];

const Q2_Variants = [
/* ===== FULL SCORE ===== */
`<p>The procedure first checks the length of the string. If the string has more than three characters, it reverses the order of the characters. Otherwise, it returns the original string unchanged.</p>`,
`<p>The algorithm determines whether the string length is greater than three. If it is, the characters are reversed. If not, the string is returned as is.</p>`,
`<p>The procedure checks the string length before doing anything. Only strings longer than three characters are reversed.</p>`,
`<p>The algorithm evaluates the number of characters. If the condition is met, it creates a reversed version of the string.</p>`,
`<p>The procedure checks the length of the string and reverses it only if it has more than three characters.</p>`,
`<p>The algorithm uses a condition to decide whether to reverse the string based on its length.</p>`,
`<p>The procedure first verifies the string length and then reverses it if it exceeds three characters.</p>`,
`<p>The algorithm checks the string size and applies reversal only when the condition is satisfied.</p>`,
`<p>The procedure ensures the string meets the length requirement before reversing it.</p>`,
`<p>The algorithm checks length first and reverses the string only if needed.</p>`,

/* ===== MID SCORE ===== */
`<p>The procedure reverses the string if it is long enough.</p>`,
`<p>The algorithm checks the string length and might reverse it.</p>`,
`<p>The procedure reverses strings that are bigger.</p>`,
`<p>The algorithm looks at how long the string is.</p>`,
`<p>The procedure sometimes reverses the string.</p>`,
`<p>The algorithm checks the string before reversing.</p>`,
`<p>The procedure reverses the string based on a condition.</p>`,
`<p>The algorithm decides whether to reverse the string.</p>`,
`<p>The procedure checks if the string is short or long.</p>`,
`<p>The algorithm handles short and long strings differently.</p>`,

/* ===== LOW SCORE ===== */
`<p>The procedure always reverses the string.</p>`,
`<p>The algorithm sorts the characters alphabetically.</p>`,
`<p>The procedure removes characters from the string.</p>`,
`<p>The algorithm checks if the string has numbers.</p>`,
`<p>The procedure prints the string backwards on the screen.</p>`,
`<p>The algorithm adds characters to the string.</p>`,
`<p>The procedure checks the first character only.</p>`,
`<p>The algorithm compares two strings.</p>`,
`<p>The procedure deletes the string.</p>`,
`<p>The algorithm changes the string to uppercase.</p>`
];

const Q3_Variants = [
/* ===== FULL SCORE ===== */
`<p>The procedure returns 8 because it adds 2 from 3→5 and 6 from 4→10, ignoring decreases.</p>`,
`<p>The output is 8 since only increases contribute to the total step count.</p>`,
`<p>The result is 8 because the procedure adds only positive differences.</p>`,
`<p>The procedure returns 8 by summing increases between consecutive elements.</p>`,
`<p>The total is 8 because decreases add zero.</p>`,
`<p>The output equals 8 due to two increases in the array.</p>`,
`<p>The procedure calculates 8 by ignoring decreases.</p>`,
`<p>The result is 8 from adding 2 and 6.</p>`,
`<p>The output is 8 because only upward changes are counted.</p>`,
`<p>The procedure returns 8 after summing valid increases.</p>`,

/* ===== MID SCORE ===== */
`<p>The procedure returns 8.</p>`,
`<p>The answer is 8 because the numbers go up.</p>`,
`<p>The total steps equal 8.</p>`,
`<p>The output is 8 from adding values.</p>`,
`<p>The procedure counts steps and gets 8.</p>`,
`<p>The result is 8 because some numbers increase.</p>`,
`<p>The procedure adds differences and gets 8.</p>`,
`<p>The final answer is 8.</p>`,
`<p>The total ends up being 8.</p>`,
`<p>The steps add up to 8.</p>`,

/* ===== LOW SCORE ===== */
`<p>The procedure returns 31.</p>`,
`<p>The answer is 9.</p>`,
`<p>The procedure counts all differences.</p>`,
`<p>The output is the largest number.</p>`,
`<p>The procedure subtracts values.</p>`,
`<p>The result is 0.</p>`,
`<p>The procedure returns the last value.</p>`,
`<p>The output is 10.</p>`,
`<p>The procedure averages the numbers.</p>`,
`<p>The result depends on the loop.</p>`
];

module.exports = {
	Q1_Variants,
	Q2_Variants,
	Q3_Variants,
};
