"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_settings_controller_1 = __importDefault(require("../controllers/email-settings.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.use((0, auth_1.requireRole)('Admin'));
router.get('/', (req, res, next) => email_settings_controller_1.default.getSettings(req, res, next));
router.patch('/', (req, res, next) => email_settings_controller_1.default.updateSettings(req, res, next));
router.post('/test-connection', (req, res, next) => email_settings_controller_1.default.testConnection(req, res, next));
router.post('/send-test-email', (req, res, next) => email_settings_controller_1.default.sendTestEmail(req, res, next));
exports.default = router;
//# sourceMappingURL=email-settings.js.map