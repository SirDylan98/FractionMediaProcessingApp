const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { queueImageProcessing, getJobStatus } = require('../services/redisService');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/images'));
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const fileExt = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExt}`);
  }
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('======> Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Initialize upload middleware
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter
});


exports.uploadImage = upload.single('image');

// Process image
exports.processImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No image uploaded' });
    }

    const { file } = req;
    const originalName = file.originalname;
    const filePath = file.path;
    const fileId = path.basename(file.filename, path.extname(file.filename));

    // Queue the image processing job
    const job = await queueImageProcessing({
      filePath,
      fileId,
      originalName,
      mimetype: file.mimetype
    });

    return res.status(202).json({
      status: 'success',
      message: 'Image processing queued',
      data: {
        jobId: job.id,
        fileId,
        originalName,
        status: 'queued'
      }
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get image status
exports.getImageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Attempt to get the file from processed directory
    const processedDir = path.join(__dirname, '../../processed/images');
    const files = await fs.readdir(processedDir);
    
    const matchedFile = files.find(file => file.startsWith(id));
    
    if (matchedFile) {
      const fileUrl = `${process.env.PUBLIC_URL}/processed/images/${matchedFile}`;
      return res.json({
        status: 'success',
        data: {
          fileId: id,
          status: 'completed',
          url: fileUrl
        }
      });
    }
    
    // Check if job is still in progress
    const job = await getJobStatus('image', id);
    if (job) {
      return res.json({
        status: 'success',
        data: {
          fileId: id,
          jobId: job.id,
          status: job.status
        }
      });
    }
    
    return res.status(404).json({
      status: 'error',
      message: 'Image not found'
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Check job status
exports.checkJobStatus = async (jobId) => {
  return getJobStatus('image', jobId);
};

// Get all processed images
exports.getAllImages = async (req, res) => {
  try {
    const processedDir = path.join(__dirname, '../../processed/images');
    const files = await fs.readdir(processedDir);
    
    const imageList = files.map(file => {
      const fileId = path.basename(file, path.extname(file));
      return {
        fileId,
        url: `${process.env.PUBLIC_URL}/processed/images/${file}`
      };
    });
    
    return res.json({
      status: 'success',
      data: imageList
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};