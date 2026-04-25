import { Body, Controller, Post, Route, Tags, Security, RequestProp } from 'tsoa';
import { injectable } from 'tsyringe';
import type { EvaluationPayload } from './evaluation.types.js';
import { Evaluation } from './evaluation.model.js';
import { User } from '../users/models/user.model.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

@injectable()
@Route('evaluation')
@Tags('Evaluation')
export class EvaluationController extends Controller {
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
        }

        return { status: 'success' };
    }
}
