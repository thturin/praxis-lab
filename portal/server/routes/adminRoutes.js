const express = require('express');
const router = express.Router();
const { exportAssignmentsCsvByName } = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authentication');

//ROOT LOCALHOST:5000/api/admin

router.get('/exportAssignment', requireAuth, exportAssignmentsCsvByName);


module.exports = router;