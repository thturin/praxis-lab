import { useState } from "react";
import axios from "axios";
import { extractAllImagesData } from "./fetchImages";

// For storing structured image analysis on the admin answer key (image-analysis type questions)
// THIS IS ONLY USED FOR ADMIN IN LAB BUILDER

interface ImageAnalysisBoxProps {
    htmlContent: string;
    imageAnalysis: any;
    onChange: (analysis: any) => void;
}

function ImageAnalysisBox({ htmlContent, imageAnalysis, onChange }: ImageAnalysisBoxProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError("");
        try {
            const images = extractAllImagesData(htmlContent);
            if (images.length === 0) {
                setError("No image found in content");
                return;
            }

            // image-analysis questions allow only one answer key image
            const imageData = images[0];
            const response = await axios.post(
                `${process.env.REACT_APP_API_LAB_HOST}/image/analyze`,
                {
                    base64Data: imageData.base64Data,
                    mimeType: imageData.mimeType,
                    imageUrl: imageData.imageUrl,
                }
            );

            onChange(response.data.analysis);
        } catch (err) {
            console.error("Error analyzing image:", err);
            setError("Failed to analyze image");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-2 border border-teal-200 bg-teal-50 rounded-md overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between">
                <span className="font-semibold text-sm text-teal-800">Image Analysis</span>
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700 disabled:opacity-50"
                >
                    {isLoading ? "Analyzing..." : imageAnalysis ? "Re-analyze" : "Analyze Image"}
                </button>
            </div>
            <div className="px-3 pb-3">
                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
                {imageAnalysis ? (
                    <div className="space-y-3">
                        {/* Topology fingerprint — readable list */}
                        {imageAnalysis.topology_fingerprint?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-teal-700 mb-1">Topology</p>
                                <ul className="text-xs text-gray-700 space-y-0.5 pl-2">
                                    {imageAnalysis.topology_fingerprint.map((line: string, i: number) => (
                                        <li key={i} className="font-mono">{line}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {/* Analytical summary */}
                        {imageAnalysis.analytical_summary && (
                            <div className="text-xs text-gray-600 space-y-0.5">
                                <p><span className="font-semibold">Function:</span> {imageAnalysis.analytical_summary.primary_function}</p>
                                <p><span className="font-semibold">Pattern:</span> {imageAnalysis.analytical_summary.identified_pattern}</p>
                            </div>
                        )}
                        {/* Raw JSON — editable for manual correction */}
                        <details className="text-xs">
                            <summary className="cursor-pointer text-teal-700 font-semibold">Edit raw JSON</summary>
                            <textarea
                                className="w-full border p-2 rounded text-sm font-mono mt-1"
                                value={JSON.stringify(imageAnalysis, null, 2)}
                                onChange={(e) => {
                                    try { onChange(JSON.parse(e.target.value)); } catch {}
                                }}
                                rows={10}
                            />
                        </details>
                    </div>
                ) : (
                    <p className="text-teal-600 text-sm italic">Not yet analyzed. Click Analyze Image to generate structured analysis.</p>
                )}
            </div>
        </div>
    );
}

export default ImageAnalysisBox;
