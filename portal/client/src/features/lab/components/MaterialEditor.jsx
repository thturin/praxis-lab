import { useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { getImageUrlsFromHtml } from './fetchImages';


function MaterialEditor({ block, onMaterialChange, onMaterialDelete }) {
    const quillRef = useRef();
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
        <div className="p-4 border rounded mb-4 bg-white shadow">
            <ReactQuill
                ref={quillRef}
                placeholder="Paste image or write here"
                className="w-full border p-2 mb-2"
                value={getImageUrlsFromHtml(block.content)}
                // onChange handler doesn't receive a DOM event object, gives you content value directly
                //in other words, you dont need to use e=>e.target.value
                onChange={value => {
                    update("content", value);
                }}
                modules={modules}
                theme="snow"
            />

            {/* <div className="mt-2 p-2 border bg-gray-50"
                dangerouslySetInnerHTML={{ __html: block.content }} /> */}

            <button
                onClick={onMaterialDelete}
                className="bg-red-600 text-white px-2 py-1 rounded ml-2"
            >
                Delete
            </button>
        </div>
    )
};


export default MaterialEditor;