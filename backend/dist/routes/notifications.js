"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = __importDefault(require("../controllers/notification.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', (req, res, next) => notification_controller_1.default.getNotifications(req, res, next));
router.get('/count/unread', (req, res, next) => notification_controller_1.default.getUnreadCount(req, res, next));
router.patch('/:id/read', (req, res, next) => notification_controller_1.default.markAsRead(req, res, next));
router.patch('/mark-all/read', (req, res, next) => notification_controller_1.default.markAllAsRead(req, res, next));
router.delete('/:id', (req, res, next) => notification_controller_1.default.deleteNotification(req, res, next));
exports.default = router;
//# sourceMappingURL=notifications.js.map