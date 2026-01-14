const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const getUsersBySection = async(req,res) => {
       // Only admins can fetch users by section
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    try {
        const { sectionId } = req.query;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        

        if(!sectionId){
            return res.status(400).json({ error: 'sectionId query parameter is required' });
        }
        
        const users = await prisma.user.findMany({
            where: { sectionId: parseInt(sectionId) },
            select: { id: true, username: true }
        });
        
        res.json(users);
    } catch (err) {
        console.error('Error fetching users by section:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const getAllUsers = async (req, res) => {
    try {
        const { role, isSuperAdmin, adminSectionIds } = req.user;
        
        // Only admins can list users
        if (role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        let whereClause = {};
        
        // Regular admin: only see users in their sections
        if (!isSuperAdmin) {
            whereClause = { sectionId: { in: adminSectionIds || [] } };
        }
        
        const users = await prisma.user.findMany({
            where: whereClause, //empty for super admin
            select: {
                id: true,
                schoolId: true,
                name: true,
                email: true,
                username: true,
                role: true,
                githubUsername: true,
                githubId: true,
                section: { select: { name: true } }
            }
        });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


//ADMIN MUST LOG IN IF THEIR SECTION CHANGES , not the worst tradeoff 
// you could put this session update logic in loadAdminSections middleware too
const loginUser = async (req, res) => {
    try {
        const {userName, password} = req.body;

        const user = await prisma.user.findUnique({
            where: {username: userName},
            select: {
                id: true,
                username: true,
                password: true,
                role: true,
                sectionId: true, //only for students
                isSuperAdmin: true,
                githubUsername: true,
                adminSections: { //only for admin
                    select: {
                        sectionId: true
                    }
                }
            } 
        });

        if(user && user.password === password){
            //build session based on role
            if(user.role === 'admin'){
                req.session.user = {
                    id: user.id,
                    role: user.role,
                    isSuperAdmin: user.isSuperAdmin || false,
                    adminSectionIds: user.isSuperAdmin ? null : user.adminSections.map(s => s.sectionId)
                }
            } else {
                req.session.user = {
                    id: user.id,
                    role: user.role,
                    sectionId: user.sectionId
                };
            }
            return res.json({user});
        } else {
            return res.status(401).json({error: 'Invalid username or password'});
        }
    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
};



module.exports = {getAllUsers,loginUser, getUsersBySection};