
const gm = require('gm').subClass({ imageMagick: true });
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');


exports.process = async (data) => {
  const { filePath, fileId } = data;
  const outputDir = path.join(__dirname, '../../processed/images');
  const outputPath = path.join(outputDir, `${fileId}.jpg`);
  await new Promise(res => setTimeout(res, 2000));
  

  await fs.ensureDir(outputDir);

  console.log('Input file details:', {
    exists: fs.existsSync(filePath),
    size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 'file not found',
    path: filePath
  });

  if (process.platform === 'win32') {
    return new Promise((resolve, reject) => {
      const cmd = `magick "${filePath}" -resize 200x200 "${outputPath}"`;
      
      console.log('Executing command:', cmd);
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error('==============> Error executing ImageMagick command:', error);
          console.error('stderr:', stderr);
          return reject(error);
        }
        
        console.log('========> GraphicsMagick command succeeded');
        
       
        resolve({
          fileId,
          outputPath,
          url: `/processed/images/${fileId}.jpg`
        });
      });
    });
  } 
  
};


exports.cleanup = async (filePath) => {
  try {
    await fs.remove(filePath);
    console.log(`==============> Removed original file: ${filePath}`);
  } catch (error) {
    console.error('==================> Error cleaning up after image processing:', error);
  }
};