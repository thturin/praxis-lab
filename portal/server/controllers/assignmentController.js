const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { assignmentDeletionQueue } = require('../queues/assignmentDeletionQueue');
require('dotenv').config();  // Add this to load .env variables


const createAssignment = async (req, res) => {
    // Only admins can create
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
        const { title, dueDate, type, sectionIds = [] } = req.body;
        if (!title) return res.status(400).json({ error: 'Missing title field' });
        // Regular admin: can only assign to their sections
        if (!req.user.isSuperAdmin) {
            const invalidSections = sectionIds.filter(
                //filter sectionIds to see if any id is not in adminSectionIds
                id => !req.user.adminSectionIds.includes(Number(id))
            );
            if (invalidSections.length > 0) {
                return res.status(403).json({ 
                    error: 'Cannot assign to sections you do not manage' 
                });
            }
        }

        const assignment = await prisma.assignment.create({
            data: {
                title,
                dueDate: dueDate ? new Date(dueDate) : null,
                type: type || null,
                sections: {
                    create: sectionIds.map((sectionId) => ({
                        //connect to existing sections
                        section: { connect: { id: Number(sectionId) } }
                    }))
                }
            },
            include: {
                sections: { select: { sectionId: true } },
                submissions: { select: { id: true } }
            }
        });
        return res.json(assignment);
    } catch (err) {
        console.error('Error creating assignment: ', err.message);
        return res.status(500).json({ error: 'Failed to create assignment.' });
    }
};

const getAllAssignments = async (req, res) => {
    try {
        const { role, isSuperAdmin, adminSectionIds, sectionId } = req.user;
        
        // Student: see their section's published assignments only
        if (role === 'student') {
            const assignments = await prisma.assignment.findMany({
                where: {
                    isDraft: false,
                    sections: { // at least one section matches the student's sectionId
                        some: { sectionId: sectionId }
                    }
                },
                orderBy: { dueDate: 'asc' },
                include: { //include the submissions made by this student only
                    sections: { select: { sectionId: true } },
                    submissions: {
                        where: { userId: req.user.id },
                        select: { id: true }
                    }
                }
            });
            return res.json(assignments);
        }

        // Super admin: see all assignments (including drafts)
        if (isSuperAdmin) {
            const assignments = await prisma.assignment.findMany({
                orderBy: { dueDate: 'desc' },
                include: {
                    sections: { select: { sectionId: true } },//sectionId willl be null for admin
                    submissions: { select: { id: true } }
                }
            });
            return res.json(assignments);
        }

        // Regular admin: see assignments in their sections only
        const assignments = await prisma.assignment.findMany({
            where: {
                sections: { // at least one section matches admin's assigned sections
                    some: { sectionId: { in: adminSectionIds || [] } }
                }
            },
            orderBy: { dueDate: 'desc' },
            include: {
                sections: { select: { sectionId: true } },//sectionId willl be null for admin
                submissions: { select: { id: true } }
            }
        });
        return res.json(assignments);
        
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Failed to fetch' });
    }
};

const getAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: Number(id) },
            include: {
                sections: { select: { sectionId: true } },
                submissions: { select: { id: true } }
            }
        });
        
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const { role, isSuperAdmin, adminSectionIds, sectionId } = req.user;
        
        // Student: can only access published assignments in their section
        if (role === 'student') {
            const inSection = assignment.sections.some(s => s.sectionId === sectionId);
            if (assignment.isDraft || !inSection) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }
        
        // Regular admin: can only access assignments in their sections
        if (role === 'admin' && !isSuperAdmin) {
            const hasAccess = assignment.sections.some(
                s => adminSectionIds.includes(s.sectionId)
            );
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }
        
        return res.json(assignment);
    } catch (err) {
        console.log('Cannot /get assignment ', err);
        return res.status(400).json({ error: 'Failed to get assignment' });
    }
}

const updateAssignment = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    // Check admin has access to this assignment KIND OF OVERKILL BUT WHATEVER
    if (!req.user.isSuperAdmin) {
        const assignment = await prisma.assignment.findUnique({
            where: { id: Number(id) },
            include: { sections: { select: { sectionId: true } } }
        });
        
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        const hasAccess = assignment.sections.some(
            //check if at least one sectionId of the assignment is included in adminSectionIds
            s => req.user.adminSectionIds.includes(s.sectionId)
        );
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this assignment' });
        }
    }
    
    const { title, dueDate, showExplanations, labId, isDraft, sectionIds } = req.body;
    const data = {};
    try {
        if (title !== undefined) data.title = title;
        if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
        if (showExplanations !== undefined) data.showExplanations = showExplanations;
        if (labId !== undefined) data.labId = labId;
        if (isDraft !== undefined) data.isDraft = isDraft;

        //update assignment sections if sectionIds is provided
        const sectionWrites = Array.isArray(sectionIds)
            ? {
                sections: {
                    deleteMany: {},
                    create: sectionIds.map((sectionId) => ({
                        section: { connect: { id: Number(sectionId) } }
                    }))
                }
            }
            : {};
        //update assignment with new data and section relations
        const updatedAssignment = await prisma.assignment.update({
            where: { id: Number(id) },
            data: { ...data, ...sectionWrites },
            include: {
                sections: { select: { sectionId: true } },
                submissions: { select: { id: true } }
            }
        });
        return res.json(updatedAssignment);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Failed to update assignment' });
    }
};

const deleteAssignment = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { assignmentId } = req.params;
    if (!assignmentId) return res.status(400).json({ error: 'missing assignment Id' });
    
    try {
        const assignment = await prisma.assignment.findUnique({
            where: { id: Number(assignmentId) },
            include: { sections: { select: { sectionId: true } } }
        });
        
        if (!assignment) return res.status(404).json({ error: 'assignment not found' });
        
        // Regular admin: check access
        if (!req.user.isSuperAdmin) {
            //check if at least one sectionId of the assignment is included in adminSectionIds
            const hasAccess = assignment.sections.some(
                s => req.user.adminSectionIds.includes(s.sectionId)
            );
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied to this assignment' });
            }
        }

        await assignmentDeletionQueue.add('delete-assignment', {
            assignmentId: assignment.id,
            labId: assignment.labId
        });

        return res.json({ assignmentId: assignment.id });
    } catch (err) {
        console.error('deleteAssignment enqueue Error', err);
        return res.status(500).json({ error: 'Failed to delete assignment' });
    }
}


module.exports = { deleteAssignment, createAssignment, getAllAssignments, updateAssignment, getAssignment };