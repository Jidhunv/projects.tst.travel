import { EmailSettings } from '../models/EmailSettings';
import { User } from '../models/User';
declare class EmailService {
    private emailSettingsRepository;
    private templatesDir;
    private cache;
    getEmailConfig(): Promise<EmailSettings | null>;
    sendEmail(to: string, subject: string, templateName: string, variables?: Record<string, any>): Promise<void>;
    private renderTemplate;
    sendPasswordResetEmail(user: User, resetToken: string): Promise<void>;
    sendTemporaryPasswordEmail(user: User, tempPassword: string, invitedBy?: User): Promise<void>;
    sendLeadAssignmentEmail(lead: any, assignedUser: User): Promise<void>;
    sendOpportunityUpdateEmail(opportunity: any, assignedUser: User, changeType: string, oldStage?: string): Promise<void>;
    sendTicketAssignmentEmail(ticket: any, assignedUser: User): Promise<void>;
    sendContractApprovalEmail(contract: any, approver: User): Promise<void>;
    sendUserCreatedEmail(user: User, tempPassword: string, invitedBy: User): Promise<void>;
    sendUserRoleChangeEmail(user: User, newRole: string, changedBy: User): Promise<void>;
}
declare const _default: EmailService;
export default _default;
//# sourceMappingURL=email.service.d.ts.map