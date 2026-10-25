"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const salesActivity_controller_1 = __importDefault(require("../controllers/salesActivity.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/summary', (req, res, next) => salesActivity_controller_1.default.getSummary(req, res, next));
router.get('/options', (req, res, next) => salesActivity_controller_1.default.getOptions(req, res, next));
exports.default = router;
//# sourceMappingURL=salesActivity.js.map