import { Router } from 'express';
import { fileController } from '../controllers/fileController';
import multer from 'multer';

const router = Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }
});

// Routes
router.post('/upload', upload.single('file'), fileController.uploadFile.bind(fileController));
router.post('/upload-multiple', upload.array('files', 5), fileController.uploadMultipleFiles.bind(fileController));
router.get('/', fileController.listFiles.bind(fileController));
router.get('/stats', fileController.getFileStats.bind(fileController));
router.get('/:id', fileController.getFile.bind(fileController));
router.get('/:id/download', fileController.downloadFile.bind(fileController));
router.get('/:id/url', fileController.getFileUrl.bind(fileController));
router.delete('/:id', fileController.deleteFile.bind(fileController));
router.post('/:id/share', fileController.shareFile.bind(fileController));

export default router;
