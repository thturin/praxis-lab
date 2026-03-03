const express = require('express');
const router = express.Router();
const { uploadImage, extractImageText } = require('../controllers/imageController');

// ROOT localhost:4000/api/image
router.post('/upload', uploadImage);
router.post('/extract-text', extractImageText);

module.exports = router;
