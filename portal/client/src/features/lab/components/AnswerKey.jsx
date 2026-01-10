import { useState } from 'react';
import { getImageUrlsFromHtml } from './fetchImages';

export default function AnswerKey({ content }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!content) return null;

    return (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-900 shadow-[0_1px_0_rgba(21,128,61,0.05)] overflow-hidden">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-2 cursor-pointer hover:bg-green-100 transition-colors"
            >
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-800">
                    <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                    Answer Key
                    <span className="ml-2 text-green-600">
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </div>
            </div>
            {isExpanded && (
                <div
                    className="px-3 pb-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: getImageUrlsFromHtml(content) }}
                />
            )}
        </div>
    );
}
