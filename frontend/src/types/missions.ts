import React from 'react';
import { ParseKeys } from 'i18next';

export interface MissionStep {
    id: string;
    title: ParseKeys;
    description: ParseKeys;
    isCompleted: boolean;
    completedBy?: string;
    completedAt?: string;
    listener?: React.ComponentType; // Listener específico para este paso
}

export interface Mission {
    id: string;
    title: ParseKeys;
    description: ParseKeys;
    icon: string;
    steps: MissionStep[];
    isCompleted: boolean;
    completedBy?: string;
    completedAt?: string;
    dependsOn?: string[]; // IDs de misiones que deben estar completadas
}

export interface MissionState {
    completedMissions: string[]; // Mission IDs
    completedSteps: string[]; // Step IDs
}

export type BaseMission = Omit<Mission, 'isCompleted' | 'completedBy' | 'completedAt' | 'steps'> & {
    steps: Omit<MissionStep, 'isCompleted' | 'completedBy' | 'completedAt'>[];
};
