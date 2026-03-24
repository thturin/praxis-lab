import React, { useState } from 'react';
import axios from 'axios';

const ScoreOverride = ({ sessionId, questionId, currentScore, maxPoints = 1, onScoreUpdated }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(currentScore?.toString() || '0');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleEdit = () => {
        setEditValue(currentScore?.toString() || '0');
        setError('');
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditValue(currentScore?.toString() || '0');
        setError('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        const numValue = parseFloat(editValue);
        
        // Validation
        if (isNaN(numValue)) {
            setError('Score must be a number');
            return;
        }
        if (numValue < 0) {
            setError('Score cannot be negative');
            return;
        }
        if (numValue > maxPoints) {
            setError(`Score cannot exceed ${maxPoints}`);
            return;
        }

        try {
            const response = await axios.put(`${process.env.REACT_APP_API_LAB_HOST}/session/override-score/sessionId/${sessionId}`, {
                questionId,
                score: numValue
            });
            
            if (onScoreUpdated && response.data) {
                const { gradedResults, finalScore } = response.data;
                onScoreUpdated({ gradedResults, finalScore });
            }
        } catch (err) {
            console.error('Error saving score override', err);
            setError('Failed to save score override');
            return;
        }
        
        setIsEditing(false);
        setError('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
    };


    if (!isEditing) {
        return (
            <span className="ml-2 inline-flex items-center gap-1">
                <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 hover:underline"
                    title="Override score"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                    Edit
                </button>
                {success && <span className="text-xs text-green-600">✓ Saved</span>}
            </span>
        );
    }

    return (
        <div className="mt-2 inline-flex items-center gap-2">
            <input
                type="number"
                step="0.01"
                min="0"
                max={maxPoints}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
            />
            <span className="text-xs text-gray-600">/ {maxPoints}</span>
            <button
                onClick={handleSave}
                className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
                Save
            </button>
            <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
                Cancel
            </button>
            {error && (
                <span className="text-xs text-red-600">{error}</span>
            )}
        </div>
    );
};

export default ScoreOverride;
