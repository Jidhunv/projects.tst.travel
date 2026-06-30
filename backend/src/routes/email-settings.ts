import { Router } from 'express';
import emailSettingsController from '../controllers/email-settings.controller';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.use(requireRole('Admin'));

router.get('/', (req, res, next) => emailSettingsController.getSettings(req, res, next));

router.patch('/', (req, res, next) => emailSettingsController.updateSettings(req, res, next));

router.post('/test-connection', (req, res, next) => emailSettingsController.testConnection(req, res, next));

router.post('/send-test-email', (req, res, next) => emailSettingsController.sendTestEmail(req, res, next));

export default router;
