const path = require('path');
const fs = require('fs');
const { saveImageFile } = require('../services/imageService');

const uploadImage = async (req, res) => {
    try {
        const { base64Data, mimeType, subfolder = '' } = req.body;
        if (!base64Data || !mimeType) {
            return res.status(400).json({ error: 'base64Data and mimeType are required' });
        }
        const imageUrl = saveImageFile(base64Data, mimeType, subfolder);
        return res.json({ imageUrl });
    } catch (err) {
        console.error('Error uploading image:', err.message);
        return res.status(500).json({ error: 'Failed to upload image' });
    }
};

const extractImageText = async (req, res) => {
    try {
        const { base64Data, mimeType, imageUrl } = req.body;

        let finalBase64 = base64Data;
        let finalMimeType = mimeType;

        if (!finalBase64 && imageUrl) {
            const filename = imageUrl.replace('/images/', '');
            const filePath = path.join(__dirname, '..', 'uploads', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Image file not found' });
            }

            const fileBuffer = fs.readFileSync(filePath);
            finalBase64 = fileBuffer.toString('base64');

            const ext = path.extname(filename).toLowerCase();
            const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
            finalMimeType = mimeTypes[ext] || 'image/png';
        }

        if (!finalBase64 || !finalMimeType) {
            return res.status(400).json({ error: 'Either base64Data+mimeType or imageUrl is required' });
        }

        //console.log(finalBase64, finalMimeType);
        const { analyzeImage } = require('../services/vision/visionService');
        const result = await analyzeImage(finalBase64, finalMimeType);
        return res.json({ text: result.text });
    } catch (err) {
        console.error('Error extracting image text:', err.message);
        res.status(500).json({ error: 'Failed to extract text from image' });
    }
};

module.exports = { uploadImage, extractImageText };
