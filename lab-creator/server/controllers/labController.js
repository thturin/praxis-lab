require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const {processBlockImages} = require('./uploadController');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();


const deleteLab = async (req, res) => {
    const { labId } = req.params;
    if (!labId) return res.status(400).json({ error: 'missing assignment Id' });

    try { //lab.delete will throw an error if no lab exists but deleteMany will not
        await prisma.lab.deleteMany({
            where: { id: Number(labId) }
        });
        res.json({ message: 'Lab deleted successfully' });
    } catch (err) {
        console.error('Error deleting lab:', err);
        res.status(500).json({ error: 'Failed to delete lab' });
    }
}

const loadLab = async (req, res) => { //load existing lab or create a new one 
    try {
        const { assignmentId, title } = req.query;
        let lab = await prisma.lab.findUnique({
            where: { assignmentId: Number(assignmentId) },
        });
        if (!lab) { //lab doesn't exist, create a new one 
            console.log('create new lab');
            lab = await prisma.lab.create({
                data: {
                    title: title,
                    blocks: [],
                    assignmentId: Number(assignmentId),
                    sessions: { create: [] }
                }
            })
            console.log('created new empty lab', lab);
        }
        return res.json(lab);
    } catch (err) {
        console.error('Error in labController loabLab()', err);
        res.status(500).json({ error: 'Could not get lab' });
    }
}

const getLabs = async (req, res) => {
    try {
        const labs = await prisma.lab.findMany();
        return res.json(labs);
    } catch (err) {
        console.error('Error in labController getLabs()', err);
        res.status(500).json({ error: 'Could not get labs' });
    }
};

const getLab = async (req, res) => {
    try {
        const id = req.params.id;
        const lab = await prisma.lab.findUnique({
            where: {
                id: Number(id)
            }
        });
        if (!lab) return res.status(404).json({ error: 'lab not found' });
        return res.json(lab);

    } catch (err) {
        console.error('Error in labController getLab()', err.message);
        res.status(500).json({ error: 'Could not get lab' });
    }
};


const upsertLab = async (req, res) => { //this is used on create assignment
    //THIS ASSUMES 1:1 LAB: ASSIGNMENT. we avoid relying on database-genrasted IDs for upsert logic
    //one lab per assignment

    //currently searching for lab to upsert with assignmentId,
    //needs to be changed in the future 
    try {
        const { title, blocks, assignmentId} = req.body;
        if (!assignmentId) return;
        
        let data={};
        if(title!== undefined) data.title=title;

        //we must process any image urls -> image in images folder with the upload controller
        if(blocks!==undefined) data.blocks=processBlockImages(blocks);
        data.assignmentId = Number(assignmentId);
  
        const lab = await prisma.lab.upsert({
            where: { assignmentId: Number(assignmentId) },
            update: data,
            create: {
                ...data,
                sessions: { create: [] }
            }
        });
        //console.log('lab created or saved: ', lab);
        return res.json(lab); //return the lab
    } catch (err) {
        console.error('Error in labController upsertLab()', err);
        res.status(500).json({ error: 'Could not create or save lab' });
    }
}

const updateLabPrompt = async (req, res) => {
    const { assignmentId, aiPrompt } = req.body;
    if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });

    try {
        const lab = await prisma.lab.update({
            where: { assignmentId: Number(assignmentId) },
            data: { aiPrompt }
        });
        return res.json(lab);
    } catch (err) {
        return res.status(404).json({ error: 'Lab not found' });
        
    }
};

//=================VISION LLM: IMAGE TO TEXT=================
const extractImageText = async (req, res) => {
    try {
        const { base64Data, mimeType, imageUrl } = req.body;

        let finalBase64 = base64Data;
        let finalMimeType = mimeType;

        if (!finalBase64 && imageUrl) {
            // Image was already saved — read from uploads directory
            const filename = imageUrl.replace('/images/', '');
            const filePath = path.join(__dirname, '..', 'uploads', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Image file not found' });
            }

            const fileBuffer = fs.readFileSync(filePath);
            finalBase64 = fileBuffer.toString('base64');

            // Determine mime type from extension
            const ext = path.extname(filename).toLowerCase();
            const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
            finalMimeType = mimeTypes[ext] || 'image/png';
        }

        if (!finalBase64 || !finalMimeType) {
            return res.status(400).json({ error: 'Either base64Data+mimeType or imageUrl is required' });
        }

        const { analyzeImage } = require('../services/vision/visionService');
        const result = await analyzeImage(finalBase64, finalMimeType);
        return res.json({ text: result.text });
    } catch (err) {
        console.error('Error extracting image text:', err.message);
        res.status(500).json({ error: 'Failed to extract text from image' });
    }
};

module.exports = {updateLabPrompt, upsertLab, loadLab, getLabs, deleteLab, getLab, extractImageText };
