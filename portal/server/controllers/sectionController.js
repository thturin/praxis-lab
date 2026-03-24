const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const getAllSections = async (req, res) => {
    try {
        // Only admins should access this (students don't need section list)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Super admin: see all sections
        if (req.user.isSuperAdmin) {
            const sections = await prisma.section.findMany({
                include: { students: true }
            });
            return res.json(sections);
        }
        
        // Regular admin: see only their assigned sections
        const sections = await prisma.section.findMany({
            where: {
                //SELECT * FROM Section WHERE id IN (5, 8, 12)
                //find all sections where the ids match the array of adminSectionIds
                id: { in: req.user.adminSectionIds || [] }
            },
            include: { students: true }
        });
        res.json(sections);
    } catch (err) {
        console.error('Cannot fetch sections', err);
        res.status(500).json({ error: 'Failed to fetch' });
    }
};

module.exports = { getAllSections };