import React, { useState } from 'react';
import { useMissions } from '@/context/MissionContext';
import MissionRoadmap from './MissionRoadmap';
import MissionDashboard from './MissionDashboard';

/**
 * Root portal component for the mission evaluation system.
 * It manages the display of the Roadmap and the individual Mission Dashboards.
 */
const MissionPortal: React.FC = () => {
    const {
        activeMission, missions, isEvaluationMode,
        hasConsented, isMissionUnlocked,
        setShowSurveyMissionId, showRoadmap, setShowRoadmap
    } = useMissions();
    
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

    // Filter for missions that are unlocked but not yet completed
    const availableMissions = missions.filter(m => !m.isCompleted && isMissionUnlocked(m.id));

    const currentMissionId = selectedMissionId || activeMission?.id;
    const mission = missions.find(m => m.id === currentMissionId) || missions[missions.length - 1];

    if (!isEvaluationMode || !hasConsented || !mission) return null;

    const currentIndex = availableMissions.findIndex(m => m.id === (currentMissionId || ''));

    const handleNextMission = () => {
        if (availableMissions.length <= 1 || currentIndex === -1) return;
        const nextIndex = (currentIndex + 1) % availableMissions.length;
        setSelectedMissionId(availableMissions[nextIndex]?.id || null);
    };

    const handlePrevMission = () => {
        if (availableMissions.length <= 1 || currentIndex === -1) return;
        const prevIndex = (currentIndex - 1 + availableMissions.length) % availableMissions.length;
        setSelectedMissionId(availableMissions[prevIndex]?.id || null);
    };

    return (
        <>
            {/* Full Screen Mission Dashboard */}
            {isOpen && (
                <MissionDashboard
                    mission={mission}
                    onClose={() => setIsOpen(false)}
                    onBackToRoadmap={() => {
                        setIsOpen(false);
                        setShowRoadmap(true);
                    }}
                    onNext={handleNextMission}
                    onPrev={handlePrevMission}
                    onOpenSurvey={(id) => setShowSurveyMissionId(id)}
                    showControls={availableMissions.length > 1}
                    currentIndex={currentIndex}
                    totalAvailable={availableMissions.length}
                />
            )}

            {/* Roadmap Modal */}
            {showRoadmap && (
                <MissionRoadmap
                    onClose={() => setShowRoadmap(false)}
                    onMissionClick={(id) => {
                        setSelectedMissionId(id);
                        setShowRoadmap(false);
                        setIsOpen(true);
                    }}
                />
            )}
        </>
    );
};

export default MissionPortal;
