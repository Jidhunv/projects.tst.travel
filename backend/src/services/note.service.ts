import { AppDataSource } from '../config/database';
import { Note } from '../models/Note';
import { AppError } from '../middleware/errorHandler';
import { RESOURCE_TYPES } from '../utils/constants';

export class NoteService {
  private noteRepository = AppDataSource.getRepository(Note);

  async createNote(data: {
    content: string;
    resourceType: string;
    resourceId: string;
    createdById: string;
  }): Promise<Note> {
    if (!RESOURCE_TYPES.includes(data.resourceType as never)) {
      throw new AppError(400, `Invalid resource type. Allowed: ${RESOURCE_TYPES.join(', ')}`);
    }
    if (!data.content || !data.content.trim()) {
      throw new AppError(400, 'Note content is required');
    }

    const note = this.noteRepository.create(data);
    return await this.noteRepository.save(note);
  }

  async getNotesForResource(resourceType: string, resourceId: string): Promise<Note[]> {
    return await this.noteRepository.find({
      where: { resourceType, resourceId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteNote(id: string): Promise<void> {
    const note = await this.noteRepository.findOne({ where: { id } });
    if (!note) {
      throw new AppError(404, 'Note not found');
    }
    await this.noteRepository.remove(note);
  }
}

export default new NoteService();
