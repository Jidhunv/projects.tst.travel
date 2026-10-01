"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_category_controller_1 = __importDefault(require("../controllers/product-category.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.get('/', (req, res, next) => product_category_controller_1.default.list(req, res, next));
router.post('/', (req, res, next) => product_category_controller_1.default.create(req, res, next));
router.patch('/:id', (req, res, next) => product_category_controller_1.default.update(req, res, next));
router.delete('/:id', (req, res, next) => product_category_controller_1.default.remove(req, res, next));
exports.default = router;
//# sourceMappingURL=product-categories.js.map