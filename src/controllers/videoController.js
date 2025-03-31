const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { queueVideoProcessing, getJobStatus } = require('../services/redisService');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/videos'));
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const fileExt = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExt}`);
  }
});

// Filter for video files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('============> nvalid file type. Only MP4, MOV, AVI, and WebM videos are allowed.'), false);
  }
};

// Initialize upload middleware
const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // l had to set 300MB max file size
  fileFilter
});

// Upload video middleware
exports.uploadVideo = upload.single('video');

// Process video
exports.processVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No video uploaded' });
    }
    const { file } = req;
    const originalName = file.originalname;
    const filePath = file.path;
    const fileId = path.basename(file.filename, path.extname(file.filename));

    // Queue the video processing job
    const job = await queueVideoProcessing({
      filePath,
      fileId,
      originalName,
      mimetype: file.mimetype
    });
    return res.status(202).json({
      status: 'success',
      message: 'Video processing queued',
      data: {
        jobId: job.id,
        fileId,
        originalName,
        status: 'Pending'
      }
    });
  } catch (error) {
    console.error('**********> Error processing video:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get video status
exports.getVideoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Attempt to get the file from processed directory
    const processedDir = path.join(__dirname, '../../processed/videos');
    const thumbnailDir = path.join(__dirname, '../../processed/thumbnails');
    
    const videoFiles = await fs.readdir(processedDir);
    const thumbnailFiles = await fs.readdir(thumbnailDir);
    
    const matchedVideo = videoFiles.find(file => file.startsWith(id));
    const matchedThumbnail = thumbnailFiles.find(file => file.startsWith(id));
    
    if (matchedVideo) {
      const videoUrl = `${process.env.PUBLIC_URL}/processed/videos/${matchedVideo}`;
      const thumbnailUrl = matchedThumbnail 
        ? `${process.env.PUBLIC_URL}/processed/thumbnails/${matchedThumbnail}` 
        : null;
      
      return res.json({
        status: 'success',
        data: {
          fileId: id,
          status: 'completed',
          videoUrl,
          thumbnailUrl
        }
      });
    }
    
    // Check if job is still in progress
    const job = await getJobStatus('video', id);
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
      message: 'Video not found'
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Check job status
exports.checkJobStatus = async (jobId) => {
  return getJobStatus('video', jobId);
};

// Get all processed videos
exports.getAllVideos = async (req, res) => {
  try {
    const processedDir = path.join(__dirname, '../../processed/videos');
    const thumbnailDir = path.join(__dirname, '../../processed/thumbnails');
    
    const videoFiles = await fs.readdir(processedDir);
    const thumbnailFiles = await fs.readdir(thumbnailDir);
    
    const videoList = videoFiles.map(file => {
      const fileId = path.basename(file, path.extname(file));
      const matchedThumbnail = thumbnailFiles.find(thumb => thumb.startsWith(fileId));
      
      return {
        fileId,
        videoUrl: `${process.env.PUBLIC_URL}/processed/videos/${file}`,
        thumbnailUrl: matchedThumbnail 
          ? `${process.env.PUBLIC_URL}/processed/thumbnails/${matchedThumbnail}` 
          : null
      };
    });
    
    return res.json({
      status: 'success',
      data: videoList
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};