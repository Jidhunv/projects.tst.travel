export interface CommitteeMemberInput {
    role: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    designationId?: string | null;
}
export interface CommitteeMember {
    role: string;
    name: string;
    email: string | null;
    phone: string | null;
    designationId?: string;
}
export declare function normaliseCommittee(members: CommitteeMemberInput[]): CommitteeMember[];
export declare function hasCommitteeMember(rows: Array<{
    name?: string | null;
}>): boolean;
//# sourceMappingURL=buyingCommittee.d.ts.map