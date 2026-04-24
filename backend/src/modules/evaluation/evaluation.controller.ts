import { Body, Controller, Post, Route, Tags, Security, RequestProp } from 'tsoa';
import { injectable } from 'tsyringe';
import type { EvaluationPayload } from './evaluation.types.js';
import { Evaluation } from './evaluation.model.js';
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

        return { status: 'success' };
    }
}
