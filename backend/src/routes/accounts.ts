import { Router } from 'express';
import multer from 'multer';
import AccountController from '../controllers/account.controller';
import ImportController from '../controllers/import.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' });

router.use(verifyToken);

router.post('/', (req, res, next) => AccountController.createAccount(req, res, next));
router.get('/', (req, res, next) => AccountController.getAccounts(req, res, next));
router.get('/:id', (req, res, next) => AccountController.getAccount(req, res, next));
router.patch('/:id', (req, res, next) => AccountController.updateAccount(req, res, next));
router.patch('/:id/assign', (req, res, next) => AccountController.assignAccount(req, res, next));
router.delete('/:id', (req, res, next) => AccountController.deleteAccount(req, res, next));

// Import routes (renamed from /midt/import to /import within /accounts path)
router.post('/import/preview', upload.single('file'), (req, res, next) => ImportController.previewMidtImport(req as any, res, next));
router.post('/import/save', (req, res, next) => ImportController.saveMidtImport(req as any, res, next));

// Contact routes
router.post('/:accountId/contacts', (req, res, next) =>
  AccountController.addContact(req, res, next)
);
router.get('/:accountId/contacts', (req, res, next) =>
  AccountController.getContacts(req, res, next)
);
router.patch('/:accountId/contacts/:contactId', (req, res, next) =>
  AccountController.updateContact(req, res, next)
);
router.delete('/:accountId/contacts/:contactId', (req, res, next) =>
  AccountController.deleteContact(req, res, next)
);
router.patch('/:accountId/contacts/:contactId/set-primary', (req, res, next) =>
  AccountController.setPrimaryContact(req, res, next)
);

export default router;
