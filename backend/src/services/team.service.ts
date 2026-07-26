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

  async create(data: { name: string; description?: string }): Promise<Team> {
    if (!data.name?.trim()) throw new AppError(400, 'Team name is required');
    const team = this.repo.create({ name: data.name.trim(), description: data.description });
    return this.repo.save(team);
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Team> {
    const team = await this.getById(id);
    if (data.name !== undefined) team.name = data.name.trim();
    if (data.description !== undefined) team.description = data.description;
    return this.repo.save(team);
  }

  async remove(id: string): Promise<void> {
    const team = await this.getById(id);
    // user_teams rows cascade-delete, so removing a team just drops its
    // memberships; the users themselves are untouched.
    await this.repo.remove(team);
  }

  // --- Membership (many-to-many via user_teams) ---

  async getUserTeamIds(userId: string): Promise<string[]> {
    const rows: Array<{ teamId: string }> = await this.repo.query(
      'SELECT "teamId" FROM user_teams WHERE "userId" = $1',
      [userId]
    );
    return rows.map((r) => r.teamId);
  }

  async addUserToTeam(userId: string, teamId: string): Promise<void> {
    await this.getById(teamId); // 404 if invalid
    await this.repo.query(
      'INSERT INTO user_teams ("userId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, teamId]
    );
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<void> {
    await this.repo.query('DELETE FROM user_teams WHERE "userId" = $1 AND "teamId" = $2', [userId, teamId]);
  }

  // Replace a user's group membership with the given set of team ids.
  async setUserTeams(userId: string, teamIds: string[]): Promise<void> {
    const unique = [...new Set((teamIds || []).filter(Boolean))];
    for (const tid of unique) await this.getById(tid); // 404 if any invalid
    await this.repo.query('DELETE FROM user_teams WHERE "userId" = $1', [userId]);
    for (const tid of unique) {
      await this.repo.query(
        'INSERT INTO user_teams ("userId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, tid]
      );
    }
  }

  // The users this member may see under "team" scope: everyone who shares at
  // least one group with them (this set includes the user themselves when they
  // belong to any group; empty when they belong to none).
  async getCoMemberUserIds(userId: string): Promise<string[]> {
    const rows: Array<{ userId: string }> = await this.repo.query(
      `SELECT DISTINCT ut2."userId"
         FROM user_teams ut1
         JOIN user_teams ut2 ON ut1."teamId" = ut2."teamId"
        WHERE ut1."userId" = $1`,
      [userId]
    );
    return rows.map((r) => r.userId);
  }

  // Members of a team (for the Teams page member list).
  async members(teamId: string): Promise<Array<{ id: string; email: string; firstName: string; lastName: string }>> {
    return this.repo.query(
      `SELECT u.id, u.email, u."firstName", u."lastName"
         FROM users u JOIN user_teams ut ON ut."userId" = u.id
        WHERE ut."teamId" = $1
        ORDER BY u."firstName"`,
      [teamId]
    );
  }
}

export default new TeamService();
