"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contract_controller_1 = __importDefault(require("../controllers/contract.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => contract_controller_1.default.createContract(req, res, next));
router.get('/', (req, res, next) => contract_controller_1.default.getContracts(req, res, next));
router.get('/:id', (req, res, next) => contract_controller_1.default.getContract(req, res, next));
router.patch('/:id', (req, res, next) => contract_controller_1.default.updateContract(req, res, next));
router.patch('/:id/approve', (req, res, next) => contract_controller_1.default.approveContract(req, res, next));
router.delete('/:id', (req, res, next) => contract_controller_1.default.deleteContract(req, res, next));
exports.default = router;
//# sourceMappingURL=contracts.js.map