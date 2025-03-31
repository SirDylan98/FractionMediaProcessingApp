const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Lets get the envs
dotenv.config();


const mediaRoutes = require('./routes/mediaRoutes');


const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev'));//

// here we are making sure that all folders are present
const dirs = [
  path.join(__dirname, '../uploads/images'),
  path.join(__dirname, '../uploads/videos'),
  path.join(__dirname, '../processed/images'),
  path.join(__dirname, '../processed/videos'),
  path.join(__dirname, '../processed/thumbnails')
];

dirs.forEach(dir => {
  fs.ensureDirSync(dir);
  console.log(`Directory created/confirmed: ${dir}`);
});

// Routes
app.use('/api/media', mediaRoutes);

// Simple health check heartbeat api
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;