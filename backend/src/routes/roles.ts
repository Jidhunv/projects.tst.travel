import { Router } from 'express';
import RoleController from '../controllers/role.controller';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

// Get permissions endpoint - available to all authenticated users
router.get('/permissions/list', (req, res, next) => RoleController.getPermissions(req, res, next));

// All other role management is restricted to Admin
router.use(requireRole('Admin'));

router.post('/', (req, res, next) => RoleController.createRole(req, res, next));
router.get('/', (req, res, next) => RoleController.getRoles(req, res, next));
router.get('/:id', (req, res, next) => RoleController.getRole(req, res, next));
router.patch('/:id', (req, res, next) => RoleController.updateRole(req, res, next));
router.delete('/:id', (req, res, next) => RoleController.deleteRole(req, res, next));
router.patch('/:id/permissions', (req, res, next) => RoleController.assignPermissions(req, res, next));

export default router;
