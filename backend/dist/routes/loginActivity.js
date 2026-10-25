"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loginActivity_controller_1 = __importDefault(require("../controllers/loginActivity.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Who logged in, from where, and when is sensitive - Admin only, like the audit log.
router.use(auth_1.verifyToken);
router.use((0, auth_1.requireRole)('Admin'));
router.get('/', (req, res, next) => loginActivity_controller_1.default.list(req, res, next));
exports.default = router;
//# sourceMappingURL=loginActivity.js.map