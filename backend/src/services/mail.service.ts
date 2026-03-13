import nodemailer from "nodemailer";
import { singleton } from "tsyringe";

export interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

import { ServerConfig } from "../config/server.config.js";

@singleton()
export class MailService {
    private transporter: nodemailer.Transporter;
    constructor(private config: ServerConfig) {
        this.transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_PORT === 465 || config.SMTP_PORT === 2465,
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            },
        });
    }

    public async sendMail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            const info = await this.transporter.sendMail({
                from: this.config.SMTP_FROM,
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
