const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');
const pinataService = require('../services/pinataService');

/**
 * @route   POST /api/v1/upload/ipfs
 * @desc    Upload file to IPFS via Pinata
 * @access  Public (can add auth later)
 */
router.post('/ipfs', upload.single('file'), async (req, res) => {
  try {
    console.log('=== IPFS Upload Request ===');
    console.log('File received:', req.file ? 'YES' : 'NO');
    console.log('Body:', req.body);
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    console.log('File details:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    });

    const filename = req.body.filename || req.file.originalname;
    const metadata = {
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      uploadedAt: new Date().toISOString()
    };

    console.log('Calling pinataService.uploadFile...');
    // Upload to Pinata
    const result = await pinataService.uploadFile(
      req.file.buffer,
      filename,
      metadata
    );

    console.log('Upload successful, returning result');
    res.status(200).json({
      success: true,
      message: 'File uploaded to IPFS successfully',
      data: result
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file to IPFS'
    });
  }
});

/**
 * @route   POST /api/v1/upload/ipfs/json
 * @desc    Upload JSON metadata to IPFS via Pinata
 * @access  Public
 */
router.post('/ipfs/json', async (req, res) => {
  try {
    const jsonData = req.body;
    const name = req.body.name || 'metadata.json';

    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON data'
      });
    }

    const result = await pinataService.uploadJSON(jsonData, name);

    res.status(200).json({
      success: true,
      message: 'JSON uploaded to IPFS successfully',
      data: result
    });
  } catch (error) {
    console.error('IPFS JSON upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload JSON to IPFS'
    });
  }
});

module.exports = router;
