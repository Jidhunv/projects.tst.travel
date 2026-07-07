import { Router } from 'express';
import TicketController from '../controllers/ticket.controller';
import { verifyToken } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/fileUpload';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => TicketController.createTicket(req, res, next));
router.get('/', (req, res, next) => TicketController.getTickets(req, res, next));
router.get('/:id', (req, res, next) => TicketController.getTicket(req, res, next));
router.patch('/:id', (req, res, next) => TicketController.updateTicket(req, res, next));
router.patch('/:id/assign', (req, res, next) => TicketController.assignTicket(req, res, next));
router.patch('/:id/resolve', (req, res, next) => TicketController.resolveTicket(req, res, next));
router.patch('/:id/close', (req, res, next) => TicketController.closeTicket(req, res, next));
router.delete('/:id', (req, res, next) => TicketController.deleteTicket(req, res, next));
router.post('/:id/upload', uploadMiddleware, (req, res, next) => TicketController.uploadAttachment(req, res, next));

export default router;
