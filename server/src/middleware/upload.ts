import multer from 'multer';
import path from 'path';
import { ValidationError } from '../utils/errors';

// Use memory storage to capture files as Buffer streams
const storage = multer.memoryStorage();

const allowedExtensions = ['.xlsx', '.csv', '.json', '.pdf', '.docx', '.jpg', '.jpeg', '.png'];
const allowedMimeTypes = [
  // Spreadsheets/tabular
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/csv',
  'application/json',
  // Unstructured documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    // Validate Extension
    if (!allowedExtensions.includes(ext)) {
      return cb(new ValidationError(`Unsupported file extension: ${ext}`));
    }

    // Validate MIME Type
    if (!allowedMimeTypes.includes(mime)) {
      return cb(new ValidationError(`Unsupported MIME Type: ${mime}`));
    }

    cb(null, true);
  },
});
export default upload;
