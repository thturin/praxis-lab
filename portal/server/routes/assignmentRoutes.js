const express = require('express');
const router = express.Router();
const {getAssignment, createAssignment, deleteAssignment, getAllAssignments, updateAssignment} = require('../controllers/assignmentController');
const {requireAuth} = require('../middleware/authentication');

router.get('/', requireAuth, getAllAssignments);
router.get('/:id', requireAuth, getAssignment);
router.post('/', requireAuth, createAssignment);
router.put('/:id', requireAuth, updateAssignment);
router.delete('/delete-assignment/:assignmentId', requireAuth, deleteAssignment);

module.exports = router;

