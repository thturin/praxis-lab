const express = require('express');
const router = express.Router();
const { loadLab, getLabs, upsertLab, deleteLab, getLab, updateLabPrompt, extractImageText, uploadImage } = require('../controllers/labController');


//ROOT localhost:4000/api/lab
router.get('/get-labs', getLabs);
router.get('/load-lab',loadLab);
router.post('/upsert-lab',upsertLab);
router.post('/update-lab-prompt', updateLabPrompt);
router.delete('/delete-lab/:labId',deleteLab);
router.get('/get-lab/:id',getLab)
router.post('/extract-image-text', extractImageText)
router.post('/upload-image', uploadImage)

module.exports = router;
