

// Single middleware - check auth and attach user
//created for multiple admins and super admin
const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
        return res.status(401).json({ message: 'Login required' });
    }
    req.user = req.session.user;  // Attach for easy access
    next();
};

module.exports = { requireAuth };