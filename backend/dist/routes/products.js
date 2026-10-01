"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = __importDefault(require("../controllers/product.controller"));
const auth_1 = require("../middleware/auth");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// Everyone can read the catalog
router.get('/', (req, res, next) => product_controller_1.default.getProducts(req, res, next));
router.get('/:id', (req, res, next) => product_controller_1.default.getProduct(req, res, next));
// Only Admin/Manager can manage the catalog
router.post('/', (0, auth_1.requireRole)(constants_1.ROLES.ADMIN, constants_1.ROLES.MANAGER), (req, res, next) => product_controller_1.default.createProduct(req, res, next));
router.patch('/:id', (0, auth_1.requireRole)(constants_1.ROLES.ADMIN, constants_1.ROLES.MANAGER), (req, res, next) => product_controller_1.default.updateProduct(req, res, next));
router.delete('/:id', (0, auth_1.requireRole)(constants_1.ROLES.ADMIN, constants_1.ROLES.MANAGER), (req, res, next) => product_controller_1.default.deleteProduct(req, res, next));
exports.default = router;
//# sourceMappingURL=products.js.map