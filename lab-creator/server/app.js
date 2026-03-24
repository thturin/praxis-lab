const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const gradeRoutes = require("./routes/gradeRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const labRoutes = require("./routes/labRoutes.js");
const imageRoutes = require('./routes/imageRoutes.js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app  = express();
app.use(cors({
  origin: [
     process.env.CLIENT_URL, // e.g., http://localhost:13000 for local dev
    'http://lab-creator-client:3001', // Docker Compose service name for frontend
   'http://localhost:13001', // Docker Compose service name for frontend
    'http://0.0.0.0:13001',
    'http://portal-client:3000',
    'http://localhost:13000',
    'http://0.0.0.0:13000',
    'https://turninterminal.netlify.app'
  ],
  credentials:true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

//increase limit to 10mb the blocks are big.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

//health check
app.get('/', (req,res)=>{
    res.send('Lab Creator Backend is running!');
})

const PORT = process.env.SERVER_PORT || 4000;
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})

app.use('/api/grade',gradeRoutes);
app.use('/api/session',sessionRoutes);
app.use('/api/lab',labRoutes);
app.use('/api/image', imageRoutes);
//static file serving (separate from API)
//endpoint below is where we will access the image
//in the uploads folder in repository 
app.use('/images', express.static(path.join(__dirname,'uploads')));
