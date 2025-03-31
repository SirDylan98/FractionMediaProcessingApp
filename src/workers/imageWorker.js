const { getImageQueue } = require('../services/redisService');
const imageProcessor = require('../services/imageProcessor');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('Starting image processing worker...');

// Get queue reference
const imageQueue = getImageQueue();

// Process image queue jobs
imageQueue.process(async (job) => {
  console.log(`Processing image job ${job.id} for file: ${job.data.fileId}`);
  
  try {
    // Update job progress
    await job.progress(10);
    
    // Process the image
    const result = await imageProcessor.process(job.data);
    
    // Update job progress
    await job.progress(90);
    
    // Clean up original file if needed
    await imageProcessor.cleanup(job.data.filePath);
    
    // Complete the job
    await job.progress(100);
    console.log(`Image job ${job.id} completed successfully`);
    
    return result;
  } catch (error) {
    console.error(`Error processing image job ${job.id}:`, error);
    throw error;
  }
});

console.log(`Image processing worker started with concurrency: ${process.env.QUEUE_CONCURRENCY || 2}`);