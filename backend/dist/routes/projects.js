"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = __importDefault(require("../controllers/project.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => project_controller_1.default.createProject(req, res, next));
router.get('/', (req, res, next) => project_controller_1.default.getProjects(req, res, next));
router.get('/:id', (req, res, next) => project_controller_1.default.getProject(req, res, next));
router.patch('/:id', (req, res, next) => project_controller_1.default.updateProject(req, res, next));
router.delete('/:id', (req, res, next) => project_controller_1.default.deleteProject(req, res, next));
// Milestones
router.post('/:id/milestones', (req, res, next) => project_controller_1.default.addMilestone(req, res, next));
router.get('/:id/milestones', (req, res, next) => project_controller_1.default.getMilestones(req, res, next));
router.patch('/milestones/:milestoneId/approve', (req, res, next) => project_controller_1.default.approveMilestone(req, res, next));
exports.default = router;
//# sourceMappingURL=projects.js.map