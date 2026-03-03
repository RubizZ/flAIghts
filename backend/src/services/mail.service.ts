import nodemailer from "nodemailer";
import { singleton } from "tsyringe";

export interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

@singleton()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly smtpFrom: string;

    constructor() {
        if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
            throw new Error("SMTP configuration is incomplete in environment variables. Missing: " +
                (process.env.SMTP_HOST ? "" : "SMTP_HOST, ") +
                (process.env.SMTP_PORT ? "" : "SMTP_PORT, ") +
                (process.env.SMTP_USER ? "" : "SMTP_USER, ") +
                (process.env.SMTP_PASS ? "" : "SMTP_PASS, ") +
                (process.env.SMTP_FROM ? "" : "SMTP_FROM"));
        }

        this.smtpFrom = process.env.SMTP_FROM;

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: parseInt(process.env.SMTP_PORT) === 465 || parseInt(process.env.SMTP_PORT) === 2465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    public async sendMail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            const info = await this.transporter.sendMail({
                from: this.smtpFrom,
                to,
                subject,
                html,
            });
            console.log(`[MAIL] Email sent successfully: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error("[MAIL] Failed to send email:", error);
            return false;
        }
    }
}
