import nodemailer from "nodemailer";
import { inject, singleton } from "tsyringe";
import { ServerConfig } from "../config/server.config.js";
import logger from "../utils/logger.js";

export interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

@singleton()
export class MailService {
    private transporter: nodemailer.Transporter;
    constructor(@inject(ServerConfig) private config: ServerConfig) {
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
            await this.transporter.sendMail({
                from: this.config.SMTP_FROM,
                to,
                subject,
                html,
            });
            return true;
        } catch (error) {
            logger.error({ error, to, subject }, "[MAIL] Failed to send email");
            return false;
        }
    }
}
