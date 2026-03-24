const axios = require('axios');

const handleLogout = async (req, res) => {
    //destroy the session 

    try {
        req.session.destroy((err) => {
            // if(err){
            //     console.error('Session desctruction error: ', err);
            //     res.status(500).json({error:'Failed to logout'});
            // }

            //clear session cookie 
            res.clearCookie('connect.sid');
            res.json({ message: 'Logged out successfully' });
        });
    } catch (err) {
        console.error('Logout error', err);
        res.status(500).json({error: 'Could not connect to server'});
    }
};

module.exports = {
    handleLogout
}
