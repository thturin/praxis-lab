import { useState } from 'react';
import { ScoreDisplay } from './ScoreDisplay';
import Explanation from './Explanation';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { resolveImageSrcs } from './fetchImages';


const SingleQuestionEditor = ({ blockId, responses, setResponses, gradedResults, finalScore, block, showExplanations, isAdmin, sessionId, onScoreUpdated, onGradeSingle, gradingQuestionIds, gradingErrors }) => {
    const isScored = block.isScored;
    const isGrading = gradingQuestionIds?.has(blockId);
    const gradingError = gradingErrors?.[blockId];

    return(
        <>
        <ReactQuill
            theme="snow"
            value={resolveImageSrcs(responses[blockId] || '')}
            onChange={content => {
                setResponses(blockId, content);
            }}
            className="w-full mb-2"
            placeholder="Your answer..."
        />

        {isScored && onGradeSingle && (
            <button
                onClick={() => onGradeSingle(blockId)}
                disabled={isGrading}
                className={`mt-1 mb-2 px-3 py-1 text-sm rounded border border-orange-400 text-orange-700 bg-white hover:bg-orange-50 ${isGrading ? 'opacity-60 cursor-not-allowed' : ''}`}
                type="button"
            >
                {isGrading ? 'Grading...' : 'Grade'}
            </button>
        )}
        {gradingError && (
            <p className="text-red-600 text-sm mb-2">{gradingError}</p>
        )}

    { isScored &&
        <ScoreDisplay
                finalScore={finalScore}
                gradedResults={gradedResults}
                questionId={blockId}
                isAdmin={isAdmin}
                maxPoints={1}
                sessionId={sessionId}
                onScoreUpdated={onScoreUpdated}
            />
    }

    {showExplanations && (<Explanation content={block.explanation} />)}

    </>
    );
};

const SubQuestionEditor = ({ question, displayNumber, responses, setResponses, gradedResults, finalScore, showExplanations, isAdmin, sessionId, onScoreUpdated, onGradeSingle, gradingQuestionIds, gradingErrors }) => {
    const isScored = question.isScored;
    const isGrading = gradingQuestionIds?.has(question.id);
    const gradingError = gradingErrors?.[question.id];

    return (
        <div key={question.id} className="mb-4">
            <div className="font-semibold mb-1">
                {displayNumber && (
                    <span className="text-orange-700 mr-2">{displayNumber}.</span>
                )}
                <span dangerouslySetInnerHTML={{ __html: resolveImageSrcs(question.prompt) }} />
            </div>
            <ReactQuill
                theme="snow"
                value={resolveImageSrcs(responses[question.id] || '')}
                onChange={content => {
                    setResponses(question.id, content);
                }}
                className="w-full mb-2"
                placeholder="Your answer..."
            />
            {isScored && onGradeSingle && (
                <button
                    onClick={() => onGradeSingle(question.id)}
                    disabled={isGrading}
                    className={`mt-1 mb-2 px-3 py-1 text-sm rounded border border-orange-400 text-orange-700 bg-white hover:bg-orange-50 ${isGrading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    type="button"
                >
                    {isGrading ? 'Grading...' : 'Grade'}
                </button>
            )}
            {gradingError && (
                <p className="text-red-600 text-sm mb-2">{gradingError}</p>
            )}
            { isScored &&
            <ScoreDisplay
                    finalScore={finalScore}
                    gradedResults={gradedResults}
                    questionId={question.id}
                    isAdmin={isAdmin}
                    maxPoints={1}
                    sessionId={sessionId}
                    onScoreUpdated={onScoreUpdated}
                />
            }

            {showExplanations && (<Explanation content={question.explanation} />)}
        </div>
    );
};

const QuestionBlock = ({ block, displayNumber, displayNumbers, setResponses, responses, gradedResults, finalScore, showExplanations, isAdmin, sessionId, onScoreUpdated, onGradeSingle, gradingQuestionIds, gradingErrors }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mt-2 border border-orange-200 bg-orange-50 rounded-md overflow-hidden shadow-sm">
            {/* Collapsible Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-3 cursor-pointer hover:bg-orange-100 transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-orange-800">❓</span>
                    {displayNumber && (
                        <span className="text-orange-700 text-sm font-bold">Question {displayNumber}</span>
                    )}
                </div>
                <span className="text-orange-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4">
                    <div className="font-semibold mb-1">
                        {displayNumber && (
                            <span className="text-orange-700 mr-2">{displayNumber}.</span>
                        )}
                        <span dangerouslySetInnerHTML={{ __html: resolveImageSrcs(block.prompt) }} />
                    </div>
                    {block.subQuestions.length > 0 ? (
                        <div className="ml-4 border-l-2 pl-2">
                            {block.subQuestions.map((sq, j) => (
                                <SubQuestionEditor
                                    key={sq.id || j}
                                    question={sq}
                                    displayNumber={displayNumbers?.[sq.id]}
                                    responses={responses}
                                    setResponses={setResponses}
                                    gradedResults={gradedResults}
                                    finalScore={finalScore}
                                    showExplanations={showExplanations}
                                    isAdmin={isAdmin}
                                    sessionId={sessionId}
                                    onScoreUpdated={onScoreUpdated}
                                    onGradeSingle={onGradeSingle}
                                    gradingQuestionIds={gradingQuestionIds}
                                    gradingErrors={gradingErrors}
                                />
                            ))}
                        </div>
                    ) : (
                        <SingleQuestionEditor
                            blockId={block.id}
                            responses={responses}
                            setResponses={setResponses}
                            gradedResults={gradedResults}
                            finalScore={finalScore}
                            block={block}
                            showExplanations={showExplanations}
                            isAdmin={isAdmin}
                            sessionId={sessionId}
                            onScoreUpdated={onScoreUpdated}
                            onGradeSingle={onGradeSingle}
                            gradingQuestionIds={gradingQuestionIds}
                            gradingErrors={gradingErrors}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default QuestionBlock;


// React-Quill Fix Explanation
// We fixed the typing issue in the QuestionBlock component by following React's best practices for component organization. Here are the key changes we made:

// Moved Editor Components to Top Level

// Previously, components were defined inside the render method
// This caused React to recreate them on every render
// Moving them outside prevents unnecessary recreation
// QuestionBlock (Parent)
// ├── SingleQuestionEditor (Top Level)
// └── SubQuestionEditor (Top Level)
//Before problematic
// const QuestionBlock = ({ block, ...props }) => {
//     // 🔴 BAD: Component defined inside another component
//     const SingleQuestion = () => (
//         <ReactQuill ... />
//     );
    
//     return <SingleQuestion />;
// };
//After GOOD
// ✅ GOOD: Components defined at top level
// const SingleQuestionEditor = ({ blockId, ...props }) => (
//     <ReactQuill ... />
// );

// const QuestionBlock = ({ block, ...props }) => {
//     return <SingleQuestionEditor ... />;
// };
