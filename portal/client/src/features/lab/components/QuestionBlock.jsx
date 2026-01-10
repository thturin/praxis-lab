import { useState } from 'react';
import ScoreDisplay from './ScoreDisplay';
import Explanation from './Explanation';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getImageUrlsFromHtml } from './fetchImages';


const SingleQuestionEditor = ({ blockId, responses, setResponses, gradedResults, finalScore, block, showExplanations, isAdmin, sessionId, onScoreUpdated }) => {
    const isScored = block.isScored;
    //const showExplanation = !isScored || hasGradedResultForBlock(block, gradedResults);
    
    return(
        <>
        <ReactQuill
            theme="snow"
            value={responses[blockId] || ''}
            onChange={content => {
                setResponses(blockId, content);
            }}
            className="w-full mb-2"
            placeholder="Your answer..."
        />

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

const SubQuestionEditor = ({ question, responses, setResponses, gradedResults, finalScore, showExplanations, isAdmin, sessionId, onScoreUpdated }) => {
    const isScored = question.isScored;
    //const showExplanation = !isScored || hasGradedResultForBlock(question, gradedResults);

    return (
        <div key={question.id} className="mb-4">
            <div 
                className="font-semibold mb-1" 
                dangerouslySetInnerHTML={{ __html: getImageUrlsFromHtml(question.prompt) }} 
            />
            <ReactQuill
                theme="snow"
                value={responses[question.id] || ''}
                onChange={content => {
                    setResponses(question.id, content);
                }}
                className="w-full mb-2"
                placeholder="Your answer..."
            />
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

const QuestionBlock = ({ block, setResponses, responses, gradedResults, finalScore, showExplanations, isAdmin, sessionId, onScoreUpdated }) => {
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
                </div>
                <span className="text-orange-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4">
                    <div
                        className="font-semibold mb-1"
                        dangerouslySetInnerHTML={{ __html: getImageUrlsFromHtml(block.prompt) }}
                    />
                    {block.subQuestions.length > 0 ? (
                        <div className="ml-4 border-l-2 pl-2">
                            {block.subQuestions.map((sq, j) => (
                                <SubQuestionEditor
                                    key={sq.id || j}
                                    question={sq}
                                    responses={responses}
                                    setResponses={setResponses}
                                    gradedResults={gradedResults}
                                    finalScore={finalScore}
                                    showExplanations={showExplanations}
                                    isAdmin={isAdmin}
                                    sessionId={sessionId}
                                    onScoreUpdated={onScoreUpdated}
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
