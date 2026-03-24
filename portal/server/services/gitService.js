const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

//clone repo into destination folder
async function cloneRepo(repoUrl, destinationFolder){
    console.log(`--------------CLONING SERVICE -------------`);
    const git = simpleGit();

    //create folder if it doesn't exist 
    if(!fs.existsSync(destinationFolder)){
        fs.mkdirSync(destinationFolder, {recursive:true});
        console.log('folder created');
    }

    console.log(`Cloning ${repoUrl} into ${destinationFolder}...`);

    //clone repo into destination  git.clone returns a promise
    await git.clone(repoUrl, destinationFolder);

    console.log('Clone complete');
}

module.exports = {cloneRepo};
