import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth';
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimit';
import { validateDTO } from '../middleware/validation';
import {
  LoginDTO,
  PasswordResetDTO,
  PasswordResetConfirmDTO,
  ChangePasswordDTO,
  ChangePasswordOnFirstLoginDTO,
  SetUserPasswordDTO,
} from '../dto/auth.dto';

const router = Router();

router.post('/login', loginLimiter, validateDTO(LoginDTO), (req, res, next) =>
  AuthController.login(req, res, next)
);
router.post('/logout', verifyToken, (req, res, next) =>
  AuthController.logout(req, res, next)
);
router.post('/password-reset', passwordResetLimiter, validateDTO(PasswordResetDTO), (req, res, next) =>
  AuthController.passwordReset(req, res, next)
);
router.post('/password-reset-confirm', passwordResetLimiter, validateDTO(PasswordResetConfirmDTO), (req, res, next) =>
  AuthController.passwordResetConfirm(req, res, next)
);
router.post('/change-password-first-login', verifyToken, validateDTO(ChangePasswordOnFirstLoginDTO), (req, res, next) =>
  AuthController.changePasswordOnFirstLogin(req, res, next)
);
router.post('/change-password', verifyToken, validateDTO(ChangePasswordDTO), (req, res, next) =>
  AuthController.changePassword(req, res, next)
);
router.post('/set-user-password', verifyToken, validateDTO(SetUserPasswordDTO), (req, res, next) =>
  AuthController.setUserPassword(req, res, next)
);

export default router;
