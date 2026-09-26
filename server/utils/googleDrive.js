const { google } = require('googleapis');
const { Readable } = require('stream');

const getDriveClient = () => {
  const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!serviceAccountEmail || !privateKey || !folderId) {
    const error = new Error('Google Drive upload is not configured. Set GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY in the project root .env file; the folder ID is already configured.');
    error.code = 'GOOGLE_DRIVE_NOT_CONFIGURED';
    throw error;
  }

  return google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    }),
  });
};

const uploadImageToDrive = async (file) => {
  const drive = getDriveClient();
  const safeFileName = `${Date.now()}-${(file.originalname || 'profile-image').replace(/\s+/g, '-')}`;

  const response = await drive.files.create({
    requestBody: {
      name: safeFileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: file.mimetype || 'application/octet-stream',
      body: Readable.from(file.buffer),
    },
    fields: 'id',
  });

  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    fields: 'id',
  });

  return `https://drive.google.com/uc?export=view&id=${response.data.id}`;
};

module.exports = { uploadImageToDrive };
