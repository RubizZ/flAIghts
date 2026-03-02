export abstract class AppError<TCode extends string = string, TDetails = undefined> extends Error {
    public abstract readonly code: TCode;
    public abstract readonly statusCode: number;
    public details!: TDetails extends undefined ? undefined : TDetails;

    constructor(message: string) {
        super(message);
    }

    toJSON() {
        const result: any = {
            code: this.code,
            message: this.message
        };
        if (this.details !== undefined) {
            result.details = this.details;
        }
        return result;
    }
}

export class CorsError extends Error {
    constructor(message: string = 'Not allowed by CORS') {
        super(message);
        this.name = 'CorsError';
    }
}