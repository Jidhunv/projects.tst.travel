"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticket_controller_1 = __importDefault(require("../controllers/ticket.controller"));
const auth_1 = require("../middleware/auth");
const fileUpload_1 = require("../middleware/fileUpload");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => ticket_controller_1.default.createTicket(req, res, next));
router.get('/', (req, res, next) => ticket_controller_1.default.getTickets(req, res, next));
router.get('/:id', (req, res, next) => ticket_controller_1.default.getTicket(req, res, next));
router.patch('/:id', (req, res, next) => ticket_controller_1.default.updateTicket(req, res, next));
router.patch('/:id/assign', (req, res, next) => ticket_controller_1.default.assignTicket(req, res, next));
router.patch('/:id/resolve', (req, res, next) => ticket_controller_1.default.resolveTicket(req, res, next));
router.patch('/:id/close', (req, res, next) => ticket_controller_1.default.closeTicket(req, res, next));
router.delete('/:id', (req, res, next) => ticket_controller_1.default.deleteTicket(req, res, next));
router.post('/:id/upload', fileUpload_1.uploadMiddleware, (req, res, next) => ticket_controller_1.default.uploadAttachment(req, res, next));
exports.default = router;
//# sourceMappingURL=tickets.js.map