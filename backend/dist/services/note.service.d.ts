import { Note } from '../models/Note';
export declare class NoteService {
    private noteRepository;
    createNote(data: {
        content: string;
        resourceType: string;
        resourceId: string;
        createdById: string;
    }): Promise<Note>;
    getNotesForResource(resourceType: string, resourceId: string): Promise<Note[]>;
    deleteNote(id: string): Promise<void>;
}
declare const _default: NoteService;
export default _default;
//# sourceMappingURL=note.service.d.ts.map