const express = require('express');
const imageController = require('../controllers/imageController');
const videoController = require('../controllers/videoController');

const router = express.Router();

// Image routes
router.post('/image', imageController.uploadImage, imageController.processImage);
router.get('/image/:id', imageController.getImageStatus);
router.get('/images', imageController.getAllImages);

// Video routes
router.post('/video', videoController.uploadVideo, videoController.processVideo);
router.get('/video/:id', videoController.getVideoStatus);
router.get('/videos', videoController.getAllVideos);

// Get job status
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const imageStatus = await imageController.checkJobStatus(jobId);
    const videoStatus = await videoController.checkJobStatus(jobId);
    
    if (imageStatus) {
      return res.json(imageStatus);
    } else if (videoStatus) {
      return res.json(videoStatus);
    } else {
      return res.status(404).json({ status: 'error', message: 'Job not found' });
    }
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;