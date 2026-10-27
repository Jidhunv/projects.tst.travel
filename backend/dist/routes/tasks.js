"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = __importDefault(require("../controllers/task.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/assignees', (req, res, next) => task_controller_1.default.assignees(req, res, next));
router.get('/', (req, res, next) => task_controller_1.default.list(req, res, next));
router.get('/:id', (req, res, next) => task_controller_1.default.get(req, res, next));
router.post('/', (req, res, next) => task_controller_1.default.create(req, res, next));
router.patch('/:id', (req, res, next) => task_controller_1.default.update(req, res, next));
router.delete('/:id', (req, res, next) => task_controller_1.default.remove(req, res, next));
exports.default = router;
//# sourceMappingURL=tasks.js.map