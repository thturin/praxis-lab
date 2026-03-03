const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

//admin images from question blocks and answer key are saved to disk 
//in images/ (flat)
//student images from responses are saved in images/sessin/
// Save a single base64 image to disk. Returns the /images/[subfolder/]filename URL.
const saveImageFile = (base64Data, mimeType, subfolder = '') => {
    const fileType = mimeType.split('/')[1];
    const filename = crypto.randomBytes(16).toString('hex') + '.' + fileType;
    const dir = subfolder ? path.join(uploadsDir, subfolder) : uploadsDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), Buffer.from(base64Data, 'base64'));
    const imageUrl = subfolder ? `/images/${subfolder}/${filename}` : `/images/${filename}`;
    console.log(`Saved image: ${imageUrl}`);
    return imageUrl;
};

const extractAndSaveImages = (str, subfolder = '') => {
    if (!str) return str;
    const base64Pattern = /src="(data:image\/[^;]+;base64,[^"]+)"/g;
    let match;
    let processedStr = str;
    while ((match = base64Pattern.exec(str)) !== null) {
        const base64Data = match[1]; // "data:image/png;base64,iVBORw0KGgoAAAA..."
        const [header, base64] = base64Data.split(',');
        const mimeType = header.replace('data:', '').replace(';base64', '');
        const imageUrl = saveImageFile(base64, mimeType, subfolder);
        processedStr = processedStr.replace(base64Data, imageUrl);
    }
    return processedStr;
};

const processBlockImages = (blocks) => {
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.blockType === 'material') {
            block['content'] = extractAndSaveImages(block['content']);
        } else if (block.blockType === 'question') {
            block['prompt'] = extractAndSaveImages(block['prompt']);
            block['key'] = extractAndSaveImages(block['key']);
            block['explanation'] = extractAndSaveImages(block['explanation']);
            if (block.subQuestions && block.subQuestions.length > 0) {
                for (let j = 0; j < block.subQuestions.length; j++) {
                    const sq = block.subQuestions[j];
                    sq['prompt'] = extractAndSaveImages(sq['prompt']);
                    sq['key'] = extractAndSaveImages(sq['key']);
                    sq['explanation'] = extractAndSaveImages(sq['explanation']);
                }
            }
        }
    }
    return blocks;
};

module.exports = { saveImageFile, extractAndSaveImages, processBlockImages };
