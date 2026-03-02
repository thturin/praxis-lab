import { useState } from 'react';
import { resolveImageSrcs } from './fetchImages';

const MaterialBlock = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mt-2 border border-purple-200 bg-purple-50 rounded-md overflow-hidden shadow-sm">
            {/* Collapsible Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-3 cursor-pointer hover:bg-purple-100 transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-purple-800">💡</span>
                </div>
                <span className="text-purple-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div
                    className="px-4 pb-4 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: resolveImageSrcs(content) }}
                />
            )}
        </div>
    );
}

export default MaterialBlock;
