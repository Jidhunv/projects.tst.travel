"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_controller_1 = __importDefault(require("../controllers/activity.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.verifyToken);
// Activities / follow-ups
router.post('/', (req, res, next) => activity_controller_1.default.createActivity(req, res, next));
router.get('/', (req, res, next) => activity_controller_1.default.getActivities(req, res, next));
router.get('/my-followups', (req, res, next) => activity_controller_1.default.getMyFollowUps(req, res, next));
router.patch('/:id/complete', (req, res, next) => activity_controller_1.default.completeActivity(req, res, next));
router.delete('/:id', (req, res, next) => activity_controller_1.default.deleteActivity(req, res, next));
// Notes / remarks / feedback
router.post('/notes', (req, res, next) => activity_controller_1.default.createNote(req, res, next));
router.get('/notes', (req, res, next) => activity_controller_1.default.getNotes(req, res, next));
router.delete('/notes/:id', (req, res, next) => activity_controller_1.default.deleteNote(req, res, next));
exports.default = router;
//# sourceMappingURL=activities.js.map