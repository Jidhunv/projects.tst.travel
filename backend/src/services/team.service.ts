import { AppDataSource } from '../config/database';
import { Team } from '../models/Team';
import { AppError } from '../middleware/errorHandler';

export class TeamService {
  private repo = AppDataSource.getRepository(Team);

  async list(): Promise<Team[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async getById(id: string): Promise<Team> {
    const team = await this.repo.findOne({ where: { id } });
    if (!team) throw new AppError(404, 'Team not found');
    return team;
  }

  async create(data: { name: string; description?: string; parentTeamId?: string }): Promise<Team> {
    if (!data.name?.trim()) throw new AppError(400, 'Team name is required');
    if (data.parentTeamId) await this.getById(data.parentTeamId); // 404 if invalid
    const team = this.repo.create({
      name: data.name.trim(),
      description: data.description,
      parentTeamId: data.parentTeamId || undefined,
    });
    return this.repo.save(team);
  }

  async update(id: string, data: { name?: string; description?: string; parentTeamId?: string | null }): Promise<Team> {
    const team = await this.getById(id);
    if (data.parentTeamId) {
      if (data.parentTeamId === id) throw new AppError(400, 'A team cannot be its own parent');
      // Prevent cycles: the new parent must not be a descendant of this team.
      const descendants = await this.getSubtreeTeamIds(id);
      if (descendants.includes(data.parentTeamId)) {
        throw new AppError(400, 'Cannot set a descendant team as the parent (would create a cycle)');
      }
      await this.getById(data.parentTeamId);
    }
    if (data.name !== undefined) team.name = data.name.trim();
    if (data.description !== undefined) team.description = data.description;
    if (data.parentTeamId !== undefined) team.parentTeamId = (data.parentTeamId || null) as any;
    return this.repo.save(team);
  }

  async remove(id: string): Promise<void> {
    const team = await this.getById(id);
    // Child teams and member users/accounts have ON DELETE SET NULL, so removing
    // a team detaches them rather than cascading a delete.
    await this.repo.remove(team);
  }

  // Return the given team's id plus every descendant team id (whole sub-tree),
  // using a recursive CTE. This is what powers "team" scope visibility.
  async getSubtreeTeamIds(teamId: string): Promise<string[]> {
    const rows: Array<{ id: string }> = await this.repo.query(
      `WITH RECURSIVE subtree AS (
         SELECT id FROM teams WHERE id = $1
         UNION ALL
         SELECT t.id FROM teams t JOIN subtree s ON t."parentTeamId" = s.id
       )
       SELECT id FROM subtree`,
      [teamId]
    );
    return rows.map((r) => r.id);
  }
}

export default new TeamService();
