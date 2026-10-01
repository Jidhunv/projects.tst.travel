"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const team_controller_1 = __importDefault(require("../controllers/team.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// Any authenticated user may read the team list (needed for assignment dropdowns).
router.get('/', (req, res, next) => team_controller_1.default.list(req, res, next));
router.get('/:id/members', (req, res, next) => team_controller_1.default.members(req, res, next));
// Managing teams and membership is Admin-only.
router.post('/', (0, auth_1.requireRole)('Admin'), (req, res, next) => team_controller_1.default.create(req, res, next));
router.patch('/:id', (0, auth_1.requireRole)('Admin'), (req, res, next) => team_controller_1.default.update(req, res, next));
router.delete('/:id', (0, auth_1.requireRole)('Admin'), (req, res, next) => team_controller_1.default.remove(req, res, next));
router.post('/:id/members', (0, auth_1.requireRole)('Admin'), (req, res, next) => team_controller_1.default.addMember(req, res, next));
router.delete('/:id/members/:userId', (0, auth_1.requireRole)('Admin'), (req, res, next) => team_controller_1.default.removeMember(req, res, next));
exports.default = router;
//# sourceMappingURL=teams.js.map