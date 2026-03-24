const express = require('express');
const router = express.Router();
const { uploadImage, extractImageText, uploadHtmlImages, analyzeImageContent } = require('../controllers/imageController');

// ROOT localhost:4000/api/image
router.post('/upload', uploadImage);
router.post('/upload-html', uploadHtmlImages);
router.post('/extract-text', extractImageText);
router.post('/analyze', analyzeImageContent);

module.exports = router;
