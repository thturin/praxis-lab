const express = require('express');
const router = express.Router();
const {handleLogout} = require('../controllers/authController');

//ROOT LOCALHOST:5000/api/auth

router.get('/logout',handleLogout);


module.exports = router;