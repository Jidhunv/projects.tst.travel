import { Router } from 'express';
import ContractController from '../controllers/contract.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.post('/', (req, res, next) => ContractController.createContract(req, res, next));
router.get('/', (req, res, next) => ContractController.getContracts(req, res, next));
router.get('/:id', (req, res, next) => ContractController.getContract(req, res, next));
router.patch('/:id', (req, res, next) => ContractController.updateContract(req, res, next));
router.patch('/:id/approve', (req, res, next) => ContractController.approveContract(req, res, next));
router.delete('/:id', (req, res, next) => ContractController.deleteContract(req, res, next));

export default router;
