const express = require('express');
const router = express.Router();
const {getAllSections} = require('../controllers/sectionController');
const {requireAuth} = require('../middleware/authentication');

//ROOT LOCALHOST:5000/api/sections

router.get('/', requireAuth, getAllSections);


module.exports = router;