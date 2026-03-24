const express = require('express');
const router = express.Router();
const {getAllUsers, loginUser, getUsersBySection} = require('../controllers/userController');
const {requireAuth} = require('../middleware/authentication');

router.post('/login', loginUser);  // No auth needed
router.get('/users', requireAuth, getAllUsers);
router.get('/users/section', requireAuth, getUsersBySection);

module.exports = router;