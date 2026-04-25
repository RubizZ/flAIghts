import { Body, Controller, Post, Route, Tags, Request, Security, RequestProp } from 'tsoa';
import { inject, singleton, injectable } from 'tsyringe';
import type { EvaluationPayload } from './evaluation.types.js';
import { Evaluation } from './evaluation.model.js';
import { User } from '../users/models/user.model.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { MailService } from '../../services/mail.service.js';
import { MailTemplates } from '../../services/mail.templates.js';
import { ServerConfig } from '../../config/server.config.js';

@injectable()
@Route('evaluation')
@Tags('Evaluation')
@singleton()
export class EvaluationController extends Controller {
    constructor(
        @inject(MailService) private mailService: MailService,
        @inject(ServerConfig) private config: ServerConfig
    ) {
        super();
    }
    @Security('jwt-optional') // Opcional para permitir anónimos
    @Post('results')
    public async submitResults(
        @Body() payload: EvaluationPayload,
        @RequestProp('user') user: AuthenticatedUser | null
    ): Promise<{ status: string }> {
        // Guardar resultado en la base de datos
        await Evaluation.create({
            ...payload,
            userId: user?._id,
            timestamp: new Date(payload.timestamp),
            receivedAt: new Date()
        });

        // Si el usuario está autenticado, le damos la insignia de evaluador
        if (user?._id) {
            const badgeId = 'evaluator';
            const currentUser = await User.findById(user._id);
            
            if (currentUser && !currentUser.badges?.some(b => b.id === badgeId)) {
                await User.updateOne(
                    { _id: user._id },
                    { 
                        $push: { 
                            badges: {
                                id: badgeId,
                                name: 'Evaluador flAIghts',
                                icon: '🎯',
                                earned_at: new Date()
                            }
                        } 
                    }
                );
            }

            // Enviar email de agradecimiento
            if (currentUser?.email) {
                const template = MailTemplates.evaluationCompleted(
                    this.config.FRONTEND_URL,
                    currentUser.username
                );
                await this.mailService.sendMail(
                    currentUser.email,
                    template.subject,
                    template.html
                );
            }
        }

        return { status: 'success' };
    }
}
