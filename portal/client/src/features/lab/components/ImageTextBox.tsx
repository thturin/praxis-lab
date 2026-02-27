import { useState } from "react";
import axios from "axios";
import { extractAllImagesData } from "./fetchImages";

interface ImageTextBoxProps {
    htmlContent: string;
    imageText: string;
    onChange: (text: string) => void;
}

function ImageTextBox({ htmlContent, imageText, onChange }: ImageTextBoxProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleExtract = async () => {
        setIsLoading(true);
        setError("");
        try {
            const images = extractAllImagesData(htmlContent);
            if (images.length === 0) {
                setError("No image found in content");
                return;
            }

            // Send all images to backend for text extraction, then combine results
            const results = await Promise.all(
                images.map(imageData =>
                    axios.post(
                        `${process.env.REACT_APP_API_LAB_HOST}/lab/extract-image-text`,
                        {
                            base64Data: imageData.base64Data,
                            mimeType: imageData.mimeType,
                            imageUrl: imageData.imageUrl,
                        }
                    ).then(r => r.data.text)
                )
            );

            onChange(results.join("\n---\n"));
        } catch (err) {
            console.error("Error extracting image text:", err);
            setError("Failed to extract text from image");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-2 border border-violet-200 bg-violet-50 rounded-md overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between">
                <span className="font-semibold text-sm text-violet-800">
                    Image Text Extraction
                </span>
                <button
                    onClick={handleExtract}
                    disabled={isLoading}
                    className="bg-violet-600 text-white px-3 py-1 rounded text-sm hover:bg-violet-700 disabled:opacity-50"
                >
                    {isLoading ? "Extracting..." : "Extract Text"}
                </button>
            </div>
            <div className="px-3 pb-3">
                {error && (
                    <p className="text-red-600 text-sm mb-2">{error}</p>
                )}
                <textarea
                    placeholder="Extracted text will appear here. You can also edit it manually."
                    className="w-full border p-2 rounded text-sm"
                    value={imageText || ""}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                />
            </div>
        </div>
    );
}

export default ImageTextBox;
