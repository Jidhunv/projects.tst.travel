"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const country_controller_1 = __importDefault(require("../controllers/country.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/countries - any authenticated user (reference data for dropdowns)
router.get('/', auth_1.verifyToken, (req, res, next) => country_controller_1.default.list(req, res, next));
// POST /api/countries - admin only
router.post('/', auth_1.verifyToken, (req, res, next) => country_controller_1.default.create(req, res, next));
exports.default = router;
//# sourceMappingURL=countries.js.map