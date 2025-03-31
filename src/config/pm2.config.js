module.exports = {
    apps: [
      {
        name: "media-app-api",
        script: "./src/app.js",
        instances: "max",
        exec_mode: "cluster",
        watch: false,
        env: {
          NODE_ENV: "production",
          PORT: 5000
        },
        env_development: {
          NODE_ENV: "development",
          PORT: 5000
        }
      },
      {
        name: "media-app-image-worker",
        script: "./src/workers/imageWorker.js",
        instances: 2,
        exec_mode: "fork",
        watch: false,
        env: {
          NODE_ENV: "production",
          QUEUE_CONCURRENCY: 2
        }
      },
      {
        name: "media-app-video-worker",
        script: "./src/workers/videoWorker.js",
        instances: 2,
        exec_mode: "fork",
        watch: false,
        env: {
          NODE_ENV: "production",
          QUEUE_CONCURRENCY: 1
        }
      }
    ]
  };