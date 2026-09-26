const express = require('express');
const path = require('path');
const protect = require('../middleware/authMiddleware');
const { uploadImageToDrive } = require('../utils/googleDrive');
const { getImageType, receiveImage } = require('../utils/imageUpload');

const router = express.Router();

router.post('/profile-image', protect, receiveImage('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file was provided.' });
    }

    const imageType = getImageType(req.file.buffer);
    if (!imageType) {
      return res.status(400).json({ message: 'The selected file is not a supported image.' });
    }

    const correctedFile = {
      ...req.file,
      mimetype: imageType.mimeType,
      originalname: `${path.basename(req.file.originalname, path.extname(req.file.originalname))}${imageType.extension}`,
    };

    const imageUrl = await uploadImageToDrive(correctedFile);

    return res.json({
      url: imageUrl,
      message: 'Profile image uploaded successfully.',
    });
  } catch (error) {
    console.error('Upload profile image error:', error);

    if (error.code === 'GOOGLE_DRIVE_NOT_CONFIGURED') {
      return res.status(503).json({ message: error.message });
    }

    return res.status(502).json({
      message: 'Could not upload the profile image to Google Drive. Confirm the service account has access to the configured folder, then try again.',
    });
  }
});

module.exports = router;
