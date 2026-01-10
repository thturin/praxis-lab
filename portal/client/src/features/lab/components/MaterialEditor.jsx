import { useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { getImageUrlsFromHtml } from './fetchImages';


function MaterialEditor({ block, onMaterialChange, onMaterialDelete }) {
    const quillRef = useRef();
    const [isExpanded, setIsExpanded] = useState(true);

    const update = (field, value) => {
        //ONCHANGE CREATES A NEW BLOCK OBJECT WITH UPDATED FIELD AND TYPE VALUES 
        //only update if value actually changed
        if (block[field] !== value) {
            let updatedBlock = { ...block, [field]: value };
            onMaterialChange(updatedBlock);
            //text image block properties blockType, type, content, images
        }
    };

    const modules = {
        toolbar: [
             ['bold', 'italic', 'underline'],
            ['code-block'],
            ['clean'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ]
    };


    return (
        <div className="mb-4 border border-purple-200 bg-purple-50 rounded-md overflow-hidden shadow">
            {/* Collapsible Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-4 py-3 cursor-pointer hover:bg-purple-100 transition-colors flex items-center justify-between"
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-purple-800">💡 Material Block</span>
                </div>
                <span className="text-purple-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4">
                    <ReactQuill
                        ref={quillRef}
                        placeholder="Paste image or write here"
                        className="w-full border p-2 mb-2"
                        value={getImageUrlsFromHtml(block.content)}
                        onChange={value => {
                            update("content", value);
                        }}
                        modules={modules}
                        theme="snow"
                    />

                    <button
                        onClick={onMaterialDelete}
                        className="bg-red-600 text-white px-2 py-1 rounded ml-2"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    )
};


export default MaterialEditor;