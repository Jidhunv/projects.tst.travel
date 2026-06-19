import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { verifyToken, requireRole } from '../middleware/auth';
import { ROLES_CAN_MANAGE_USERS } from '../utils/constants';

const router = Router();

router.use(verifyToken);
// All user management is restricted to Admin/Manager
router.use(requireRole(...ROLES_CAN_MANAGE_USERS));

router.post('/', (req, res, next) => UserController.createUser(req, res, next));
router.get('/', (req, res, next) => UserController.getUsers(req, res, next));
router.get('/:id', (req, res, next) => UserController.getUser(req, res, next));
router.patch('/:id', (req, res, next) => UserController.updateUser(req, res, next));
router.patch('/:id/activate', (req, res, next) => UserController.activateUser(req, res, next));
router.patch('/:id/deactivate', (req, res, next) =>
  UserController.deactivateUser(req, res, next)
);
router.patch('/:id/change-password', (req, res, next) => UserController.changePassword(req, res, next));
router.delete('/:id', (req, res, next) => UserController.deleteUser(req, res, next));

export default router;
