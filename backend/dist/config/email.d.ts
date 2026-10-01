import { Transporter } from 'nodemailer';
interface EmailConfig {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
}
export declare function initializeEmailTransport(config: EmailConfig): Promise<Transporter>;
export declare function getEmailTransport(): Transporter | null;
export declare function testEmailConnection(config: EmailConfig): Promise<void>;
export declare function maskPassword(password: string): string;
export {};
//# sourceMappingURL=email.d.ts.map