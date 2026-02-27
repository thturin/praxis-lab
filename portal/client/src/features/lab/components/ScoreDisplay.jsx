import React from 'react';
import ReactMarkdown from 'react-markdown';
import ScoreOverride from './ScoreOverride';

const ScoreDisplay = ({ sessionId, finalScore, gradedResults, questionId, isAdmin, maxPoints = 1, onScoreUpdated }) => {
    //no finalResults means no submissions. Do not show score and feedback
    if(!finalScore) return null;

    let result = gradedResults[questionId];
    if(!result){
        result = {
            score:0,
            feedback: "no response"
        };
    }

    return (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-[0_1px_0_rgba(16,185,129,0.08)]">
            <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Score & Feedback
            </div>
            <div className="leading-snug">
                <span className="font-semibold">Score:</span> {result?.score}
                {isAdmin && (
                    <ScoreOverride
                        sessionId={sessionId}
                        questionId={questionId}
                        currentScore={result?.score}
                        maxPoints={maxPoints}
                        onScoreUpdated={onScoreUpdated}
                    />
                )}
            </div>
            <div className="leading-snug">
                <span className="font-semibold">Feedback:</span>
                <ReactMarkdown className="prose prose-sm max-w-none mt-1">{result?.feedback}</ReactMarkdown>
            </div>
        </div>
    );
}

export default ScoreDisplay;
