import { Router } from 'express';
import C from '../controllers/performance.controller';
import { verifyToken } from '../middleware/auth';

// Mounted at /api/performance: sales statistics, targets, and staff KPIs.
const router = Router();
router.use(verifyToken);

router.get('/overview', (req, res, next) => C.overview(req, res, next));

router.get('/targets', (req, res, next) => C.listTargets(req, res, next));
router.post('/targets', (req, res, next) => C.createTarget(req, res, next));
router.patch('/targets/:id', (req, res, next) => C.updateTarget(req, res, next));
router.delete('/targets/:id', (req, res, next) => C.deleteTarget(req, res, next));

router.get('/kpi-master', (req, res, next) => C.listMaster(req, res, next));
router.post('/kpi-master', (req, res, next) => C.createMaster(req, res, next));
router.patch('/kpi-master/:id', (req, res, next) => C.updateMaster(req, res, next));
router.delete('/kpi-master/:id', (req, res, next) => C.deleteMaster(req, res, next));

router.get('/kpis', (req, res, next) => C.listDefinitions(req, res, next));
router.post('/kpis/copy', (req, res, next) => C.copyDefinitions(req, res, next));
router.post('/kpis', (req, res, next) => C.createDefinition(req, res, next));
router.patch('/kpis/:id', (req, res, next) => C.updateDefinition(req, res, next));
router.delete('/kpis/:id', (req, res, next) => C.deleteDefinition(req, res, next));

router.get('/kpi-summary', (req, res, next) => C.kpiSummary(req, res, next));
router.get('/kpi-entries', (req, res, next) => C.listEntries(req, res, next));
router.post('/kpi-entries', (req, res, next) => C.createEntry(req, res, next));
router.patch('/kpi-entries/:id', (req, res, next) => C.updateEntry(req, res, next));
router.delete('/kpi-entries/:id', (req, res, next) => C.deleteEntry(req, res, next));

router.get('/projections', (req, res, next) => C.listProjections(req, res, next));
router.put('/projections', (req, res, next) => C.saveProjection(req, res, next));
router.delete('/projections/:id', (req, res, next) => C.deleteProjection(req, res, next));

router.get('/kpi-audit', (req, res, next) => C.auditTrail(req, res, next));
router.get('/meeting-report', (req, res, next) => C.meetingReport(req, res, next));

export default router;
