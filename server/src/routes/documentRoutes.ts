import { Router } from 'express';
import { 
  uploadDocument, listDocuments, getDocumentDetails, getDocumentPreview,
  updateDocument, deleteDocument, restoreDocumentVersion, downloadDocument 
} from '../controllers/documentController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Apply auth middleware to protect all document endpoints
router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocumentDetails);
router.get('/:id/preview', getDocumentPreview);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/restore', restoreDocumentVersion);
router.get('/:id/download', downloadDocument);

export default router;
