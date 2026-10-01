import { Team } from '../models/Team';
export declare class TeamService {
    private repo;
    list(): Promise<Team[]>;
    getById(id: string): Promise<Team>;
    create(data: {
        name: string;
        description?: string;
    }): Promise<Team>;
    update(id: string, data: {
        name?: string;
        description?: string;
    }): Promise<Team>;
    remove(id: string): Promise<void>;
    getUserTeamIds(userId: string): Promise<string[]>;
    addUserToTeam(userId: string, teamId: string): Promise<void>;
    removeUserFromTeam(userId: string, teamId: string): Promise<void>;
    setUserTeams(userId: string, teamIds: string[]): Promise<void>;
    getSupervisedTeamIds(userId: string): Promise<string[]>;
    setUserSupervisedTeams(userId: string, teamIds: string[]): Promise<void>;
    getSupervisedMemberUserIds(userId: string): Promise<string[]>;
    members(teamId: string): Promise<Array<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
    }>>;
}
declare const _default: TeamService;
export default _default;
//# sourceMappingURL=team.service.d.ts.map