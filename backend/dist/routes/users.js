"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("../controllers/user.controller"));
const auth_1 = require("../middleware/auth");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// Public endpoint - users can view their own profile
router.get('/me', (req, res, next) => user_controller_1.default.getSelf(req, res, next));
// All user management is restricted to Admin/Manager
router.use((0, auth_1.requireRole)(...constants_1.ROLES_CAN_MANAGE_USERS));
router.post('/', (req, res, next) => user_controller_1.default.createUser(req, res, next));
router.get('/', (req, res, next) => user_controller_1.default.getUsers(req, res, next));
router.get('/:id', (req, res, next) => user_controller_1.default.getUser(req, res, next));
router.patch('/:id', (req, res, next) => user_controller_1.default.updateUser(req, res, next));
router.patch('/:id/activate', (req, res, next) => user_controller_1.default.activateUser(req, res, next));
router.patch('/:id/deactivate', (req, res, next) => user_controller_1.default.deactivateUser(req, res, next));
router.patch('/:id/change-password', (req, res, next) => user_controller_1.default.changePassword(req, res, next));
router.post('/:id/reset-password', (req, res, next) => user_controller_1.default.resetPassword(req, res, next));
router.post('/:id/send-invite', (req, res, next) => user_controller_1.default.sendInviteEmail(req, res, next));
router.delete('/:id', (req, res, next) => user_controller_1.default.deleteUser(req, res, next));
exports.default = router;
//# sourceMappingURL=users.js.map