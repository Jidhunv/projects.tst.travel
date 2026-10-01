"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
const database_1 = require("../config/database");
const Team_1 = require("../models/Team");
const errorHandler_1 = require("../middleware/errorHandler");
class TeamService {
    constructor() {
        this.repo = database_1.AppDataSource.getRepository(Team_1.Team);
    }
    async list() {
        return this.repo.find({ order: { name: 'ASC' } });
    }
    async getById(id) {
        const team = await this.repo.findOne({ where: { id } });
        if (!team)
            throw new errorHandler_1.AppError(404, 'Team not found');
        return team;
    }
    async create(data) {
        if (!data.name?.trim())
            throw new errorHandler_1.AppError(400, 'Team name is required');
        const team = this.repo.create({ name: data.name.trim(), description: data.description });
        return this.repo.save(team);
    }
    async update(id, data) {
        const team = await this.getById(id);
        if (data.name !== undefined)
            team.name = data.name.trim();
        if (data.description !== undefined)
            team.description = data.description;
        return this.repo.save(team);
    }
    async remove(id) {
        const team = await this.getById(id);
        // user_teams rows cascade-delete, so removing a team just drops its
        // memberships; the users themselves are untouched.
        await this.repo.remove(team);
    }
    // --- Membership (many-to-many via user_teams) ---
    async getUserTeamIds(userId) {
        const rows = await this.repo.query('SELECT "teamId" FROM user_teams WHERE "userId" = $1', [userId]);
        return rows.map((r) => r.teamId);
    }
    async addUserToTeam(userId, teamId) {
        await this.getById(teamId); // 404 if invalid
        await this.repo.query('INSERT INTO user_teams ("userId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, teamId]);
    }
    async removeUserFromTeam(userId, teamId) {
        await this.repo.query('DELETE FROM user_teams WHERE "userId" = $1 AND "teamId" = $2', [userId, teamId]);
    }
    // Replace a user's group membership with the given set of team ids.
    async setUserTeams(userId, teamIds) {
        const unique = [...new Set((teamIds || []).filter(Boolean))];
        for (const tid of unique)
            await this.getById(tid); // 404 if any invalid
        await this.repo.query('DELETE FROM user_teams WHERE "userId" = $1', [userId]);
        for (const tid of unique) {
            await this.repo.query('INSERT INTO user_teams ("userId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, tid]);
        }
    }
    // --- Supervisor relationship (team_supervisors) ---
    async getSupervisedTeamIds(userId) {
        const rows = await this.repo.query('SELECT "teamId" FROM team_supervisors WHERE "userId" = $1', [userId]);
        return rows.map((r) => r.teamId);
    }
    // Replace the set of teams a user supervises.
    async setUserSupervisedTeams(userId, teamIds) {
        const unique = [...new Set((teamIds || []).filter(Boolean))];
        for (const tid of unique)
            await this.getById(tid); // 404 if any invalid
        await this.repo.query('DELETE FROM team_supervisors WHERE "userId" = $1', [userId]);
        for (const tid of unique) {
            await this.repo.query('INSERT INTO team_supervisors ("userId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, tid]);
        }
    }
    // Owner ids a supervisor may see automatically: the members (user_teams) of
    // every team the supervisor supervises. One-directional; empty if they
    // supervise nothing.
    async getSupervisedMemberUserIds(userId) {
        const rows = await this.repo.query(`SELECT DISTINCT ut."userId"
         FROM team_supervisors ts
         JOIN user_teams ut ON ut."teamId" = ts."teamId"
        WHERE ts."userId" = $1`, [userId]);
        return rows.map((r) => r.userId);
    }
    // Members of a team (for the Teams page member list).
    async members(teamId) {
        return this.repo.query(`SELECT u.id, u.email, u."firstName", u."lastName"
         FROM users u JOIN user_teams ut ON ut."userId" = u.id
        WHERE ut."teamId" = $1
        ORDER BY u."firstName"`, [teamId]);
    }
}
exports.TeamService = TeamService;
exports.default = new TeamService();
//# sourceMappingURL=team.service.js.map