import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/login', (req, res, next) => AuthController.login(req, res, next));
router.post('/logout', verifyToken, (req, res, next) =>
  AuthController.logout(req, res, next)
);
router.post('/password-reset', (req, res, next) =>
  AuthController.passwordReset(req, res, next)
);
router.post('/password-reset-confirm', (req, res, next) =>
  AuthController.passwordResetConfirm(req, res, next)
);

export default router;
