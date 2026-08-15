const multer = require('multer');
const path = require('path');
const fs = require('fs');

const file_directory = path.join(__dirname, '../uploads/documents');

function directory_checker(dirPath) {
  const directoryExists = fs.existsSync(dirPath);
  if (!directoryExists) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directory ${dirPath} created.`);
  }
}

directory_checker(file_directory);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, file_directory);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'image/jpeg',
    'image/png'
  ];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, and PNG files are allowed.'), false);
  }
};

const limit = {
  fileSize: 5 * 1024 * 1024 // 5 MB
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter, 
  limits: limit 
});

module.exports = upload;