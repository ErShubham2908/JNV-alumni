const multer = require('multer');

const supportedMimeTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!supportedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Choose a JPEG, PNG, GIF, or WebP image.'));
    }

    cb(null, true);
  },
});

const getImageType = (buffer) => {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: 'image/png', extension: '.png' };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

  if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString('ascii'))) {
    return { mimeType: 'image/gif', extension: '.gif' };
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }

  return null;
};

const receiveImage = (fieldName) => (req, res, next) => {
  imageUpload.single(fieldName)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5 MB or smaller.'
        : error.message;
      return res.status(status).json({ message });
    }

    return res.status(400).json({ message: error.message });
  });
};

module.exports = { getImageType, receiveImage };
