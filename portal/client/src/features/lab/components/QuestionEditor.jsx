import { useState } from "react";
import { createQuestion } from "../models/block";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { resolveImageSrcs } from './fetchImages';
import ImageTextBox from './ImageTextBox';
import axios from 'axios';


function QuestionEditor({ q, onQuestionChange, onQuestionDelete, level = 0 }) {
    const [showAnswerKey, setShowAnswerKey] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [showJavaGenerateTestCodeExpansion, setShowJavaGenerateTestCodeExpansion] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const showJavaGenerateTestCode = q.type === 'code';
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
        <div className="mb-4 border border-orange-200 bg-orange-50 rounded-md overflow-hidden shadow">
            {/* Collapsible Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-3 cursor-pointer hover:bg-orange-100 transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-orange-800">
                        {level === 0 ? '❓ Question Block' : '❓ Sub Question'}
                    </span>
                </div>
                <span className="text-orange-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <ReactQuill
                                type="text"
                                placeholder="Prompt"
                                className="w-full border p-2 mb-2"
                                value={resolveImageSrcs(q.prompt)}
                                rows={3}
                                onChange={(value) => {
                                    if (value !== q.prompt) { //do not update if value hasn't changed
                                        update("prompt", value)
                                    }
                                }}
                                theme="snow"
                            />
                            {q.prompt && q.prompt.includes('<img') && (
                                <ImageTextBox
                                    htmlContent={q.prompt}
                                    imageText={q.imageText || ""}
                                    onChange={(text) => update("imageText", text)}
                                />
                            )}
                        </div>

                        {/*DISPLAY ANSWER KEY AND EXPLANATION.  If q has subquestions, don't render*/}
                        {q.subQuestions.length === 0 && (
                            <div className="w-64">
                                {/* Answer Key - Collapsible */}
                                <div className="mb-3 border border-green-200 bg-green-50 rounded-md overflow-hidden">
                                    <div
                                        onClick={() => setShowAnswerKey(!showAnswerKey)}
                                        className="px-3 py-2 cursor-pointer hover:bg-green-100 transition-colors flex items-center justify-between"
                                    >
                                        <span className="font-semibold text-sm text-green-800">Answer Key</span>
                                        <span className="text-green-600 text-xs">
                                            {showAnswerKey ? '▼' : '▶'}
                                        </span>
                                    </div>
                                    {showAnswerKey && (
                                        <div className="px-2 pb-2">
                                            <ReactQuill
                                                placeholder="Admin Key"
                                                className="w-full border mb-2"
                                                value={q.key || ""}
                                                onChange={value => update("key", value)}
                                                modules={modules}
                                                theme="snow"
                                            />
                                            {q.key && q.key.includes('<img') && (
                                                <ImageTextBox
                                                    htmlContent={q.key}
                                                    imageText={q.keyImageText || ""}
                                                    onChange={(text) => update("keyImageText", text)}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Explanation - Collapsible */}
                                <div className="mb-2 border border-sky-200 bg-sky-50 rounded-md overflow-hidden">
                                    <div
                                        onClick={() => setShowExplanation(!showExplanation)}
                                        className="px-3 py-2 cursor-pointer hover:bg-sky-100 transition-colors flex items-center justify-between"
                                    >
                                        <span className="font-semibold text-sm text-sky-800">Explanation</span>
                                        <span className="text-sky-600 text-xs">
                                            {showExplanation ? '▼' : '▶'}
                                        </span>
                                    </div>
                                    {showExplanation && (
                                        <div className="px-2 pb-2">
                                            <ReactQuill
                                                placeholder="Explanation for Student"
                                                className="w-full border mb-2"
                                                value={resolveImageSrcs(q.explanation) || ""}
                                                onChange={value => update("explanation", value)}
                                                modules={modules}
                                                theme="snow"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Java Test Code Generator - Only show for code type questions */}
                                {showJavaGenerateTestCode && (
                                    <div className="mb-2 border border-purple-200 bg-purple-50 rounded-md overflow-hidden">
                                        <div
                                            onClick={() => setShowJavaGenerateTestCodeExpansion(!showJavaGenerateTestCodeExpansion)}
                                            className="px-3 py-2 cursor-pointer hover:bg-purple-100 transition-colors flex items-center justify-between"
                                        >
                                            <span className="font-semibold text-sm text-purple-800">Generated Test Code</span>
                                            <span className="text-purple-600 text-xs">
                                                {showJavaGenerateTestCodeExpansion ? '▼' : '▶'}
                                            </span>
                                        </div>
                                        {showJavaGenerateTestCodeExpansion && (
                                            <div className="px-2 pb-2">
                                                <button
                                                    onClick={async () => {
                                                        try{
                                                            console.log('Generating test code for question:', q.prompt);
                                                            //call API to generate test code
                                                            const response = await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/grade/java/generate-tests`, {
                                                                problemDescription: q.prompt || '',
                                                                answerKey: q.key || '',
                                                                imageText: q.imageText || ''
                                                            });
                                                            //update question with generated test code in question block
                                                            update("generatedTestCode", response.data.testCode);
                                                        } catch (error) {
                                                            console.error('Error generating test code:', error);
                                                        }
                                                    }}
                                                    className="bg-purple-600 text-white px-4 py-2 rounded mb-2 w-full hover:bg-purple-700"
                                                >
                                                    Generate Java Test Code
                                                </button>
                                                <textarea
                                                    placeholder="Generated test code will appear here..."
                                                    className="w-full border p-2 font-mono text-sm"
                                                    value={q.generatedTestCode || ""}
                                                    onChange={(e) => update("generatedTestCode", e.target.value)}
                                                    rows={10}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
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
                        onChange={(e) => {
                            //show button to generate test code only if type is code
                            return update("type", e.target.value)}}
                    >
                        <option value="short">Short Answer</option>
                        <option value="textarea">Paragraph</option>
                        <option value="code">Java</option>
                    </select>
                    {/* ADD SUB QUESTION BUTTON */}

                    {level === 0 && (
                        <button
                            onClick={() => {
                                const newSubQ = createQuestion();
                                // No need to set prompt prefix - display numbers handle this automatically
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
            )}

        </div>
    );
}

export default QuestionEditor;