const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs-extra');

exports.process = async (data) => {
  const { filePath, fileId } = data;
  const outputPath = path.join(__dirname, `../../processed/videos/${fileId}.avi`);
  const thumbnailPath = path.join(__dirname, `../../processed/thumbnails/${fileId}.jpg`);

  // First, generate the thumbnail
  const thumbnailPromise = new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .screenshots({
        timestamps: ['5'],  // Take screenshot from 5 sec into the video
        filename: `${fileId}.jpg`,
        folder: path.join(__dirname, '../../processed/thumbnails'),
        size: '200x?'  // 200px width, auto height
      })
      .on('end', () => {
        console.log(`Thumbnail generated at ${thumbnailPath}`);
        resolve(thumbnailPath);
      })
      .on('error', (err) => {
        console.error('Error generating thumbnail:', err);
        reject(err);
      });
  });

  // Then, convert the video
  const videoPromise = new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputFormat('avi')
      .videoCodec('libx264')
      .output(outputPath)
      .on('progress', (progress) => {
        console.log(`============> Processing: ${progress.percent?.toFixed(2)}% done`);
      })
      .on('end', () => {
        console.log(`=============> Video processed at ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('=========== > Error processing video:', err);
        reject(err);
      })
      .run();
  });

  try {
    // Wait for both operations to complete
    const [thumbnail, video] = await Promise.all([thumbnailPromise, videoPromise]);
    
    return {
      fileId,
      outputPath: video,
      thumbnailPath: thumbnail,
      videoUrl: `/processed/videos/${fileId}.avi`,
      thumbnailUrl: `/processed/thumbnails/${fileId}.jpg`
    };
  } catch (error) {
    console.error('================> Error in video processing:', error);
    throw error;
  }
};


exports.cleanup = async (filePath) => {
  try {

    await fs.remove(filePath);
    console.log(`============> Removed original file: ${filePath}`);
  } catch (error) {
    console.error('==========> Error cleaning up after video processing:', error);
  }
};