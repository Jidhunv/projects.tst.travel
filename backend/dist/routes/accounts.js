"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const account_controller_1 = __importDefault(require("../controllers/account.controller"));
const import_controller_1 = __importDefault(require("../controllers/import.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// MIDT bulk import only ever needs CSV/Excel; cap size well below what a
// legitimate prospect list needs (multer's bare `{ dest }` form has no size
// or type limit at all, unlike the hardened upload middleware used for
// ticket attachments).
const IMPORT_ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls'];
const upload = (0, multer_1.default)({
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB
    fileFilter: (req, file, cb) => {
        const ext = file.originalname.toLowerCase().split('.').pop() || '';
        if (!IMPORT_ALLOWED_EXTENSIONS.includes(ext)) {
            cb(new Error(`File type not allowed. Allowed types: ${IMPORT_ALLOWED_EXTENSIONS.join(', ')}`));
            return;
        }
        cb(null, true);
    },
});
router.use(auth_1.verifyToken);
router.post('/', (req, res, next) => account_controller_1.default.createAccount(req, res, next));
router.get('/', (req, res, next) => account_controller_1.default.getAccounts(req, res, next));
router.get('/:id', (req, res, next) => account_controller_1.default.getAccount(req, res, next));
router.patch('/:id', (req, res, next) => account_controller_1.default.updateAccount(req, res, next));
router.patch('/:id/assign', (req, res, next) => account_controller_1.default.assignAccount(req, res, next));
router.delete('/:id', (req, res, next) => account_controller_1.default.deleteAccount(req, res, next));
// Import routes (renamed from /midt/import to /import within /accounts path)
router.post('/import/preview', upload.single('file'), (req, res, next) => import_controller_1.default.previewMidtImport(req, res, next));
router.post('/import/save', (req, res, next) => import_controller_1.default.saveMidtImport(req, res, next));
// Contact routes
router.post('/:accountId/contacts', (req, res, next) => account_controller_1.default.addContact(req, res, next));
router.get('/:accountId/contacts', (req, res, next) => account_controller_1.default.getContacts(req, res, next));
router.patch('/:accountId/contacts/:contactId', (req, res, next) => account_controller_1.default.updateContact(req, res, next));
router.delete('/:accountId/contacts/:contactId', (req, res, next) => account_controller_1.default.deleteContact(req, res, next));
router.patch('/:accountId/contacts/:contactId/set-primary', (req, res, next) => account_controller_1.default.setPrimaryContact(req, res, next));
// Buying-committee onboarding routes
router.get('/:accountId/stakeholders', (req, res, next) => account_controller_1.default.getStakeholders(req, res, next));
router.put('/:accountId/stakeholders', (req, res, next) => account_controller_1.default.saveStakeholders(req, res, next));
router.get('/:accountId/onboarding-status', (req, res, next) => account_controller_1.default.getOnboardingStatus(req, res, next));
exports.default = router;
//# sourceMappingURL=accounts.js.map