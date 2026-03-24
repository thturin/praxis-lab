import streamlit as st
import re
def generate_display_numbers(blocks):
    """
    Generate display numbers for questions (1, 2, 3, 1a, 1b, 1c)
    Same logic as frontend questionNumbers.ts
    """
    display_map = {}
    question_index = 0
    

    for block in blocks:
        # st.write(block)
        if block.get('blockType') == 'question':
            question_index += 1
            display_map[block['id']] = str(question_index)
            
            # Handle sub-questions
            #if there are no sub-questions -> []
            sub_questions = block.get('subQuestions', []) 
            for sub_idx, sub_q in enumerate(sub_questions):
                letter = chr(97 + sub_idx)  # 97 = 'a'
                display_map[sub_q['id']] = f"{question_index}{letter}"
    
    return display_map


def natural_sort_key(x):
    match = re.match(r'(\d+)([a-z]?)', str(x))
    if match:
        return (int(match.group(1)), match.group(2))
    return (0, '')