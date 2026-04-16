export interface MissionStepResult {
    id: string;
    title: string;
    completedAt: string;
    userAgent: string;
}

export interface SurveyResult {
    missionId: string;
    completedBy?: string;
    completedAt: string;
    userAgent: string;
    steps: MissionStepResult[];
    answer: {
        rating: number;
        comment: string;
    };
}

export interface EvaluationPayload {
    results: SurveyResult[];
    timestamp: string;
    userId?: string;
    fullName?: string;
}
