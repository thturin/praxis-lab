// import { useState, useRef, useEffect } from "react";
import { createQuestion } from "../models/block";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { getImageUrlsFromHtml } from './fetchImages';


function QuestionEditor({ q, onQuestionChange, onQuestionDelete, level = 0 }) {
    //onChange passed down from the parent so everything stays in sync
    //INFINITE LOOP OCCURRING EVERY KEYSTROKE TRIGGERS ONCHANGE
    //DO NOT UPDATE IF VALUE HASN'T CHANGED
    const update = (field, value) => {
        //ONCHANGE CREATES A NEW QUESTION OBJECT WITH UQPDATED FIELD  VALUE
        if (q[field] !== value) {
            onQuestionChange({ ...q, [field]: value }); //field is the placeholder for any property
            //properties of questionBlock blockType, type, prompt, desc
        }
    };


    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            ['code-block'],
            ['clean'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ]
    }
    //DISPLAY PROMPT TEXT BOX
    return (
        <div className="p-4 border rounded mb-4 bg-white shadow">
            <div className="flex items-start gap-4">
                <div className="flex-1">
                    <ReactQuill
                        type="text"
                        placeholder="Prompt"
                        className="w-full border p-2 mb-2"
                        value={getImageUrlsFromHtml(q.prompt)}
                        rows={3}
                        onChange={(value) => {
                            if (value !== q.prompt) { //do not update if value hasn't changed
                                update("prompt", value)
                            }
                        }}
                        theme="snow"
                    />
                </div>

                {/*DISPLAY ANSWER KEY AND EXPLANATION.  If q has subquestions, don't render*/}
                {q.subQuestions.length === 0 && (
                    <div className="w-64">
                        <label className="block font-semibold mb-1">Answer Key</label>
                        <ReactQuill
                            placeholder="Admin Key"
                            className="w-full border mb-2"
                            value={q.key || ""} //will never have pictures
                            onChange={value => update("key", value)}
                            modules={modules}
                            theme="snow"
                        />
                        <label className="block font-semibold mb-1">Explanation</label>
                        <ReactQuill
                            placeholder="Explanation for Student"
                            className="w-full border mb-2"
                            value={getImageUrlsFromHtml(q.explanation) || ""}
                            onChange={value => update("explanation", value)}
                            modules={modules}
                            theme="snow"
                        />
                    </div>
                )}

            </div>

            {/* DISPLAY SUB QUESTIONS */}
            {q.subQuestions && q.subQuestions.length > 0 && (
                <div className="ml-4 border-l-2 pl-2">
                    {q.subQuestions.map((sq, i) => (
                        <QuestionEditor
                            key={sq.id}
                            q={sq}
                            level={level + 1}
                            onQuestionChange={
                                //pass the updated Sub Q from child to parent in
                                //updatedSubQ
                                updatedSubQ => {
                                    const updatedSubs = q.subQuestions.map((sub, idx) =>
                                        idx === i ? updatedSubQ : sub
                                    );
                                    // Call parent's onQuestionChange to update the parent question
                                    onQuestionChange({ ...q, subQuestions: updatedSubs });
                                }}
                            onQuestionDelete={() => {
                                //filter everything but the q to delete
                                const updatedSubs = q.subQuestions.filter((_, idx) => idx !== i);
                                onQuestionChange({ ...q, subQuestions: updatedSubs });
                            }}
                        />
                    ))}
                </div>
            )}

            {/* TYPE OF ANSWER CHOICE */}
            <select
                className="border p-2"
                value={q.type}
                onChange={(e) => update("type", e.target.value)}
            >
                <option value="short">Short Answer</option>
                <option value="textarea">Paragraph</option>
                <option value="code">Code Response</option>
            </select>
            {/* ADD SUB QUESTION BUTTON */}

            {level === 0 && (
                <button
                    onClick={() => {
                        const nextIndex = (q.subQuestions?.length || 0);
                        const nextLetter = String.fromCharCode(97 + nextIndex); //97=a
                        const newSubQ = createQuestion();
                        newSubQ.prompt = `${nextLetter}.`;
                        const updatedSubs = [...(q.subQuestions || []), newSubQ];

                        onQuestionChange({ //updaste current question with new sub questions and since there are sub q's make the isScored for parent q false
                            ...q,
                            subQuestions:updatedSubs,
                            isScored:false
                        });
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    Add Sub Question
                </button>

            )}


            {/* DELETE BUTTON  */}
            <button
                onClick={onQuestionDelete}
                className="bg-red-600 text-white px-2 py-1 rounded ml-2"
            >
                Delete
            </button>


            {/* SCORE CHECK BOX */
                //if there are no sub questions and we are at level 0 
                // OR it is a sub question (level == 1) -> SHOW THE isScored button 
            }
            {((level === 0 && q.subQuestions.length === 0) || level === 1) && (
                <label className="flex items-center cursor-pointer p-2 border rounded bg-white hover:bg-gray-50">
                    <input
                        type="checkbox"
                        checked={q.isScored ?? true} // Default to true if undefined
                        onChange={(e) => update("isScored", e.target.checked)}
                        className="mr-2 w-4 h-4"
                    />
                    <span className="font-semibold text-sm">Include in Score</span>
                </label>

            )}

        </div>
    );
}

export default QuestionEditor;