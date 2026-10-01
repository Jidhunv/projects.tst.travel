"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expense_controller_1 = __importDefault(require("../controllers/expense.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', (req, res, next) => expense_controller_1.default.list(req, res, next));
router.post('/', (req, res, next) => expense_controller_1.default.create(req, res, next));
router.patch('/:id', (req, res, next) => expense_controller_1.default.update(req, res, next));
router.post('/:id/decision', (req, res, next) => expense_controller_1.default.decide(req, res, next));
router.delete('/:id', (req, res, next) => expense_controller_1.default.remove(req, res, next));
exports.default = router;
//# sourceMappingURL=expenses.js.map