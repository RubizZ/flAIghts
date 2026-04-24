export interface MissionStepResult {
    id: string;
    title: string;
    completedAt: string;
}

export interface SurveyResult {
    missionId: string;
    completedBy?: string;
    completedAt: string;
    steps: MissionStepResult[];
    answer: {
        rating: number;
        comment: string;
    };
}

export interface ScreenInfo {
    width: number;
    height: number;
    innerWidth: number;
    innerHeight: number;
    devicePixelRatio: number;
}

export interface EvaluationPayload {
    results: SurveyResult[];
    susResults?: number[];
    timestamp: string;
    userId?: string;
    fullName?: string;
    age?: number;
    gender?: string;
    educationLevel?: string;
    screenInfo?: ScreenInfo;
    userAgent: string;
}
