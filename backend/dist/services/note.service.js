"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoteService = void 0;
const database_1 = require("../config/database");
const Note_1 = require("../models/Note");
const errorHandler_1 = require("../middleware/errorHandler");
const constants_1 = require("../utils/constants");
class NoteService {
    constructor() {
        this.noteRepository = database_1.AppDataSource.getRepository(Note_1.Note);
    }
    async createNote(data) {
        if (!constants_1.RESOURCE_TYPES.includes(data.resourceType)) {
            throw new errorHandler_1.AppError(400, `Invalid resource type. Allowed: ${constants_1.RESOURCE_TYPES.join(', ')}`);
        }
        if (!data.content || !data.content.trim()) {
            throw new errorHandler_1.AppError(400, 'Note content is required');
        }
        const note = this.noteRepository.create(data);
        return await this.noteRepository.save(note);
    }
    async getNotesForResource(resourceType, resourceId) {
        return await this.noteRepository.find({
            where: { resourceType, resourceId },
            relations: ['createdBy'],
            order: { createdAt: 'DESC' },
        });
    }
    async deleteNote(id) {
        const note = await this.noteRepository.findOne({ where: { id } });
        if (!note) {
            throw new errorHandler_1.AppError(404, 'Note not found');
        }
        await this.noteRepository.remove(note);
    }
}
exports.NoteService = NoteService;
exports.default = new NoteService();
//# sourceMappingURL=note.service.js.map