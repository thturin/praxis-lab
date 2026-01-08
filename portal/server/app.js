const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const submissionRoutes = require('./routes/submissionRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const userRoutes = require('./routes/userRoutes');
const sectionRoutes = require('./routes/sectionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const {PrismaClient} = require('@prisma/client');
//require('dotenv').config(); //load environment variables from .env
//use .env in root

const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:13000',
    'http://0.0.0.0:13000',
    'https://turninterminal.netlify.app'
].filter(Boolean);

//you are already using an authentication method so you ca * origin accept any 
app.use(cors({
    origin: allowedOrigins,
    credentials:true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
    //cache-control is used in subsmissions/regrade so the browswer won't re-use old responses 
}));

app.use(express.json());

console.log('--------------------BEGIN----------------------');




//REQUIRED FOR GITHUB Oauth
const session = require('express-session');//ceaet a session
app.set('trust proxy',1); // trust 

const primaryClient = process.env.CLIENT_URL || '';
const isLocalClient = /localhost|127\.0\.0\.1/.test(primaryClient);
const sessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'PraxisLabSession',//no spaces or special characters
    cookie: {
        maxAge: 60*60*1000,
                sameSite: isLocalClient ? 'lax': 'none',
                secure: isLocalClient ? false : true,
        httpOnly: true,
        domain: undefined
  }
};
console.log('proces.env.NODE_ENV',process.env.NODE_ENV);
console.log('process.env.REDIS_URL',process.env.REDIS_URL);

// Configure session store based on environment
if (process.env.NODE_ENV === 'production') {
    const { createSessionStore } = require('./config/sessionRedis');
    sessionOptions.store = createSessionStore(session);
} else {
    // Use file store for local development
    const FileStore = require('session-file-store')(session);
    sessionOptions.store = new FileStore({
        path: './sessions',
        ttl: 24 * 60 * 60,
        retries: 5
    });
}

//THIS WILL BOOT THE BULLMQ WORKER ALONGSIDE THE API WHENEVER THE SERVER STARTS
if(process.env.RUN_ASSIGNMENT_WORKER!=='false'){
    require('./workers/assignmentDeletionWorker');
    require('./workers/submissionRegradeWorker');
}

//app.use required MIDDLEWARE function session()
app.use(session(sessionOptions));

app.get('/', (req, res)=>{
    res.send('Backend is running!');
    console.log(req);
});

//add route for railway health checks
app.get('/health', (req,res)=>{
  res.json({
    status:'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'empty'
  });
});

//API ROUTES
app.use('/api/', submissionRoutes); //call the router object in submissionRoutes (it is exported)
app.use('/api/assignments', assignmentRoutes); //call the router object in assignmentRoutes
app.use('/api/',userRoutes);//two different endpoints /users and /login
app.use('/api/sections',sectionRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/auth',authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('CLIENT_URL:', JSON.stringify(process.env.CLIENT_URL));
});




