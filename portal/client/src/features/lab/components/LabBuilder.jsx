import { useEffect, useCallback } from "react";
import { createQuestion, createMaterial } from "../models/block";
import QuestionEditor from "./QuestionEditor";
import MaterialEditor from "./MaterialEditor";
import "react-quill/dist/quill.snow.css";
import "../styles/Lab.css";
import axios from "axios";
import { inlineImagesAsDataUrls } from "../utils/imageUtils";
import { generateDisplayNumbers } from "../utils/questionNumbers";


function LabBuilder({ blocks, setBlocks, 
    title, setTitle, 
    assignmentId, 
    setAiPrompt,aiPrompt, handleAiPromptChange }) {

        //memoized, oinly rerun if props change
    const loadLab = useCallback(async () => {

        try {
            //search for the lab by the assignment Id
            const response = await axios.get(`${process.env.REACT_APP_API_LAB_HOST}/lab/load-lab`, {
                params: { assignmentId, title: title || 'Untitled' }
            });
            console.log('lab loaded! ', response.data);
            setTitle(response.data.title);
            setBlocks(response.data.blocks);
            setAiPrompt(response.data.aiPrompt);
        } catch (err) {
            console.error('Lab did not load from labController successfully', err.message);
        }
    }, [assignmentId, title, setTitle, setBlocks, setAiPrompt]);

    //loadlab   
    useEffect(() => {
        loadLab();
    }, [loadLab]);


    const deleteBlock = (id) => {
        setBlocks(blocks.filter(b => b.id !== id)); //remove block with id
    }

    const addMaterialBlock = () => { //type can be text, or image?
        console.log('eee');
        setBlocks([
            ...blocks,
            createMaterial()
        ]);
    }

    const addQuestionBlock = () => {
        setBlocks([
            ...blocks,
            createQuestion()
        ]);
    };

    //update block from child component 
    const updateBlock = (id, updated) => {
        //replace old block with new block
        setBlocks(blocks.map((b) => (b.id === id ? updated : b)));
    };

    const moveBlock = (from, to) => {
        if (to < 0 || to > blocks.length - 1) return;
        const updatedBlocks = [...blocks];
        //remove block is moving
        const [moveBlock] = updatedBlocks.splice(from, 1);
        //you could also do moveBlock= and then call moveBlock[0]
        //move moveBlock to "to" index
        updatedBlocks.splice(to, 0, moveBlock);
        setBlocks(updatedBlocks);
    }

    //useCallBack memoizes (cashes) and only recreates it when its dependencies change 
    const saveLab = useCallback(async () => {
        const lab = { title, blocks, assignmentId };
        try {
            await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/lab/upsert-lab`, lab);
        } catch (err) {
            console.error('Error trying to upsert (save) lab to api', err);
        }
    }, [title, blocks, assignmentId]);


    const loadLabFromUserFile = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const labData = JSON.parse(e.target.result);
                    setBlocks(labData.blocks || []);
                    // If you want to set title from file, uncomment:
                    // setTitle(labData.title || "");
                    console.log('Lab loaded from user file');
                } catch (err) {
                    console.error('Error parsing JSON file:', err.message);
                }
            };
            reader.readAsText(file);
        }
    };

    //process blocks with the image url for EXPORT BUTTON 
    const embedImagesForBlock = async (block) => {
        if (block.blockType === "material") {
            return {
                ...block,
                content: await inlineImagesAsDataUrls(block.content)
            };
        }

        if (block.blockType === "question") {
            const updatedSubQuestions = await Promise.all(
                (block.subQuestions || []).map(async (sq) => ({
                    ...sq,
                    prompt: await inlineImagesAsDataUrls(sq.prompt),
                    explanation: await inlineImagesAsDataUrls(sq.explanation)
                }))
            );

            return {
                ...block,
                prompt: await inlineImagesAsDataUrls(block.prompt),
                explanation: await inlineImagesAsDataUrls(block.explanation),
                subQuestions: updatedSubQuestions
            };
        }

        return block;
    };

    const exportLabToFolder = async () => {
        const processedBlocks = await Promise.all(blocks.map(embedImagesForBlock));
        const lab = { title, blocks: processedBlocks };
        const filename = title ? `${title}.json` :'lab.json' ;
        const blob = new Blob([JSON.stringify(lab, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    const displayNumbers = generateDisplayNumbers(blocks);

    return (
        <div className="max-w-7xl mx-auto p-10">
            <h1 className="text-2xl font-bold mb-4" style={{ whiteSpace: "pre-line" }}>
                Lab Builder <br></br>
                {title || "No Title"}
            </h1>

            {/* DISPLAY BLOCKS */}
            {blocks.map((block, i) => (
                <div key={block.id || i} className="mb-6 flex items-start">
                    {/* Arrow buttons on the left */}
                    <div className="flex flex-col mr-2">
                        <button
                            disabled={i === 0}
                            onClick={() => moveBlock(i, i - 1)}
                            className="bg-gray-300 text-black px-2 py-1 rounded mb-1"
                            title="Move Up"
                        >

                        </button>
                        <button
                            disabled={i === blocks.length - 1}
                            onClick={() => moveBlock(i, i + 1)}
                            className="bg-gray-300 text-black px-2 py-1 rounded"
                            title="Move Down"
                        >
                            ↓
                        </button>
                    </div>
                    {/* Block editor */}
                    <div className="flex-1">
                        {block.blockType === "material" ? (
                            <MaterialEditor
                                key={block.id}
                                block={block}
                                onMaterialChange={(updatedBlock) => updateBlock(block.id, updatedBlock)}
                                onMaterialDelete={() => deleteBlock(block.id)}
                            />
                        ) : (
                            <QuestionEditor
                                key={block.id}
                                q={block}
                                displayNumbers={displayNumbers}
                                onQuestionChange={(updatedBlock) => updateBlock(block.id, updatedBlock)}
                                onQuestionDelete={() => deleteBlock(block.id)}
                                level={0}
                            />
                        )}
                    </div>
                </div>
            ))}

            {/* BUTTONS */}
            <button
                onClick={addMaterialBlock}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            >
                Add Materials
            </button>
            <button
                onClick={addQuestionBlock}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            >
                ➕ Add Question
            </button>
            <button
                // onClick={saveLab}
                onClick={(e) => {
                    saveLab();
                    const originalText = e.target.textContent;
                    e.target.textContent = '✅ Saved!';
                    setTimeout(() => e.target.textContent = originalText, 1500);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                💾 Save
            </button>
            {/* <button
                onClick={loadLabFromFile}
                className="bg-yellow-600 text-white px-4 py-2 rounded mr-2"
            >
                📂 Load From File
            </button> */}
            <input
                type="file"
                accept=".json"
                onChange={loadLabFromUserFile}
                className="bg-yellow-600 text-white px-4 py-2 rounded mr-2"
                style={{ display: 'inline-block' }}
            />
            <button
                onClick={exportLabToFolder}
                className="bg-blue-600 text-white px-4 py-2 rounded ml-2"
            >
                ⬇️ Export
            </button>

        </div>
    );
}

export default LabBuilder;


