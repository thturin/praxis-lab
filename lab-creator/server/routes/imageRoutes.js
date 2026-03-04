const express = require('express');
const router = express.Router();
const { uploadImage, extractImageText, uploadHtmlImages } = require('../controllers/imageController');

// ROOT localhost:4000/api/image
router.post('/upload', uploadImage);
router.post('/upload-html', uploadHtmlImages);
router.post('/extract-text', extractImageText);

module.exports = router;
