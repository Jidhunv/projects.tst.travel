"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const role_controller_1 = __importDefault(require("../controllers/role.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// Get permissions endpoint - available to all authenticated users
router.get('/permissions/list', (req, res, next) => role_controller_1.default.getPermissions(req, res, next));
// All other role management is restricted to Admin
router.use((0, auth_1.requireRole)('Admin'));
router.post('/', (req, res, next) => role_controller_1.default.createRole(req, res, next));
router.get('/', (req, res, next) => role_controller_1.default.getRoles(req, res, next));
router.get('/:id', (req, res, next) => role_controller_1.default.getRole(req, res, next));
router.patch('/:id', (req, res, next) => role_controller_1.default.updateRole(req, res, next));
router.delete('/:id', (req, res, next) => role_controller_1.default.deleteRole(req, res, next));
router.patch('/:id/permissions', (req, res, next) => role_controller_1.default.assignPermissions(req, res, next));
exports.default = router;
//# sourceMappingURL=roles.js.map