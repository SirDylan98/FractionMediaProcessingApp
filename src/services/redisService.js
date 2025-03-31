
// const path = require('path');
// const redisClient = require('../config/redis');

// // Create queue instances
// const imageQueue = new Queue('image-processing', {
//   redis: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379
//   }
// });

// const videoQueue = new Queue('video-processing', {
//   redis: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: process.env.REDIS_PORT || 6379
//   }
// });

// // Set up queues with concurrency options
// imageQueue.process(parseInt(process.env.QUEUE_CONCURRENCY || 2));
// videoQueue.process(parseInt(process.env.QUEUE_CONCURRENCY || 2));

// // Queue an image processing job
// exports.queueImageProcessing = async (data) => {
//   try {
//     const job = await imageQueue.add(data, {
//       attempts: 3,
//       backoff: {
//         type: 'exponential',
//         delay: 1000
//       },
//       removeOnComplete: 100,  // Keep last 100 completed jobs
//       removeOnFail: 100       // Keep last 100 failed jobs
//     });
    
//     // Store the job ID with the file ID for lookup
//     await redisClient.set(`image:${data.fileId}`, job.id);
    
//     return job;
//   } catch (error) {
//     console.error('Error queuing image job:', error);
//     throw error;
//   }
// };

// // Queue a video processing job
// exports.queueVideoProcessing = async (data) => {
//   try {
//     const job = await videoQueue.add(data, {
//       attempts: 3,
//       backoff: {
//         type: 'exponential',
//         delay: 1000
//       },
//       removeOnComplete: 100,
//       removeOnFail: 100
//     });
    
//     // Store the job ID with the file ID for lookup
//     await redisClient.set(`video:${data.fileId}`, job.id);
    
//     return job;
//   } catch (error) {
//     console.error('Error queuing video job:', error);
//     throw error;
//   }
// };

// // Get job status
// exports.getJobStatus = async (type, id) => {
//   try {
//     // First try to get by file ID
//     const jobId = await redisClient.get(`${type}:${id}`);
//     if (jobId) {
//       const queue = type === 'image' ? imageQueue : videoQueue;
//       const job = await queue.getJob(jobId);
      
//       if (job) {
//         const state = await job.getState();
//         return {
//           id: job.id,
//           fileId: job.data.fileId,
//           status: state,
//           progress: job.progress
//         };
//       }
//     }
    
//     // Also try with direct job ID
//     const queue = type === 'image' ? imageQueue : videoQueue;
//     const job = await queue.getJob(id);
    
//     if (job) {
//       const state = await job.getState();
//       return {
//         id: job.id,
//         fileId: job.data.fileId,
//         status: state,
//         progress: job.progress
//       };
//     }
    
//     return null;
//   } catch (error) {
//     console.error(`Error getting ${type} job status:`, error);
//     throw error;
//   }
// };

// // Get the queues for worker processes
// exports.getImageQueue = () => imageQueue;
// exports.getVideoQueue = () => videoQueue;

// // Set up event listeners for queues
// imageQueue.on('completed', (job, result) => {
//   console.log(`Image job ${job.id} completed with result:`, result);
// });

// imageQueue.on('failed', (job, error) => {
//   console.error(`Image job ${job.id} failed with error:`, error);
// });

// videoQueue.on('completed', (job, result) => {
//   console.log(`Video job ${job.id} completed with result:`, result);
// });

// videoQueue.on('failed', (job, error) => {
//   console.error(`Video job ${job.id} failed with error:`, error);
// });
const Queue = require('bull');
const path = require('path');
const redisClient = require('../config/redis');
const imageProcessor = require('../services/imageProcessor');
// Create queue instances
const imageQueue = new Queue('image-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

const videoQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});


// Queue an image processing job
exports.queueImageProcessing = async (data) => {
  try {
    const job = await imageQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 100,  
      removeOnFail: 100       
    });
    
    // caching the job ID with the file ID for lookup
    await redisClient.set(`image:${data.fileId}`, job.id);
    
    return job;
  } catch (error) {
    console.error('=========> Error queuing image job:', error);
    throw error;
  }
};

// Queue a video processing job
exports.queueVideoProcessing = async (data) => {
  try {
    const job = await videoQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    });
    
    // Caching the job ID with the file ID for lookup
    await redisClient.set(`video:${data.fileId}`, job.id);
    
    return job;
  } catch (error) {
    console.error('=========>Error queuing video job:', error);
    throw error;
  }
};

// Get job status
exports.getJobStatus = async (type, id) => {
  try {
    // First try to get by file ID
    const jobId = await redisClient.get(`${type}:${id}`);
    if (jobId) {
      const queue = type === 'image' ? imageQueue : videoQueue;
      const job = await queue.getJob(jobId);
      
      if (job) {
        const state = await job.getState();
        return {
          id: job.id,
          fileId: job.data.fileId,
          status: state,
          progress: job.progress
        };
      }
    }
    
    // Also try with direct job ID
    const queue = type === 'image' ? imageQueue : videoQueue;
    const job = await queue.getJob(id);
    
    if (job) {
      const state = await job.getState();// simply getting the state of task
      return {
        id: job.id,
        fileId: job.data.fileId,
        status: state,
        progress: job.progress
      };
    }
    
    return null;
  } catch (error) {
    console.error(`===========>Error getting ${type} job status:`, error);
    throw error;
  }
};

// Get the queues for worker processes
exports.getImageQueue = () => imageQueue;
exports.getVideoQueue = () => videoQueue;

// Set up event listeners for queues
imageQueue.on('completed', (job, result) => {
  console.log(`==========> Image job ${job.id} completed with result:`, result);
});

imageQueue.on('failed', (job, error) => {
  console.error(`=========> Image job ${job.id} failed with error:`, error);
});

videoQueue.on('completed', (job, result) => {
  console.log(`========> Video job ${job.id} completed with result:`, result);
});

videoQueue.on('failed', (job, error) => {
  console.error(`==============> Video job ${job.id} failed with error:`, error);
});