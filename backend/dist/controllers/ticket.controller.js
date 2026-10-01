"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketController = void 0;
const ticket_service_1 = __importDefault(require("../services/ticket.service"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const pick_1 = __importDefault(require("../utils/pick"));
const logger_1 = __importDefault(require("../utils/logger"));
// resolvedAt/respondedAt are SLA timestamps stamped by the service -- letting
// a client set them allowed SLA compliance to be forged. ticketNumber is
// generated, reporterId fixed at creation, assignees set by /assign, and
// attachmentPaths by the upload route.
const TICKET_UPDATABLE = [
    'title',
    'description',
    'priority',
    'status',
    'category',
    'moduleType',
    'source',
    'accountId',
    'contactId',
    'productId',
    'resolutionNotes',
    'slaResponseHours',
    'slaResolutionHours',
];
class TicketController {
    async createTicket(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'create')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to create tickets');
            }
            const { title, description, priority, category, accountId, contactId, productId, moduleType, slaResponseHours, slaResolutionHours } = req.body;
            if (!title || !description || !accountId) {
                throw new errorHandler_1.AppError(400, 'Required fields: title, description, accountId');
            }
            const ticketData = {
                title,
                description,
                priority: priority || 'Medium',
                category,
                accountId,
                productId,
                moduleType,
                reporterId: req.user?.id || '',
                slaResponseHours,
                slaResolutionHours,
            };
            if (contactId) {
                ticketData.contact = { id: contactId };
            }
            const ticket = await ticket_service_1.default.createTicket(ticketData);
            logger_1.default.info(`Ticket created: ${ticket.ticketNumber} by ${req.user?.email}`);
            return res.status(201).json({ success: true, data: ticket });
        }
        catch (error) {
            next(error);
        }
    }
    async uploadAttachment(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                throw new errorHandler_1.AppError(400, 'No file uploaded');
            }
            const ticketId = req.params.id;
            const filePath = file.path;
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to attach files to tickets');
            }
            const record = await ticket_service_1.default.getTicketById(ticketId);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'attach files to', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);
            const ticket = await ticket_service_1.default.addAttachment(ticketId, filePath);
            logger_1.default.info(`Attachment added to ticket ${ticketId} by ${req.user?.email}`);
            return res.json({ success: true, data: ticket, path: filePath });
        }
        catch (error) {
            next(error);
        }
    }
    async getTickets(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view tickets');
            }
            const { page = 1, limit = 20, accountId, assigneeId, status, priority } = req.query;
            const { data, total } = await ticket_service_1.default.getTickets({
                page: Number(page),
                limit: Number(limit),
                accountId: accountId,
                assigneeId: assigneeId,
                status: status,
                priority: priority,
                // undefined at "all" scope; the user's id at "self" scope.
                scopeUserId: (0, auth_1.getOwnerScope)(req.user, 'tickets'),
            });
            return res.json({
                success: true,
                data,
                meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTicket(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'read')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to view tickets');
            }
            const ticket = await ticket_service_1.default.getTicketById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'view', ticket.account?.ownerId, [ticket.reporter?.id, ticket.assignee?.id, ticket.assigneeIds]);
            return res.json({ success: true, data: ticket });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTicket(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to update tickets');
            }
            const record = await ticket_service_1.default.getTicketById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'update', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);
            const ticket = await ticket_service_1.default.updateTicket(req.params.id, (0, pick_1.default)(req.body, TICKET_UPDATABLE));
            logger_1.default.info(`Ticket updated: ${ticket.id} by ${req.user?.email}`);
            return res.json({ success: true, data: ticket });
        }
        catch (error) {
            next(error);
        }
    }
    async assignTicket(req, res, next) {
        try {
            if (!(0, auth_1.canReassign)(req.user, 'tickets')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to assign tickets');
            }
            const ids = Array.isArray(req.body.assigneeIds)
                ? req.body.assigneeIds
                : req.body.assigneeId ? [req.body.assigneeId] : [];
            if (!ids.length) {
                throw new errorHandler_1.AppError(400, 'assigneeIds is required');
            }
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to assign tickets');
            }
            const record = await ticket_service_1.default.getTicketById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'assign', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);
            const ticket = await ticket_service_1.default.assignTicket(req.params.id, ids);
            logger_1.default.info(`Ticket assigned: ${ticket.id} to [${ids.join(', ')}] by ${req.user?.email}`);
            return res.json({ success: true, data: ticket });
        }
        catch (error) {
            next(error);
        }
    }
    async resolveTicket(req, res, next) {
        try {
            const { resolutionNotes } = req.body;
            if (!resolutionNotes) {
                throw new errorHandler_1.AppError(400, 'resolutionNotes is required');
            }
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to resolve tickets');
            }
            const record = await ticket_service_1.default.getTicketById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'resolve', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);
            const ticket = await ticket_service_1.default.resolveTicket(req.params.id, resolutionNotes);
            logger_1.default.info(`Ticket resolved: ${ticket.id} by ${req.user?.email}`);
            return res.json({ success: true, data: ticket });
        }
        catch (error) {
            next(error);
        }
    }
    async closeTicket(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'update')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to close tickets');
            }
            const record = await ticket_service_1.default.getTicketById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'close', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);
            const ticket = await ticket_service_1.default.closeTicket(req.params.id);
            logger_1.default.info(`Ticket closed: ${ticket.id} by ${req.user?.email}`);
            return res.json({ success: true, data: ticket });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteTicket(req, res, next) {
        try {
            if (!(0, auth_1.canPerformAction)(req.user, 'tickets', 'delete')) {
                throw new errorHandler_1.AppError(403, 'You do not have permission to delete tickets');
            }
            const record = await ticket_service_1.default.getTicketById(req.params.id);
            (0, auth_1.assertOwnsViaAccount)(req.user, 'tickets', 'delete', record.account?.ownerId, [record.reporter?.id, record.assignee?.id, record.assigneeIds]);
            await ticket_service_1.default.deleteTicket(req.params.id);
            logger_1.default.info(`Ticket deleted: ${req.params.id} by ${req.user?.email}`);
            return res.json({ success: true, data: { message: 'Ticket deleted' } });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TicketController = TicketController;
exports.default = new TicketController();
//# sourceMappingURL=ticket.controller.js.map