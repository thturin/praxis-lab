import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { saveImageFile, extractAndSaveImages } from '../services/images/imageService';
import { extractImage } from '../services/vision/visionService';


//==========FOR HTML STRING IMAGE UPLOAD (STUDENT RESPONSES)===========
export const uploadHtmlImages = async (req: Request, res: Response) => {
    try {
        const { htmlString, subfolder = 'sessions' } = req.body;
        if (!htmlString) {
            return res.status(400).json({ error: 'htmlString is required' });
        }
        const processedHtml = extractAndSaveImages(htmlString, subfolder);
        return res.json({ html: processedHtml });
    } catch (err: any) {
        console.error('Error processing HTML images:', err.message);
        return res.status(500).json({ error: 'Failed to process HTML images' });
    }
};


//==========FOR IMAGE UPLOAD IN LAB SAVE===========
export const uploadImage = async (req: Request, res: Response) => {
    try {
        const { base64Data, mimeType, subfolder = '' } = req.body;
        if (!base64Data || !mimeType) {
            return res.status(400).json({ error: 'base64Data and mimeType are required' });
        }
        const imageUrl = saveImageFile(base64Data, mimeType, subfolder);
        return res.json({ imageUrl });
    } catch (err: any) {
        console.error('Error uploading image:', err.message);
        return res.status(500).json({ error: 'Failed to upload image' });
    }
};


//==========FOR VISION EXTRACTION===========
export const extractImageText = async (req: Request, res: Response) => {
    try {
        const { base64Data, mimeType, imageUrl } = req.body;

        let finalBase64: string = base64Data;
        let finalMimeType: string = mimeType;

        if (!finalBase64 && imageUrl) {
            const filename = imageUrl.replace('/images/', '');
            const filePath = path.join(__dirname, '..', 'uploads', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Image file not found' });
            }

            const fileBuffer = fs.readFileSync(filePath);
            finalBase64 = fileBuffer.toString('base64');

            const ext = path.extname(filename).toLowerCase();
            const mimeTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
            finalMimeType = mimeTypes[ext] || 'image/png';
        }

        if (!finalBase64 || !finalMimeType) {
            return res.status(400).json({ error: 'Either base64Data+mimeType or imageUrl is required' });
        }

        const result = await extractImage(finalBase64, finalMimeType);
        return res.json({ text: result.text });
    } catch (err: any) {
        console.error('Error extracting image text:', err.message);
        res.status(500).json({ error: 'Failed to extract text from image' });
    }
};
