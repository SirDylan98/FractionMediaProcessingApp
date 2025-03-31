const { getVideoQueue } = require('../services/redisService');
const videoProcessor = require('../services/videoProcessor');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Starting video processing worker...');

// Get queue reference
const videoQueue = getVideoQueue();

// Process video queue jobs
videoQueue.process(async (job) => {
  console.log(`Processing video job ${job.id} for file: ${job.data.fileId}`);
  
  try {
    // Update job progress
    await job.progress(10);
    
    // Process the video
    const result = await videoProcessor.process(job.data);
    
    // Update job progress
    await job.progress(90);
    
    // Clean up original file if needed
    await videoProcessor.cleanup(job.data.filePath);
    
    // Complete the job
    await job.progress(100);
    console.log(`Video job ${job.id} completed successfully`);
    
    return result;
  } catch (error) {
    console.error(`Error processing video job ${job.id}:`, error);
    throw error;
  }
});

console.log(`Video processing worker started with concurrency: ${process.env.QUEUE_CONCURRENCY || 2}`);