import { useState } from 'react';
import { resolveImageSrcs } from './fetchImages';

export default function Explanation({ content }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!content) return null;

    return (
        <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 text-sm text-sky-900 shadow-[0_1px_0_rgba(12,74,110,0.05)] overflow-hidden">
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-2 cursor-pointer hover:bg-sky-100 transition-colors"
            >
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
                    <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                    Explanation
                    <span className="ml-2 text-sky-600">
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </div>
            </div>
            {isExpanded && (
                <div
                    className="px-3 pb-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: resolveImageSrcs(content) }}
                />
            )}
        </div>
    );
}
