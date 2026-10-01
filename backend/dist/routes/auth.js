"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
const validation_1 = require("../middleware/validation");
const auth_dto_1 = require("../dto/auth.dto");
const router = (0, express_1.Router)();
router.post('/login', rateLimit_1.loginLimiter, (0, validation_1.validateDTO)(auth_dto_1.LoginDTO), (req, res, next) => auth_controller_1.default.login(req, res, next));
router.post('/logout', auth_1.verifyToken, (req, res, next) => auth_controller_1.default.logout(req, res, next));
router.post('/password-reset', rateLimit_1.passwordResetLimiter, (0, validation_1.validateDTO)(auth_dto_1.PasswordResetDTO), (req, res, next) => auth_controller_1.default.passwordReset(req, res, next));
router.post('/password-reset-confirm', rateLimit_1.passwordResetLimiter, (0, validation_1.validateDTO)(auth_dto_1.PasswordResetConfirmDTO), (req, res, next) => auth_controller_1.default.passwordResetConfirm(req, res, next));
router.post('/change-password-first-login', auth_1.verifyToken, (0, validation_1.validateDTO)(auth_dto_1.ChangePasswordOnFirstLoginDTO), (req, res, next) => auth_controller_1.default.changePasswordOnFirstLogin(req, res, next));
router.post('/change-password', auth_1.verifyToken, (0, validation_1.validateDTO)(auth_dto_1.ChangePasswordDTO), (req, res, next) => auth_controller_1.default.changePassword(req, res, next));
router.post('/set-user-password', auth_1.verifyToken, (0, validation_1.validateDTO)(auth_dto_1.SetUserPasswordDTO), (req, res, next) => auth_controller_1.default.setUserPassword(req, res, next));
exports.default = router;
//# sourceMappingURL=auth.js.map