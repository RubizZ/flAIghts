import mongoose from "mongoose";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import dns from "dns";

// Configure DNS to use Google's public DNS servers
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables relative to the script location
dotenv.config({ path: path.join(__dirname, "../../../.env") });

const DB_URI = process.env.PRODUCTION_DB || "";
const isMock = process.argv.includes("--mock");
const showIds = process.argv.includes("--show-ids");

if (!DB_URI && !isMock) {
    console.error("Error: MongoDB URI not found in .env file (checked key 'db')");
    console.log("Tip: Run with --mock to see a sample report with synthetic data.");
    process.exit(1);
}

// Define Schema locally for the script
const EvaluationSchema = new mongoose.Schema({
    results: [{
        missionId: String,
        completedAt: Date,
        steps: [{
            id: String,
            title: String,
            completedAt: Date
        }]
    }],
    susResults: [Number],
    age: Number,
    gender: String,
    educationLevel: String,
    userId: String,
    timestamp: Date,
    receivedAt: { type: Date, default: Date.now }
}, { collection: "evaluations" });

const UserSchema = new mongoose.Schema({
    _id: String,
    created_at: Date
}, { collection: "users" });

const Evaluation = mongoose.model("Evaluation", EvaluationSchema);
const User = mongoose.model("User", UserSchema);

const AuditSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    user: {
        id: { type: String, default: null, ref: "User" },
        username: { type: String, default: null },
        ip: String,
        userAgent: String
    },
    resource: String,
    action: String,
    details: Object
}, { collection: "audits" });
const Audit = mongoose.models.Audit || mongoose.model("Audit", AuditSchema);

const formatES = (n: number | string, d: number = 0) => {
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(num)) return n;
    return num.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
};

async function analyze() {
    try {
        let evaluations: any[] = [];

        if (isMock) {
            console.log("Generating mock data for analysis...");
            evaluations = generateMockData(50);
        } else {
            console.log("Connecting to MongoDB...");
            await mongoose.connect(DB_URI);
            console.log("Connected successfully.");
            evaluations = await Evaluation.find({ susResults: { $exists: true, $not: { $size: 0 } } });
        }

        console.log(`Analyzing ${evaluations.length} evaluations.`);

        if (evaluations.length === 0) {
            console.log("No data to analyze.");
            await mongoose.disconnect();
            return;
        }

        const results = evaluations.map((ev: any) => {
            const sus = ev.susResults;
            if (!sus || sus.length !== 10) {
                console.log(`⚠️ Descartando evaluación ${ev._id}: ${sus ? `Tiene ${sus.length} respuestas` : 'No tiene susResults'}`);
                return null;
            }

            const scores = sus.map((r: number, i: number) => {
                if ((i + 1) % 2 !== 0) { // Odd
                    return r - 1;
                } else { // Even
                    return 5 - r;
                }
            });
            const totalScore = scores.reduce((a: number, b: number) => a + b, 0) * 2.5;

            const normalizeGender = (g: string) => {
                if (!g) return "Unknown";
                const lower = String(g).toLowerCase().trim();
                // Check female first because "female" contains "male"
                if (lower.includes("female") || lower.includes("femenino") || lower.includes("mujer")) return "Female / Femenino";
                if (lower.includes("male") || lower.includes("masculino") || lower.includes("hombre")) return "Male / Masculino";
                return g;
            };

            const normalizeEdu = (e: string) => {
                if (!e) return "Unknown";
                const lower = e.toLowerCase();
                if (lower.includes("bachillerato") || lower.includes("fp")) return "Bachillerato / FP";
                if (lower.includes("grado") || lower.includes("university") || lower.includes("bachelor")) return "Grado / University Degree";
                if (lower.includes("máster") || lower.includes("master") || lower.includes("doctor")) return "Máster / PhD";
                return e;
            };

            return {
                id: ev._id,
                score: totalScore,
                age: ev.age,
                gender: normalizeGender(ev.gender),
                educationLevel: normalizeEdu(ev.educationLevel),
                date: ev.timestamp || ev.receivedAt,
                userId: ev.userId,
                receivedAt: ev.receivedAt,
                missions: ev.results || []
            };
        }).filter(r => r !== null) as any[];

        // Fetch User creation dates for journey time
        const userMap: Record<string, Date> = {};
        if (!isMock) {
            const userIds = results.map(r => r.userId).filter(Boolean);
            const users = await User.find({ _id: { $in: userIds } });
            users.forEach(u => {
                userMap[u._id] = u.created_at;
            });
        } else {
            // For mock, generate user dates a few days before evaluation
            results.forEach(r => {
                if (r.userId) {
                    const evalDate = new Date(r.receivedAt);
                    userMap[r.userId] = new Date(evalDate.getTime() - (Math.random() * 5 * 24 * 60 * 60 * 1000 + 3600000));
                }
            });
        }

        // Calculate Journey Times (Registration to Evaluation)
        const journeyTimes = results
            .map(r => {
                const created = userMap[r.userId];
                if (!created) return null;
                return (new Date(r.receivedAt).getTime() - created.getTime()) / 1000; // in seconds
            })
            .filter(t => t !== null) as number[];

        const avgJourneyTime = journeyTimes.length > 0
            ? journeyTimes.reduce((a, b) => a + b, 0) / journeyTimes.length
            : 0;

        function getMedian(arr: number[]) {
            if (arr.length === 0) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }

        const medianJourneyTime = getMedian(journeyTimes);

        function getMean(arr: number[]) {
            return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
        }

        function getStdDev(arr: number[]) {
            if (arr.length === 0) return 0;
            const mean = getMean(arr);
            const sqDiffs = arr.map(v => Math.pow(v - mean, 2));
            return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
        }

        function getPercentile(arr: number[], p: number) {
            if (arr.length === 0) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            const pos = (sorted.length - 1) * (p / 100);
            const base = Math.floor(pos);
            const rest = pos - base;
            if (sorted[base + 1] !== undefined) {
                return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
            } else {
                return sorted[base];
            }
        }

        // Calculate Mission Times
        const allMissionTimes: number[] = [];
        const timesByMission: Record<string, number[]> = {};
        const totalSessionTimes: number[] = [];
        results.forEach(r => {
            // Extract all missions for this user with their first/last step timestamps
            const userMissions = r.missions.map((m: any) => {
                if (!m.steps || m.steps.length === 0) return null;
                const stepTimes = m.steps.map((s: any) => new Date(s.completedAt).getTime());
                return {
                    id: m.missionId,
                    firstStep: Math.min(...stepTimes),
                    lastStep: Math.max(...stepTimes)
                };
            }).filter(Boolean) as { id: string, firstStep: number, lastStep: number }[];

            // Sort missions by chronological order of completion
            userMissions.sort((a, b) => a.lastStep - b.lastStep);

            let userTotalActiveTime = 0;
            userMissions.forEach((m, idx) => {
                const precedingMissions = userMissions
                    .filter(other => other.lastStep < m.firstStep)
                    .sort((a, b) => b.lastStep - a.lastStep);

                const startTime = precedingMissions.length > 0
                    ? precedingMissions[0].lastStep
                    : (userMap[r.userId]?.getTime() || m.firstStep);

                const duration = (m.lastStep - startTime) / 1000;

                // We exclude registration from stats, but include in total active time?
                // Actually, let's keep the filter consistent with previous stats
                const isRegistration = m.id.toLowerCase().includes("regis");

                if (duration > 0 && !isRegistration) {
                    allMissionTimes.push(duration);
                    if (!timesByMission[m.id]) timesByMission[m.id] = [];
                    timesByMission[m.id].push(duration);
                    userTotalActiveTime += duration;
                }
            });
            if (userTotalActiveTime > 0) totalSessionTimes.push(userTotalActiveTime);
        });

        const sessionRanges: Record<string, number> = {};
        for (let i = 0; i < 120; i += 5) {
            sessionRanges[`${i}-${i + 5} min`] = 0;
        }
        sessionRanges["> 120 min"] = 0;

        journeyTimes.forEach(t => {
            const mins = t / 60;
            if (mins >= 120) {
                sessionRanges["> 120 min"]++;
            } else {
                const bucket = Math.floor(mins / 5) * 5;
                sessionRanges[`${bucket}-${bucket + 5} min`]++;
            }
        });

        const avgMissionTime = allMissionTimes.length > 0
            ? allMissionTimes.reduce((a, b) => a + b, 0) / allMissionTimes.length
            : 0;

        const medianMissionTime = getMedian(allMissionTimes);

        const missionBreakdown = Object.entries(timesByMission).map(([id, times]) => {
            return {
                id,
                median: formatDuration(getMedian(times)),
                mean: formatDuration(getMean(times)),
                stdDev: formatDuration(getStdDev(times)),
                count: times.length
            };
        }).sort((a, b) => a.id.localeCompare(b.id));

        function formatDuration(seconds: number) {
            if (seconds === 0) return "0s";
            const d = Math.floor(seconds / (24 * 3600));
            const h = Math.floor((seconds % (24 * 3600)) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            const parts = [];
            if (d > 0) parts.push(`${d}d`);
            if (h > 0) parts.push(`${h}h`);
            if (m > 0) parts.push(`${m}m`);
            if (s > 0 || parts.length === 0) parts.push(`${s}s`);
            return parts.slice(0, 2).join(" ");
        };

        // Time Clustering by Demographics
        const missionTimesByAge: Record<string, number[]> = { "< 25": [], "25 - 40": [], "41 - 60": [], "> 60": [], "Unknown": [] };
        const missionTimesByGender: Record<string, number[]> = {};
        const missionTimesByEdu: Record<string, number[]> = {};

        results.forEach(r => {
            const ageGroup = !r.age ? "Unknown" : r.age < 25 ? "< 25" : r.age <= 40 ? "25 - 40" : r.age <= 60 ? "41 - 60" : "> 60";
            const gender = r.gender || "Unknown";
            const edu = r.educationLevel || "Unknown";
            const userRegistration = userMap[r.userId];

            const userMissions = r.missions.map((m: any) => {
                if (!m.steps || m.steps.length === 0) return null;
                const stepTimes = m.steps.map((s: any) => new Date(s.completedAt).getTime());
                return { firstStep: Math.min(...stepTimes), lastStep: Math.max(...stepTimes) };
            }).filter(Boolean) as { firstStep: number, lastStep: number }[];

            userMissions.sort((a, b) => a.firstStep - b.firstStep);

            userMissions.forEach((m, idx) => {
                const precedingMissions = userMissions
                    .filter(other => other.lastStep < m.firstStep)
                    .sort((a, b) => b.lastStep - a.lastStep);

                const startTime = precedingMissions.length > 0
                    ? precedingMissions[0].lastStep
                    : (userMap[r.userId]?.getTime() || m.firstStep);

                const duration = (m.lastStep - startTime) / 1000;
                if (duration > 0) {
                    missionTimesByAge[ageGroup].push(duration);
                    if (!missionTimesByGender[gender]) missionTimesByGender[gender] = [];
                    missionTimesByGender[gender].push(duration);
                    if (!missionTimesByEdu[edu]) missionTimesByEdu[edu] = [];
                    missionTimesByEdu[edu].push(duration);
                }
            });
        });

        const getMedianStats = (groups: Record<string, number[]>) => {
            return Object.entries(groups).map(([name, times]) => ({
                name,
                median: getMedian(times),
                formatted: formatDuration(getMedian(times)),
                count: times.length
            })).filter(g => g.count > 0);
        };

        const timeClusterStats = {
            age: getMedianStats(missionTimesByAge),
            gender: getMedianStats(missionTimesByGender),
            edu: getMedianStats(missionTimesByEdu)
        };

        // --- Audit Log Analysis ---
        let auditSummary: any = {
            totalActions: 0,
            resourceDist: {},
            actionDist: {},
            searchSuccess: 0,
            searchFailed: 0,
            agentMessages: 0,
            agentToolCalls: 0,
            medianActionsPerUser: 0,
            oneWayCount: 0,
            roundTripCount: 0,
            searchDurations: [],
            searchFailedDurations: [],
            messagesToSearch: [],
            allCompletedSearches: [],
            allFailedSearches: []
        };

        const searchDetailsMap: Record<string, any> = {};

        if (!isMock) {
            const userIds = results.map(r => r.userId).filter(Boolean);
            const allAudits = await Audit.find({ "user.id": { $in: userIds } }).sort({ timestamp: 1 });

            const actionsPerUser: number[] = [];

            results.forEach(r => {
                if (!r.userId) return;

                const userAudits = allAudits.filter(a => a.user.id === r.userId);
                const regEvent = userAudits.find(a => a.resource === "USER" && a.action === "COMPLETE_REGISTRATION");
                const startTime = regEvent ? new Date(regEvent.timestamp) : (userMap[r.userId] || new Date(0));
                const endTime = new Date(r.receivedAt);

                const windowAudits = userAudits.filter(a => {
                    const t = new Date(a.timestamp);
                    return t >= startTime && t <= endTime;
                });

                actionsPerUser.push(windowAudits.length);

                const explorationStarts: Record<string, number> = {};
                let currentChatCount = 0;

                windowAudits.forEach(a => {
                    auditSummary.totalActions++;
                    auditSummary.resourceDist[a.resource] = (auditSummary.resourceDist[a.resource] || 0) + 1;

                    const actionLabel = `${a.action} (${a.resource})`;
                    auditSummary.actionDist[actionLabel] = (auditSummary.actionDist[actionLabel] || 0) + 1;

                    if (a.resource === "SEARCH") {
                        if (a.action === "CREATE") {
                            searchDetailsMap[a.details?.id] = a.details;
                            currentChatCount = 0;
                        }
                        if (a.action === "EXPLORATION_START") {
                            explorationStarts[a.details?.id] = new Date(a.timestamp).getTime();
                        }
                        if (a.action === "EXPLORATION_COMPLETED" && explorationStarts[a.details?.id]) {
                            const duration = (new Date(a.timestamp).getTime() - explorationStarts[a.details?.id]) / 1000;
                            auditSummary.searchDurations.push(duration);
                            auditSummary.searchSuccess++;

                            const searchId = a.details?.id;
                            const details = searchDetailsMap[searchId] || {};
                            const isRoundTrip = !!details.return_date;

                            // Count trip type for the status distribution
                            if (isRoundTrip) auditSummary.roundTripCount++;
                            else auditSummary.oneWayCount++;

                            // NEW: Combined status by type
                            const typeKey = isRoundTrip ? 'roundTrip' : 'oneWay';
                            if (!auditSummary.statusByType) auditSummary.statusByType = { oneWay: { success: 0, failed: 0 }, roundTrip: { success: 0, failed: 0 } };
                            auditSummary.statusByType[typeKey].success++;

                            auditSummary.allCompletedSearches.push({
                                id: searchId,
                                duration,
                                origins: details.origins || [],
                                destinations: details.destinations || [],
                                date: details.departure_date ? new Date(details.departure_date).toLocaleDateString() : 'N/A'
                            });
                        }
                        if (a.action === "EXPLORATION_FAILED" && explorationStarts[a.details?.id]) {
                            const duration = (new Date(a.timestamp).getTime() - explorationStarts[a.details?.id]) / 1000;
                            auditSummary.searchFailedDurations.push(duration);
                            auditSummary.searchFailed++;

                            const searchId = a.details?.id;
                            const details = searchDetailsMap[searchId] || {};
                            const isRoundTrip = !!details.return_date;

                            // Count trip type for the status distribution
                            if (isRoundTrip) auditSummary.roundTripCount++;
                            else auditSummary.oneWayCount++;

                            // NEW: Combined status by type
                            const typeKey = isRoundTrip ? 'roundTrip' : 'oneWay';
                            if (!auditSummary.statusByType) auditSummary.statusByType = { oneWay: { success: 0, failed: 0 }, roundTrip: { success: 0, failed: 0 } };
                            auditSummary.statusByType[typeKey].failed++;

                            // Store detailed record for error analysis
                            auditSummary.allFailedSearches.push({
                                id: searchId,
                                duration,
                                reason: a.details?.reason || 'Error desconocido',
                                origins: details.origins || [],
                                destinations: details.destinations || [],
                                date: details.departure_date ? new Date(details.departure_date).toLocaleDateString() : 'N/A'
                            });
                        }
                    }
                    if (a.resource === "AGENT") {
                        if (a.action === "CHAT") {
                            auditSummary.agentMessages++;
                            currentChatCount++;
                        }
                        if (a.action === "TOOL_CALL") {
                            auditSummary.agentToolCalls++;
                            const toolName = String(a.details?.tool || "");
                            if (toolName === "performSearch") {
                                auditSummary.messagesToSearch.push(currentChatCount);
                                currentChatCount = 0;
                            }
                        }
                    }
                });
            });

            auditSummary.meanActionsPerUser = getMean(actionsPerUser);
        } else {
            auditSummary = {
                totalActions: 450,
                resourceDist: { "SEARCH": 180, "AGENT": 200, "USER": 40, "AUTH": 30 },
                actionDist: { "CHAT (AGENT)": 120, "TOOL_CALL (AGENT)": 80, "CREATE (SEARCH)": 100, "EXPLORATION_COMPLETED (SEARCH)": 75, "EXPLORATION_FAILED (SEARCH)": 5 },
                searchSuccess: 75,
                searchFailed: 5,
                agentMessages: 120,
                agentToolCalls: 80,
                meanActionsPerUser: 22,
                oneWayCount: 30,
                roundTripCount: 70,
                statusByType: { oneWay: { success: 25, failed: 5 }, roundTrip: { success: 50, failed: 0 } },
                searchDurations: [12, 15, 18, 22, 25, 30, 45, 12, 14, 16],
                searchFailedDurations: [5, 8, 12, 4, 6],
                messagesToSearch: [2, 3, 2, 4, 1, 2, 3, 1, 1, 2],
                allCompletedSearches: [
                    { id: 'mock-s1', duration: 45.2, origins: ['MAD'], destinations: ['JFK'], date: '12/05/2026' },
                    { id: 'mock-s2', duration: 38.5, origins: ['BCN'], destinations: ['LHR'], date: '15/05/2026' },
                    { id: 'mock-s3', duration: 32.1, origins: ['SFO'], destinations: ['HND'], date: '20/05/2026' },
                    { id: 'mock-s4', duration: 28.4, origins: ['CDG'], destinations: ['DXB'], date: '22/05/2026' },
                    { id: 'mock-s5', duration: 25.0, origins: ['TXL'], destinations: ['FCO'], date: '25/05/2026' }
                ],
                allFailedSearches: [
                    { id: 'mock-f1', duration: 5.4, reason: 'No se encontraron vuelos de vuelta', origins: ['MAD'], destinations: ['LBG'], date: 'N/A' },
                    { id: 'mock-f2', duration: 8.2, reason: 'SerpApi error: 400', origins: ['JFK'], destinations: ['LAX'], date: '10/06/2026' },
                    { id: 'mock-f3', duration: 12.1, reason: 'Itinerary validation failed', origins: ['SYD'], destinations: ['AKL'], date: 'N/A' }
                ],
                failedAggregations: {
                    reasons: { 'No se encontraron vuelos de vuelta': 2, 'SerpApi error: 400': 1, 'Itinerary validation failed': 2 },
                    origins: { 'MAD': 1, 'JFK': 1, 'SYD': 1 },
                    destinations: { 'LBG': 1, 'LAX': 1, 'AKL': 1 },
                    dates: { 'N/A': 2, '10/06/2026': 1 }
                }
            };
        }


        const meanSearchTime = getMean(auditSummary.searchDurations);
        const medianSearchTime = getMedian(auditSummary.searchDurations);
        const stdDevSearchTime = getStdDev(auditSummary.searchDurations);
        const p95SearchTime = getPercentile(auditSummary.searchDurations, 95);

        const meanFailedTime = getMean(auditSummary.searchFailedDurations);
        const medianFailedTime = getMedian(auditSummary.searchFailedDurations);
        const stdDevFailedTime = getStdDev(auditSummary.searchFailedDurations);
        const p95FailedTime = getPercentile(auditSummary.searchFailedDurations, 95);

        const meanMessagesPerSearch = getMean(auditSummary.messagesToSearch);
        const meanActionsPerUser = auditSummary.meanActionsPerUser;

        const criticalCount = Math.max(1, Math.ceil(auditSummary.allCompletedSearches.length * 0.05));
        const criticalSearches = [...auditSummary.allCompletedSearches]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, criticalCount);

        const failedAggregations = {
            reasons: {} as Record<string, number>,
            origins: {} as Record<string, number>,
            destinations: {} as Record<string, number>,
            dates: {} as Record<string, number>
        };

        auditSummary.allFailedSearches.forEach((s: any) => {
            failedAggregations.reasons[s.reason] = (failedAggregations.reasons[s.reason] || 0) + 1;
            s.origins.forEach((o: string) => failedAggregations.origins[o] = (failedAggregations.origins[o] || 0) + 1);
            s.destinations.forEach((d: string) => failedAggregations.destinations[d] = (failedAggregations.destinations[d] || 0) + 1);
            failedAggregations.dates[s.date] = (failedAggregations.dates[s.date] || 0) + 1;
        });

        Object.assign(auditSummary, {
            meanSearchTime, 
            meanSearchTimeFormatted: formatES(meanSearchTime, 1),
            medianSearchTime,
            medianSearchTimeFormatted: formatES(medianSearchTime, 1),
            stdDevSearchTime,
            stdDevSearchTimeFormatted: formatES(stdDevSearchTime, 1),
            p95SearchTime,
            p95SearchTimeFormatted: formatES(p95SearchTime, 1),

            meanFailedTime,
            meanFailedTimeFormatted: formatES(meanFailedTime, 1),
            medianFailedTime,
            medianFailedTimeFormatted: formatES(medianFailedTime, 1),
            stdDevFailedTime,
            stdDevFailedTimeFormatted: formatES(stdDevFailedTime, 1),
            p95FailedTime,
            p95FailedTimeFormatted: formatES(p95FailedTime, 1),

            meanMessagesPerSearch,
            meanMessagesPerSearchFormatted: formatES(meanMessagesPerSearch, 1),
            meanActionsPerUser,
            meanActionsPerUserFormatted: formatES(meanActionsPerUser, 1),
            
            criticalSearches,
            allFailedSearches: [...auditSummary.allFailedSearches].sort((a, b) => b.duration - a.duration),
            failedAggregations,
            searchSuccessFormatted: formatES(auditSummary.searchSuccess, 0),
            searchFailedFormatted: formatES(auditSummary.searchFailed, 0),
            agentMessagesFormatted: formatES(auditSummary.agentMessages, 0),
            agentToolCallsFormatted: formatES(auditSummary.agentToolCalls, 0)
        });

        const totalScores = results.map(r => r.score);
        const mean = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
        const sortedScores = [...totalScores].sort((a, b) => a - b);
        const median = sortedScores[Math.floor(sortedScores.length / 2)];
        const min = Math.min(...totalScores);
        const max = Math.max(...totalScores);
        const stdDev = Math.sqrt(totalScores.map(s => Math.pow(s - mean, 2)).reduce((a, b) => a + b, 0) / totalScores.length);

        // Group by Age
        const ageGroups: Record<string, number[]> = {
            "< 25": [],
            "25 - 40": [],
            "41 - 60": [],
            "> 60": [],
            "Unknown": []
        };

        results.forEach(r => {
            if (!r.age) ageGroups["Unknown"].push(r.score);
            else if (r.age < 25) ageGroups["< 25"].push(r.score);
            else if (r.age <= 40) ageGroups["25 - 40"].push(r.score);
            else if (r.age <= 60) ageGroups["41 - 60"].push(r.score);
            else ageGroups["> 60"].push(r.score);
        });

        // Individual Ages for Sample Description (No groupings, including zeros)
        const rawAgeMap: Record<number, number> = {};
        const ageValues = results.map(r => r.age).filter(a => a !== null && a !== undefined);
        if (ageValues.length > 0) {
            const minAge = Math.min(...ageValues);
            const maxAge = Math.max(...ageValues);
            for (let a = minAge; a <= maxAge; a++) {
                rawAgeMap[a] = 0;
            }
        }
        results.forEach(r => {
            if (r.age !== null && r.age !== undefined && rawAgeMap[r.age] !== undefined) {
                rawAgeMap[r.age]++;
            }
        });
        const sortedRawAges: Record<string, number> = {};
        Object.keys(rawAgeMap).map(Number).sort((a, b) => a - b).forEach(age => {
            sortedRawAges[age.toString()] = rawAgeMap[age];
        });

        // Group by Gender
        const genderGroups: Record<string, number[]> = {};
        results.forEach(r => {
            const g = r.gender || "Unknown";
            if (!genderGroups[g]) genderGroups[g] = [];
            genderGroups[g].push(r.score);
        });

        // Group by Education
        const eduGroups: Record<string, number[]> = {};
        results.forEach(r => {
            const e = r.educationLevel || "Unknown";
            if (!eduGroups[e]) eduGroups[e] = [];
            eduGroups[e].push(r.score);
        });

        const getMode = (arr: any[]) => {
            if (arr.length === 0) return "N/A";
            const counts: Record<string, number> = {};
            arr.forEach(val => {
                if (val === null || val === undefined) return;
                const s = String(val);
                counts[s] = (counts[s] || 0) + 1;
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            return sorted.length > 0 ? sorted[0][0] : "N/A";
        };

        const stats = {
            mean: mean,
            meanFormatted: formatES(mean, 2),
            median: median,
            medianFormatted: formatES(median, 2),
            min: min,
            minFormatted: formatES(min, 2),
            max: max,
            maxFormatted: formatES(max, 2),
            stdDev: stdDev,
            stdDevFormatted: formatES(stdDev, 2),
            count: results.length,
            countFormatted: formatES(results.length, 0),
            modeAge: getMode(results.map(r => r.age)),
            modeGender: getMode(results.map(r => r.gender)),
            modeEdu: getMode(results.map(r => r.educationLevel))
        };

        // Item Analysis (Per question)
        const susQuestions = [
            "Me gustaría usar este sistema frecuentemente.",
            "Encontré el sistema innecesariamente complejo.",
            "Pensé que el sistema era fácil de usar.",
            "Necesitaría el apoyo de un técnico para usar este sistema.",
            "Las diversas funciones del sistema están bien integradas.",
            "Pensé que había demasiada inconsistencia en este sistema.",
            "La mayoría de la gente aprendería a usar este sistema muy rápidamente.",
            "Encontré el sistema muy pesado de usar.",
            "Me sentí muy seguro usando el sistema.",
            "Necesité aprender muchas cosas antes de empezar con este sistema."
        ];

        const itemStats = Array.from({ length: 10 }, (_, i) => {
            const values = evaluations.map(ev => ev.susResults[i]).filter(v => v !== undefined);
            const m = values.reduce((a, b) => a + b, 0) / values.length;
            const sd = Math.sqrt(values.map(v => Math.pow(v - m, 2)).reduce((a, b) => a + b, 0) / values.length);
            return {
                index: i + 1,
                question: susQuestions[i],
                mean: formatES(m, 2),
                stdDev: formatES(sd, 2)
            };
        });

        const groupStats = (groups: Record<string, number[]>) => {
            return Object.entries(groups).map(([name, scores]) => {
                const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                return {
                    name,
                    avg: avg,
                    avgFormatted: formatES(avg, 2),
                    count: scores.length,
                    countFormatted: formatES(scores.length, 0)
                };
            }).filter(g => g.count > 0);
        };


        // Period Analysis
        const allEvaluationDates = results.map(r => new Date(r.receivedAt));
        const allMissionDates: Date[] = [];
        results.forEach(r => {
            r.missions?.forEach((m: any) => {
                m.steps?.forEach((s: any) => {
                    allMissionDates.push(new Date(s.completedAt));
                });
            });
        });

        const minStart = allMissionDates.length > 0
            ? new Date(Math.min(...allMissionDates.map(d => d.getTime())))
            : new Date();
        const maxEval = allEvaluationDates.length > 0
            ? new Date(Math.max(...allEvaluationDates.map(d => d.getTime())))
            : new Date();

        const periodDays = Math.max(1, Math.ceil((maxEval.getTime() - minStart.getTime()) / (1000 * 60 * 60 * 24)));
        const periodStats = {
            start: minStart.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            end: maxEval.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            duration: `${periodDays} días`
        };

        const reportData = {
            stats,
            periodStats,
            ageStats: groupStats(ageGroups),
            genderStats: groupStats(genderGroups),
            eduStats: groupStats(eduGroups),
            sampleStats: {
                age: sortedRawAges,
                gender: genderGroups,
                edu: eduGroups
            },
            timeClusterStats,
            auditSummary: {
                ...auditSummary,
                meanSearchTime,
                meanFailedTime,
                meanMessagesPerSearch,
                meanActionsPerUser
            },
            itemStats,
            missionStats: {
                avgMissionTime: formatDuration(avgMissionTime),
                medianMissionTime: formatDuration(medianMissionTime),
                avgJourneyTime: formatDuration(avgJourneyTime),
                medianJourneyTime: formatDuration(medianJourneyTime),
                totalMissions: allMissionTimes.length,
                breakdown: missionBreakdown,
                sessionRanges: sessionRanges
            },
            allScores: totalScores,
            showIds: showIds
        };

        const html = generateHTML(reportData);
        const fileName = isMock ? "evaluations_analysis_report_mocked.html" : "evaluations_analysis_report.html";
        const reportPath = path.join(__dirname, fileName);
        fs.writeFileSync(reportPath, html);

        console.log(`Analysis complete! Report generated at: ${reportPath}`);
        await mongoose.disconnect();

    } catch (error) {
        console.error("Analysis failed:", error);
        await mongoose.disconnect();
    }
}

function generateHTML(data: any) {
    const showIds = data.showIds;
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis Evaluaciones - flAIghts</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --secondary: #a855f7;
            --bg: #0f172a;
            --card-bg: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            margin-bottom: 40px;
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(to right, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
            align-items: stretch;
        }
        .card {
            background-color: var(--card-bg);
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: transform 0.2s;
            position: relative;
        }
        .card:hover .export-actions-mini {
            opacity: 1;
        }
        .export-actions-mini {
            position: absolute;
            top: 12px;
            right: 12px;
            opacity: 0;
            transition: opacity 0.2s;
            display: flex;
            gap: 4px;
        }
        .card:hover {
            transform: translateY(-4px);
        }
        .card h3 {
            margin: 0;
            font-size: 0.875rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .card .value {
            font-size: 2rem;
            font-weight: 700;
            margin-top: 8px;
            color: var(--primary);
        }
        .charts-grid {
            column-count: 2;
            column-gap: 30px;
            width: 100%;
            margin-bottom: 20px;
        }
        .chart-container {
            background-color: var(--card-bg);
            padding: 24px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            break-inside: avoid-column;
            margin-bottom: 30px;
            display: block;
            width: 100%;
        }
        .chart-container h2 {
            margin-top: 0;
            font-size: 1.25rem;
            margin-bottom: 20px;
        }

        /* Export Styles */
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .chart-header h2 {
            margin: 0 !important;
            font-size: 1rem !important;
        }
        .export-actions {
            display: flex;
            gap: 8px;
        }
        .export-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-muted);
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.7rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: 600;
        }
        .export-btn:hover {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        .export-btn.mini {
            padding: 2px 6px;
            font-size: 0.6rem;
        }
        .sus-grade {
            text-align: center;
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
            font-weight: 600;
        }
        .grade-excellent { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .grade-good { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .grade-ok { background: rgba(234, 179, 8, 0.2); color: #facc15; }
        .grade-poor { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        
        .mode-tag {
            position: relative;
        }
        .mode-tag:hover .export-actions-mini {
            opacity: 1;
        }

        .item-table-container {
            margin-top: 40px;
            background-color: var(--card-bg);
            padding: 24px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        th {
            color: var(--text-muted);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        tr:hover {
            background-color: rgba(255, 255, 255, 0.02);
        }
        .q-num {
            font-weight: 700;
            color: var(--primary);
        }
        .positive { color: #4ade80; font-size: 0.75rem; font-weight: 600; }
        .negative { color: #f87171; font-size: 0.75rem; font-weight: 600; }
        
        section {
            margin-bottom: 60px;
            padding: 30px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        section h2 {
            font-size: 1.75rem;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .section-title-box {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .section-title-box::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 24px;
            background: var(--primary);
            border-radius: 2px;
        }
        
        /* Ocultar botones en la captura de pantalla */
        .html2canvas-container .export-actions,
        .html2canvas-container .export-actions-mini,
        .html2canvas-container .export-btn {
            display: none !important;
        }

        .circular-chart-wrapper {
            max-width: 550px;
            margin: 0 auto;
            position: relative;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
                <h1 style="margin: 0;">Análisis de Usabilidad y Funcionamiento de flAIghts</h1>
                <div class="export-actions">
                    <button class="export-btn" onclick="exportElement('header-summary', 'periodo_evaluacion_completo')">Exportar Resumen PNG</button>
                </div>
            </div>
            <p style="color: var(--text-muted); margin-bottom: 25px;">Reporte Estadístico de las evaluaciones</p>
            
            <div id="header-summary" style="display: flex; width: fit-content; margin: 0 auto 20px auto; gap: 40px; background: rgba(255,255,255,0.03); padding: 20px 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); text-align: left; position: relative; align-items: center;">
                <div class="mode-tag" id="period-start">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('period-start', 'inicio_evaluaciones')">PNG</button>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Inicio Evaluaciones</div>
                    <div style="font-size: 1rem; color: #6366f1; font-weight: 600;">${data.periodStats.start}</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1); align-self: stretch;"></div>
                <div class="mode-tag" id="period-end">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('period-end', 'fin_evaluaciones')">PNG</button>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Última Evaluación</div>
                    <div style="font-size: 1rem; color: var(--secondary); font-weight: 600;">${data.periodStats.end}</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.1); align-self: stretch;"></div>
                <div class="mode-tag" id="period-duration">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('period-duration', 'duracion_captacion')">PNG</button>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Periodo de Captación</div>
                    <div style="font-size: 1rem; color: #14b8a6; font-weight: 700;">${data.periodStats.duration}</div>
                </div>
            </div>
        </header>

        <!-- SECCIÓN 0: DESCRIPCIÓN DE LA MUESTRA -->
        <section id="sample-description">
            <h2>
                <div class="section-title-box">Descripción de la Muestra</div>
                <div class="export-actions">
                    <button class="export-btn" onclick="exportElement('sample-description', 'muestra_demografica')">Exportar Sección PNG</button>
                </div>
            </h2>
            <p style="color: var(--text-muted); margin-bottom: 30px;">Distribución de los ${data.stats.count} participantes según variables demográficas.</p>
            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Participantes por Edad</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('sampleAgeChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('sampleAgeChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('sampleAgeChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="sampleAgeChart"></canvas>
                    <div class="mode-tag" id="mode-age" style="margin-top: 20px; padding: 10px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.2);">
                        <div class="export-actions-mini">
                            <button class="export-btn mini" onclick="exportElement('mode-age', 'moda_edad')">PNG</button>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Moda:</span>
                        <span style="display: block; font-size: 1.1rem; font-weight: 700; color: var(--primary);">${data.stats.modeAge} años</span>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Participantes por Género</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('sampleGenderChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('sampleGenderChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('sampleGenderChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <div class="circular-chart-wrapper">
                        <canvas id="sampleGenderChart"></canvas>
                    </div>
                    <div class="mode-tag" id="mode-gender" style="margin-top: 20px; padding: 10px; background: rgba(168, 85, 247, 0.1); border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.2);">
                        <div class="export-actions-mini">
                            <button class="export-btn mini" onclick="exportElement('mode-gender', 'moda_genero')">PNG</button>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Moda:</span>
                        <span style="display: block; font-size: 1.1rem; font-weight: 700; color: var(--secondary);">${data.stats.modeGender}</span>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Participantes por Nivel Educativo</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('sampleEduChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('sampleEduChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('sampleEduChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <div class="circular-chart-wrapper">
                        <canvas id="sampleEduChart"></canvas>
                    </div>
                    <div class="mode-tag" id="mode-edu" style="margin-top: 20px; padding: 10px; background: rgba(20, 184, 166, 0.1); border-radius: 8px; border: 1px solid rgba(20, 184, 166, 0.2);">
                        <div class="export-actions-mini">
                            <button class="export-btn mini" onclick="exportElement('mode-edu', 'moda_educacion')">PNG</button>
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Moda:</span>
                        <span style="display: block; font-size: 1.1rem; font-weight: 700; color: #14b8a6;">${data.stats.modeEdu}</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- SECCIÓN 1: PUNTUACIÓN SUS -->
        <section id="sus-score">
            <h2>
                <div class="section-title-box">Puntuación SUS</div>
                <div class="export-actions">
                    <button class="export-btn" onclick="exportElement('sus-summary-cards', 'resumen_sus_cards')">PNG Resumen</button>
                    <button class="export-btn" onclick="exportElement('sus-score', 'puntuacion_sus')">Exportar Sección PNG</button>
                </div>
            </h2>
            
            <div class="summary-cards" id="sus-summary-cards" style="grid-template-columns: repeat(4, 1fr);">
                <div class="card" id="card-mean">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-mean', 'media_sus')">PNG</button>
                    </div>
                    <h3>Puntuación Media</h3>
                    <div class="value">${data.stats.meanFormatted}</div>
                </div>
                <div class="card" id="card-median">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-median', 'mediana_sus')">PNG</button>
                    </div>
                    <h3>Mediana</h3>
                    <div class="value">${data.stats.medianFormatted}</div>
                </div>
                <div class="card" id="card-std">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-std', 'desviacion_sus')">PNG</button>
                    </div>
                    <h3>Desviación Típica</h3>
                    <div class="value">${data.stats.stdDevFormatted}</div>
                </div>
                <div class="card" id="card-count">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-count', 'total_evaluaciones')">PNG</button>
                    </div>
                    <h3>Total Evaluaciones</h3>
                    <div class="value">${data.stats.countFormatted}</div>
                </div>
            </div>

            <div class="sus-grade ${getGradeClass(data.stats.mean)}">
                Calificación Global: ${getGradeText(data.stats.mean)}
            </div>

            <div class="charts-grid" style="margin-top: 40px;">
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Distribución de Puntuaciones SUS</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('distChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('distChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('distChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <div style="height: 250px; position: relative;">
                        <canvas id="distChart"></canvas>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Media SUS por Edad</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('ageChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('ageChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('ageChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="ageChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Media SUS por Género</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('genderChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('genderChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('genderChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="genderChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Media SUS por Nivel Educativo</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('eduChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('eduChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('eduChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="eduChart"></canvas>
                </div>
            </div>

            <div id="question-table-container" class="item-table-container" style="margin-top: 40px; border: none; padding: 30px; background: rgba(255,255,255,0.02); border-radius: 24px;">
                <div class="chart-header">
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-muted);">Análisis Individual por Pregunta</h3>
                    <div class="export-actions">
                        <button class="export-btn mini" onclick="exportElement('question-table-container', 'tabla_preguntas')">PNG Tabla</button>
                    </div>
                </div>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin: 10px 0 20px 0;">Valores crudos de la respuesta (1-5). Las preguntas impares son positivas, las pares son negativas (invertidas en el cálculo final).</p>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Pregunta</th>
                            <th>Media</th>
                            <th>Desv. Típica</th>
                            <th>Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.itemStats.map((item: any) => `
                            <tr>
                                <td class="q-num">Q${item.index}</td>
                                <td>${item.question}</td>
                                <td style="font-weight: 600;">${item.mean}</td>
                                <td style="color: var(--text-muted);">${item.stdDev}</td>
                                <td>
                                    ${item.index % 2 !== 0
            ? '<span class="positive">POSITIVA</span>'
            : '<span class="negative">NEGATIVA</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- SECCIÓN 2: ANÁLISIS DE TIEMPOS -->
        <section id="time-analysis">
            <h2>
                <div class="section-title-box">Análisis de Tiempos</div>
                <div class="export-actions">
                    <button class="export-btn" onclick="exportElement('time-summary-cards', 'resumen_tiempos_cards')">PNG Resumen</button>
                    <button class="export-btn" onclick="exportElement('time-analysis', 'analisis_tiempos')">Exportar Sección PNG</button>
                </div>
            </h2>
            <div class="summary-cards" id="time-summary-cards" style="grid-template-columns: repeat(3, 1fr);">
                <div class="card" id="card-time-mission" style="border-left: 4px solid var(--secondary);">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-time-mission', 'tiempo_mision')">PNG</button>
                    </div>
                    <h3>Mediana Tiempo Misión</h3>
                    <div class="value" style="font-size: 1.5rem; color: var(--secondary);">${data.missionStats.medianMissionTime}</div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Desde el primer paso de la misión hasta el último</p>
                </div>
                <div class="card" id="card-time-journey" style="border-left: 4px solid var(--secondary);">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-time-journey', 'tiempo_usuario')">PNG</button>
                    </div>
                    <h3>Mediana Registro → Eval.</h3>
                    <div class="value" style="font-size: 1.5rem; color: var(--secondary);">${data.missionStats.medianJourneyTime}</div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Desde el registro hasta terminar la evaluación</p>
                </div>
                <div class="card" id="card-total-missions" style="border-left: 4px solid var(--secondary);">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-total-missions', 'total_misiones')">PNG</button>
                    </div>
                    <h3>Total Misiones Analizadas</h3>
                    <div class="value" style="font-size: 1.5rem; color: var(--secondary);">${data.missionStats.totalMissions}</div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Misiones con datos de pasos completos</p>
                </div>
            </div>

            <div class="chart-container" style="margin-top: 30px;">
                <div class="chart-header">
                    <h2>Distribución de Duración de Sesión (Activa)</h2>
                    <div class="export-actions">
                        <button class="export-btn" onclick="exportChart('sessionDurationChart', 'png', event, false)">PNG</button>
                        <button class="export-btn" onclick="exportChart('sessionDurationChart', 'png', event, true)">Card</button>
                        <button class="export-btn" onclick="exportChart('sessionDurationChart', 'csv', event)">Excel</button>
                    </div>
                </div>
                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px;">Tiempo total real transcurrido desde el registro del usuario hasta el envío de la evaluación (incluye todas las pausas y días intermedios).</p>
                <canvas id="sessionDurationChart" style="max-height: 350px;"></canvas>
            </div>

            <h3 style="margin-top: 40px; color: var(--text-muted);">Comparativa de Tiempos por Demografía (Mediana)</h3>
            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Tiempo por Edad</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('timeAgeChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('timeAgeChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('timeAgeChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="timeAgeChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Tiempo por Género</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('timeGenderChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('timeGenderChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('timeGenderChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="timeGenderChart"></canvas>
                </div>
                <div class="chart-container">
                    <div class="chart-header">
                        <h2>Tiempo por Nivel Educativo</h2>
                        <div class="export-actions">
                            <button class="export-btn" onclick="exportChart('timeEduChart', 'png', event, false)">PNG</button>
                            <button class="export-btn" onclick="exportChart('timeEduChart', 'png', event, true)">Card</button>
                            <button class="export-btn" onclick="exportChart('timeEduChart', 'csv', event)">Excel</button>
                        </div>
                    </div>
                    <canvas id="timeEduChart"></canvas>
                </div>
            </div>

            <div id="mission-breakdown-container" class="item-table-container" style="margin-top: 30px; border: none; padding: 20px; background: rgba(255,255,255,0.02);">
                <div class="chart-header">
                    <h3 style="margin-top: 0; font-size: 1rem; color: var(--text-muted);">Desglose por Misión</h3>
                    <div class="export-actions">
                        <button class="export-btn" onclick="exportElement('mission-breakdown-container', 'desglose_misiones')">PNG</button>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Misión</th>
                            <th>Mediana de Tiempo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.missionStats.breakdown.map((m: any) => `
                            <tr>
                                <td style="font-weight: 600;">${m.id}</td>
                                <td style="color: var(--secondary); font-weight: 800; font-size: 1.05rem;">${m.median}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <!-- SECCIÓN 3: ANÁLISIS DE AUDITS -->
        <section id="audit-analysis">
            <h2>
                <div class="section-title-box">Análisis de Audit Logs y Database</div>
                <div class="export-actions">
                    <button class="export-btn" onclick="exportElement('audit-summary-cards', 'resumen_audit_cards')">PNG Resumen</button>
                    <button class="export-btn" onclick="exportElement('audit-analysis', 'analisis_audits')">Exportar Sección PNG</button>
                </div>
            </h2>
            <p style="color: var(--text-muted); margin-bottom: 30px;">Actividad técnica registrada entre el registro y la evaluación de los participantes.</p>
            
            <div class="summary-cards" id="audit-summary-cards" style="grid-template-columns: repeat(3, 1fr); gap: 15px; align-items: stretch;">
                <div class="card" id="card-audit-success" style="border-left: 4px solid #14b8a6;">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-audit-success', 'exito_busquedas')">PNG</button>
                    </div>
                    <h3>Éxito de Búsquedas</h3>
                    <div class="value" style="font-size: 1.3rem; color: #14b8a6;">${formatES((data.auditSummary.searchSuccess / (data.auditSummary.searchSuccess + data.auditSummary.searchFailed || 1)) * 100, 1)}%</div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${data.auditSummary.searchSuccessFormatted} Éxitos / ${data.auditSummary.searchFailedFormatted} Fallos</p>
                </div>
                <div class="card" id="card-audit-wait-ok" style="border-left: 4px solid #10b981;">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-audit-wait-ok', 'espera_ok')">PNG</button>
                    </div>
                    <h3>T. Respuesta Búsquedas (Éxito)</h3>
                    <div class="value" style="font-size: 1.3rem; color: #10b981;">Mediana: ${data.auditSummary.medianSearchTimeFormatted}s</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span>Media: ${data.auditSummary.meanSearchTimeFormatted}s</span>
                        <span>Desv. Típica: ${data.auditSummary.stdDevSearchTimeFormatted}s</span>
                        <span style="grid-column: span 2; color: ${data.auditSummary.p95SearchTime > 60 ? '#f43f5e' : '#34d399'}; font-weight: ${data.auditSummary.p95SearchTime > 60 ? 'bold' : 'normal'};">Percentil 95 (P95): ${data.auditSummary.p95SearchTimeFormatted}s</span>
                    </div>
                </div>
                <div class="card" id="card-audit-wait-err" style="border-left: 4px solid #f59e0b;">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-audit-wait-err', 'espera_err')">PNG</button>
                    </div>
                    <h3>T. Respuesta Búsquedas (Fallo)</h3>
                    <div class="value" style="font-size: 1.3rem; color: #f59e0b;">Mediana: ${data.auditSummary.medianFailedTimeFormatted}s</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span>Media: ${data.auditSummary.meanFailedTimeFormatted}s</span>
                        <span>Desv. Típica: ${data.auditSummary.stdDevFailedTimeFormatted}s</span>
                        <span style="grid-column: span 2; color: #fbbf24;">Percentil 95 (P95): ${data.auditSummary.p95FailedTimeFormatted}s</span>
                    </div>
                </div>

                <div class="card" id="card-audit-ia" style="border-left: 4px solid #6366f1;">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-audit-ia', 'interaccion_ia')">PNG</button>
                    </div>
                    <h3>Interacción Agente IA</h3>
                    <div class="value" style="font-size: 1.3rem; color: #6366f1;">${data.auditSummary.agentMessagesFormatted} msg</div>
                </div>
                <div class="card" id="card-audit-tools" style="border-left: 4px solid #a855f7;">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-audit-tools', 'uso_herramientas')">PNG</button>
                    </div>
                    <h3>Uso Herramientas Agente IA</h3>
                    <div class="value" style="font-size: 1.3rem; color: #a855f7;">${data.auditSummary.agentToolCallsFormatted}</div>
                </div>
                <div class="card" id="card-audit-efficiency" style="border-left: 4px solid #ec4899;">
                    <div class="export-actions-mini">
                        <button class="export-btn mini" onclick="exportElement('card-audit-efficiency', 'eficiencia_ia')">PNG</button>
                    </div>
                    <h3>Media Mensajes / Búsqueda</h3>
                    <div class="value" style="font-size: 1.3rem; color: #ec4899;">${data.auditSummary.meanMessagesPerSearchFormatted} msg/busq</div>
                </div>
            </div>

            <div id="audit-distributions-block" style="margin-top: 50px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 40px;">
                <h3 style="color: var(--text-muted); margin-bottom: 30px;">Distribución y Métricas de Auditoría</h3>
                <div class="charts-grid">
                    <div class="chart-container">
                        <div class="chart-header">
                            <h2>Distribución por Recurso</h2>
                            <div class="export-actions">
                                <button class="export-btn" onclick="exportChart('auditResourceChart', 'png', event, false)">PNG</button>
                                <button class="export-btn" onclick="exportChart('auditResourceChart', 'png', event, true)">Card</button>
                                <button class="export-btn" onclick="exportChart('auditResourceChart', 'csv', event)">Excel</button>
                            </div>
                        </div>
                        <div class="circular-chart-wrapper">
                            <canvas id="auditResourceChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header">
                            <h2>Rendimiento por Tipo de Trayecto</h2>
                            <div class="export-actions">
                                <button class="export-btn" onclick="exportChart('auditStatusByTypeChart', 'png', event, false)">PNG</button>
                                <button class="export-btn" onclick="exportChart('auditStatusByTypeChart', 'png', event, true)">Card</button>
                                <button class="export-btn" onclick="exportChart('auditStatusByTypeChart', 'csv', event)">Excel</button>
                            </div>
                        </div>
                        <div style="height: 300px; padding: 10px;">
                            <canvas id="auditStatusByTypeChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header">
                            <h2>Acciones más Frecuentes</h2>
                            <div class="export-actions">
                                <button class="export-btn" onclick="exportChart('auditActionChart', 'png', event, false)">PNG</button>
                                <button class="export-btn" onclick="exportChart('auditActionChart', 'png', event, true)">Card</button>
                                <button class="export-btn" onclick="exportChart('auditActionChart', 'csv', event)">Excel</button>
                            </div>
                        </div>
                        <canvas id="auditActionChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header">
                            <h2>Eficiencia: Mensajes / Búsqueda</h2>
                            <div class="export-actions">
                                <button class="export-btn" onclick="exportChart('auditEfficiencyChart', 'png', event, false)">PNG</button>
                                <button class="export-btn" onclick="exportChart('auditEfficiencyChart', 'png', event, true)">Card</button>
                                <button class="export-btn" onclick="exportChart('auditEfficiencyChart', 'csv', event)">Excel</button>
                            </div>
                        </div>
                        <canvas id="auditEfficiencyChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header">
                            <h2>Tiempos de Búsqueda (Éxito)</h2>
                            <div class="export-actions">
                                <button class="export-btn" onclick="exportChart('auditTimeDistChart', 'png', event, false)">PNG</button>
                                <button class="export-btn" onclick="exportChart('auditTimeDistChart', 'png', event, true)">Card</button>
                                <button class="export-btn" onclick="exportChart('auditTimeDistChart', 'csv', event)">Excel</button>
                            </div>
                        </div>
                        <canvas id="auditTimeDistChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header">
                            <h2>Tiempos de Búsqueda (Fallo)</h2>
                            <div class="export-actions">
                                <button class="export-btn" onclick="exportChart('auditFailedTimeDistChart', 'png', event, false)">PNG</button>
                                <button class="export-btn" onclick="exportChart('auditFailedTimeDistChart', 'png', event, true)">Card</button>
                                <button class="export-btn" onclick="exportChart('auditFailedTimeDistChart', 'csv', event)">Excel</button>
                            </div>
                        </div>
                        <canvas id="auditFailedTimeDistChart"></canvas>
                    </div>
                </div>
            </div>

            <div id="performance-error-block" style="margin-top: 50px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 40px;">
                <h3 style="color: #f43f5e; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span>⚠️ Análisis de Rendimiento Crítico y Errores</span>
                </h3>
                <p style="color: var(--text-muted); margin-bottom: 30px;">Identificación de cuellos de botella técnicos y patrones de fallo en el motor de búsqueda.</p>
                
                <div class="chart-container" style="margin-top: 30px;">
                    <div class="chart-header">
                        <h2 style="color: #f43f5e;">⚠️ Análisis de Casos Críticos de busquedas sin errores (Top 5% Latencia)</h2>
                        <div class="export-actions">
                            <button class="export-btn mini" onclick="exportElement('critical-cases-table', 'tabla_casos_criticos')">PNG Tabla</button>
                        </div>
                    </div>
                    <p style="color: var(--text-muted); margin-bottom: 20px;">Listado de las búsquedas más lentas registradas para identificar patrones de degradación.</p>
                    <div id="critical-cases-table" style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid #334155; text-align: left;">
                                    ${showIds ? '<th style="padding: 10px; color: #94a3b8;">ID Búsqueda</th>' : ''}
                                    <th style="padding: 10px; color: #94a3b8;">Duración</th>
                                    <th style="padding: 10px; color: #94a3b8;">Orígenes</th>
                                    <th style="padding: 10px; color: #94a3b8;">Destinos</th>
                                    <th style="padding: 10px; color: #94a3b8;">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.auditSummary.criticalSearches.map((s: any) => `
                                    <tr style="border-bottom: 1px solid #1e293b; transition: background 0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='transparent'">
                                        ${showIds ? `<td style="padding: 10px; font-family: monospace; color: #6366f1;">${s.id}</td>` : ''}
                                        <td style="padding: 10px; font-weight: bold; color: #f43f5e;">${s.duration.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s</td>
                                        <td style="padding: 10px;">${s.origins.join(', ')}</td>
                                        <td style="padding: 10px;">${s.destinations.join(', ')}</td>
                                        <td style="padding: 10px; color: var(--text-muted);">${s.date}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="chart-container" style="margin-top: 30px;">
                    <div class="chart-header">
                        <h2 style="color: #f59e0b;">❌ Análisis de Errores de Búsqueda</h2>
                    </div>
                    <p style="color: var(--text-muted); margin-bottom: 20px;">Listado de las búsquedas que fallaron durante la exploración con el motivo del error.</p>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid #334155; text-align: left;">
                                    ${showIds ? '<th style="padding: 10px; color: #94a3b8;">ID Búsqueda</th>' : ''}
                                    <th style="padding: 10px; color: #94a3b8;">Motivo</th>
                                    <th style="padding: 10px; color: #94a3b8;">Orígenes</th>
                                    <th style="padding: 10px; color: #94a3b8;">Destinos</th>
                                    <th style="padding: 10px; color: #94a3b8;">Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.auditSummary.allFailedSearches.length === 0 ? `
                                    <tr><td colspan="${showIds ? 5 : 4}" style="padding: 20px; text-align: center; color: var(--text-muted);">No se registraron errores de búsqueda.</td></tr>
                                ` : data.auditSummary.allFailedSearches.map((s: any) => `
                                    <tr style="border-bottom: 1px solid #1e293b; transition: background 0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='transparent'">
                                        ${showIds ? `<td style="padding: 10px; font-family: monospace; color: #6366f1;">${s.id}</td>` : ''}
                                        <td style="padding: 10px; color: #f87171; font-weight: 500;">${s.reason}</td>
                                        <td style="padding: 10px;">${s.origins.join(', ')}</td>
                                        <td style="padding: 10px;">${s.destinations.join(', ')}</td>
                                        <td style="padding: 10px; color: var(--text-muted);">${s.duration.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="chart-container" style="margin-top: 30px;">
                    <div class="chart-header">
                        <h2>📊 Agregación de Fallos</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 15px;">
                        <div>
                            <h4 style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 10px;">Por Motivo</h4>
                            <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                                ${Object.entries(data.auditSummary.failedAggregations.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
                                    <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 6px 0;">${k}</td><td style="text-align: right; font-weight: bold; color: #f87171;">${v}</td></tr>
                                `).join('')}
                            </table>
                        </div>
                        <div>
                            <h4 style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 10px;">Por Fecha de Salida</h4>
                            <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                                ${Object.entries(data.auditSummary.failedAggregations.dates).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
                                    <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 6px 0;">${k}</td><td style="text-align: right; font-weight: bold; color: #f87171;">${v}</td></tr>
                                `).join('')}
                            </table>
                        </div>
                        <div>
                            <h4 style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 10px;">Orígenes Problemáticos</h4>
                            <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                                ${Object.entries(data.auditSummary.failedAggregations.origins).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `
                                    <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 6px 0;">${k}</td><td style="text-align: right; font-weight: bold; color: #f87171;">${v}</td></tr>
                                `).join('')}
                            </table>
                        </div>
                        <div>
                            <h4 style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 10px;">Destinos Problemáticos</h4>
                            <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                                ${Object.entries(data.auditSummary.failedAggregations.destinations).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `
                                    <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 6px 0;">${k}</td><td style="text-align: right; font-weight: bold; color: #f87171;">${v}</td></tr>
                                `).join('')}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    </div>

    <script>
        // Register the datalabels plugin globally and disable by default
        if (typeof ChartDataLabels !== 'undefined') {
            Chart.register(ChartDataLabels);
            Chart.defaults.set('plugins.datalabels', {
                display: false
            });
        }

        function exportElement(target, fileName) {
            const element = typeof target === 'string' ? document.getElementById(target) : target;
            if (!element) return;

            const originalId = element.id;
            const tempId = originalId || 'export-temp-' + Math.random().toString(36).substr(2, 9);
            if (!originalId) element.id = tempId;

            // Add a class to handle specific styles during capture if needed
            element.classList.add('html2canvas-container');

            html2canvas(element, {
                backgroundColor: null, // Transparent background by default
                scale: 2, // Higher quality
                logging: false,
                useCORS: true,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById(tempId);
                    if (clonedEl) {
                        const originalId = element.id;
                        const isCanvas = clonedEl.tagName.toLowerCase() === 'canvas';
                        const isTable = (originalId && (originalId.includes('table') || originalId.includes('mission-breakdown'))) || clonedEl.tagName.toLowerCase() === 'table';
                        const isCard = clonedEl.classList.contains('card') || (originalId && originalId.includes('card'));
                        const isHeader = (originalId && originalId.includes('header'));
                        const isSummaryContainer = clonedEl.classList.contains('summary-cards') || (originalId && originalId.includes('summary'));
                        const isSection = clonedEl.tagName.toLowerCase() === 'section' || clonedEl.classList.contains('item-table-container');
                        const isMini = isCanvas || isCard || isHeader || isTable;

                        clonedEl.style.padding = isMini ? '12px' : '20px';
                        clonedEl.style.borderRadius = '20px';
                        clonedEl.style.boxSizing = 'border-box';
                        
                        // Background logic:
                        // 1. Individual charts (canvas) & standalone tables -> Transparent (no background)
                        // 2. Cards, sections, or full containers -> Solid dark background
                        if (!isCanvas && !isTable) {
                            if (isSummaryContainer) {
                                clonedEl.style.backgroundColor = 'transparent';
                                clonedEl.style.background = 'transparent';
                                if (originalId === 'header-summary') {
                                    clonedEl.style.display = 'flex';
                                    clonedEl.style.gap = '40px';
                                    clonedEl.style.justifyContent = 'center';
                                    clonedEl.style.alignItems = 'center';
                                } else {
                                    clonedEl.style.display = 'grid';
                                    const originalEl = document.getElementById(originalId);
                                    clonedEl.style.gridTemplateColumns = originalEl ? window.getComputedStyle(originalEl).gridTemplateColumns : 'repeat(4, 1fr)';
                                    clonedEl.style.gap = '20px';
                                }
                                clonedEl.querySelectorAll('.card').forEach(card => {
                                    card.style.backgroundColor = '#1e293b';
                                    card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                                });
                            } else {
                                clonedEl.style.backgroundColor = '#0f172a';
                                clonedEl.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                                clonedEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
                            }
                        } else {
                            // Canvases and Standalone Tables should always be transparent to allow integration
                            clonedEl.style.backgroundColor = 'transparent';
                            clonedEl.style.background = 'transparent';
                        }

                        // Size logic
                        if (isMini) {
                            clonedEl.style.width = 'fit-content';
                            clonedEl.style.minWidth = 'auto';
                            
                            // Specific fix for transparent tables on white backgrounds
                            if (isTable) {
                                clonedEl.style.color = '#0f172a'; // Force dark text
                                clonedEl.querySelectorAll('th').forEach(th => {
                                    th.style.color = '#475569'; // Darker muted for headers
                                    th.style.borderBottom = '2px solid rgba(0,0,0,0.15)'; // Increased contrast
                                });
                                clonedEl.querySelectorAll('td').forEach(td => {
                                    // Only override if it doesn't have a specific semantic color (like red/green)
                                    const style = window.getComputedStyle(td);
                                    if (style.color === 'rgb(255, 255, 255)' || !td.style.color) {
                                        td.style.color = '#1e293b';
                                    }
                                    td.style.borderBottom = '1px solid rgba(0,0,0,0.1)'; // Increased contrast
                                });
                            }
                        } else {
                            clonedEl.style.width = '100%';
                            clonedEl.style.minWidth = '1000px';
                        }
                    }
                }
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = fileName + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                element.classList.remove('html2canvas-container');
                if (!originalId) element.removeAttribute('id');
            });
        }

        function exportChart(chartId, format, event, includeContainer = false) {
            const chart = Chart.getChart(chartId);
            if (!chart) return;

            if (format === 'png') {
                const isCircular = chart.config.type === 'pie' || chart.config.type === 'doughnut';

                if (includeContainer) {
                    const container = document.getElementById(chartId).closest('.chart-container');
                    if (container) {
                        exportElement(container, chartId + '_full');
                    } else {
                        exportElement(chartId, chartId);
                    }
                } else {
                    exportElement(chartId, chartId);
                }

            } else if (format === 'csv') {
                const labels = chart.data.labels;
                const datasets = chart.data.datasets;
                let tsv = 'Categor\u00EDa\\t' + datasets.map(d => d.label || 'Valor').join('\\t') + '\\n';
                
                labels.forEach((l, i) => {
                    const rowData = datasets.map(d => {
                        const val = d.data[i];
                        return typeof val === 'number' ? val.toLocaleString('es-ES') : val;
                    });
                    tsv += l + '\\t' + rowData.join('\\t') + '\\n';
                });
                
                navigator.clipboard.writeText(tsv).then(() => {
                    if (event && event.currentTarget) {
                        const btn = event.currentTarget;
                        const originalText = btn.innerText;
                        btn.innerText = '¡Copiado!';
                        setTimeout(() => { btn.innerText = originalText; }, 2000);
                    }
                });
            }
        }

        const ctxDist = document.getElementById('distChart').getContext('2d');
        const gradient = ctxDist.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        const scores = ${JSON.stringify(data.allScores)};
        
        // Función de Kernel Gaussiano para suavizar la curva
        function kde(x, samples, bandwidth) {
            return samples.reduce((sum, s) => {
                const z = (x - s) / bandwidth;
                return sum + (1 / (Math.sqrt(2 * Math.PI) * bandwidth)) * Math.exp(-0.5 * z * z);
            }, 0) / samples.length;
        }

        const labels = [];
        const densityData = [];
        const bandwidth = 8.0;

        for (let i = 0; i <= 100; i += 0.5) {
            labels.push(i);
            densityData.push(kde(i, scores, bandwidth));
        }

        new Chart(ctxDist, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        data: densityData,
                        fill: true,
                        backgroundColor: gradient,
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 20 },
                        grid: { display: false },
                        title: { display: true, text: 'Perfil de Usabilidad (Escala SUS)', color: '#94a3b8' }
                    },
                    y: {
                        beginAtZero: true,
                        display: true,
                        grace: '30%', // Adds space at the top to avoid overlap with region labels
                        title: {
                            display: true,
                            text: 'Densidad de Frecuencia',
                            color: '#94a3b8',
                            font: { size: 11 }
                        },
                        ticks: { display: false },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { 
                        enabled: true,
                        callbacks: {
                            title: () => '', // Quitamos el título del tooltip para que sea más limpio
                            label: (ctx) => "Puntuación SUS: " + ctx.parsed.x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            },
            plugins: [{
                id: 'backgroundRegions',
                beforeDraw: (chart) => {
                    const {ctx, chartArea: {top, bottom, left, right, width, height}, scales: {x}} = chart;
                    if (!x || top === undefined) return;
                    const regions = [
                        { start: 0, end: 51, color: 'rgba(239, 68, 68, 0.12)', label: 'F (Awful)' },
                        { start: 51, end: 68, color: 'rgba(245, 158, 11, 0.12)', label: 'D (Poor)' },
                        { start: 68, end: 73, color: 'rgba(234, 179, 8, 0.12)', label: 'C (OK)' },
                        { start: 73, end: 85, color: 'rgba(34, 197, 94, 0.12)', label: 'B (Good)' },
                        { start: 85, end: 100, color: 'rgba(16, 185, 129, 0.12)', label: 'A (Excellent)' }
                    ];
                    regions.forEach(r => {
                        const xStart = x.getPixelForValue(r.start);
                        const xEnd = x.getPixelForValue(r.end);
                        
                        // Fondo de la región
                        ctx.fillStyle = r.color;
                        ctx.fillRect(xStart, top, xEnd - xStart, height);
                        
                        // Línea divisoria vertical
                        if (r.end < 100) {
                            ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)'; // Neutral gray for visibility
                            ctx.setLineDash([2, 4]);
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(xEnd, top);
                            ctx.lineTo(xEnd, bottom);
                            ctx.stroke();
                        }

                        ctx.fillStyle = '#475569'; // Darker color for visibility on both dark and light
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(r.label, xStart + (xEnd - xStart)/2, top + 20);
                    });
                },
                afterDraw: (chart) => {
                    const {ctx, chartArea: {top, bottom}, scales: {x}} = chart;
                    const meanRaw = ${data.stats.mean};
                    const xPos = x.getPixelForValue(meanRaw);
                    
                    ctx.save();
                    // Línea con brillo (Glow)
                    ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
                    ctx.shadowBlur = 8;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = '#818cf8'; 
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(xPos, top + 35); // Lowered to avoid region labels
                    ctx.lineTo(xPos, bottom);
                    ctx.stroke();
                    
                    // Cápsula (Pill) para el texto en la parte inferior
                    const label = 'MEDIA: ' + "${data.stats.meanFormatted}";
                    ctx.font = 'bold 10px sans-serif';
                    const textWidth = ctx.measureText(label).width;
                    const p = 6; // padding
                    
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#6366f1';
                    const rectX = xPos - (textWidth/2 + p);
                    const rectY = bottom - 40; // Moved up slightly to avoid clipping
                    const rectW = textWidth + p*2;
                    const rectH = 20;
                    
                    // Dibujar rectángulo redondeado manual corregido
                    ctx.beginPath();
                    ctx.moveTo(rectX + 4, rectY);
                    ctx.lineTo(rectX + rectW - 4, rectY);
                    ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + 4);
                    ctx.lineTo(rectX + rectW, rectY + rectH - 4);
                    ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - 4, rectY + rectH);
                    ctx.lineTo(rectX + 4, rectY + rectH);
                    ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - 4);
                    ctx.lineTo(rectX, rectY + 4);
                    ctx.quadraticCurveTo(rectX, rectY, rectX + 4, rectY);
                    ctx.fill();
                    
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.fillText(label, xPos, rectY + 14);
                    ctx.restore();
                }
            }]
        });

        // SAMPLE CHARTS
        const sampleColors = ['rgba(99, 102, 241, 0.6)', 'rgba(168, 85, 247, 0.6)', 'rgba(236, 72, 153, 0.6)', 'rgba(20, 184, 166, 0.6)'];
        
        new Chart(document.getElementById('sampleAgeChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(${JSON.stringify(data.sampleStats.age)}),
                datasets: [{ 
                    label: 'Cantidad',
                    data: Object.values(${JSON.stringify(data.sampleStats.age)}), 
                    backgroundColor: 'rgba(99, 102, 241, 0.6)'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1 },
                        title: { display: true, text: 'Participantes', color: '#94a3b8' }
                    },
                    x: {
                        title: { display: true, text: 'Edad (Años)', color: '#94a3b8' }
                    }
                }
            }
        });
        new Chart(document.getElementById('sampleGenderChart'), {
            type: 'pie',
            data: {
                labels: Object.keys(${JSON.stringify(data.sampleStats.gender)}),
                datasets: [{ 
                    data: Object.values(${JSON.stringify(data.sampleStats.gender)}).map(a => a.length), 
                    backgroundColor: sampleColors,
                    borderWidth: 0
                }]
            },
            options: {
                aspectRatio: 1.8,
                layout: { padding: 20 },
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { 
                            color: '#94a3b8',
                            padding: 15,
                            font: { size: 11 }
                        } 
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value*100 / sum).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
                            return value + " (" + percentage + ")";
                        },
                        display: (context) => {
                            const dataset = context.dataset;
                            const sum = dataset.data.reduce((a, b) => a + b, 0);
                            const value = dataset.data[context.dataIndex];
                            return (value / sum) > 0.05;
                        }
                    }
                }
            }
        });
        new Chart(document.getElementById('sampleEduChart'), {
            type: 'pie',
            data: {
                labels: Object.keys(${JSON.stringify(data.sampleStats.edu)}),
                datasets: [{ 
                    data: Object.values(${JSON.stringify(data.sampleStats.edu)}).map(a => a.length), 
                    backgroundColor: sampleColors,
                    borderWidth: 0
                }]
            },
            options: {
                aspectRatio: 1.8,
                layout: { padding: 20 },
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { 
                            color: '#94a3b8',
                            padding: 15,
                            font: { size: 11 }
                        } 
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value*100 / sum).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
                            return value + " (" + percentage + ")";
                        },
                        display: (context) => {
                            const dataset = context.dataset;
                            const sum = dataset.data.reduce((a, b) => a + b, 0);
                            const value = dataset.data[context.dataIndex];
                            return (value / sum) > 0.05;
                        }
                    }
                }
            }
        });

        // SUS BY DEMOGRAPHICS
        const ctxAge = document.getElementById('ageChart').getContext('2d');
        new Chart(ctxAge, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.ageStats.map((s: any) => s.name))},
                datasets: [{
                    label: 'Puntuación Media',
                    data: ${JSON.stringify(data.ageStats.map((s: any) => s.avg))},
                    backgroundColor: 'rgba(168, 85, 247, 0.5)'
                }]
            },
            options: { 
                responsive: true, 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        min: 0, 
                        max: 100,
                        title: { display: true, text: 'Puntuación Media', color: '#94a3b8' }
                    },
                    x: {
                        title: { display: true, text: 'Grupo de Edad', color: '#94a3b8' }
                    }
                } 
            }
        });

        const ctxGender = document.getElementById('genderChart').getContext('2d');
        new Chart(ctxGender, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.genderStats.map((s) => s.name))},
                datasets: [{
                    label: 'Puntuación Media',
                    data: ${JSON.stringify(data.genderStats.map((s) => s.avg))},
                    backgroundColor: sampleColors
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        min: 0, 
                        max: 100,
                        title: { display: true, text: 'Puntuación Media', color: '#94a3b8' }
                    },
                    x: {
                        title: { display: true, text: 'Género', color: '#94a3b8' }
                    }
                }
            }
        });

        const ctxEdu = document.getElementById('eduChart').getContext('2d');
        new Chart(ctxEdu, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.eduStats.map((s) => s.name))},
                datasets: [{
                    label: 'Puntuación Media',
                    data: ${JSON.stringify(data.eduStats.map((s) => s.avg))},
                    backgroundColor: 'rgba(20, 184, 166, 0.5)'
                }]
            },
            options: { 
                responsive: true, 
                plugins: { legend: { display: false } },
                scales: { 
                    y: { 
                        min: 0, 
                        max: 100,
                        title: { display: true, text: 'Puntuación Media', color: '#94a3b8' }
                    },
                    x: {
                        title: { display: true, text: 'Nivel Educativo', color: '#94a3b8' }
                    }
                } 
            }
        });

        // TIME BY DEMOGRAPHICS
        new Chart(document.getElementById('timeAgeChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.timeClusterStats.age.map((s) => s.name))},
                datasets: [{ label: 'Segundos (Mediana)', data: ${JSON.stringify(data.timeClusterStats.age.map((s) => s.median))}, backgroundColor: 'rgba(168, 85, 247, 0.6)' }]
            },
            options: { 
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { title: { display: true, text: 'Tiempo (s)', color: '#94a3b8' } },
                    x: { title: { display: true, text: 'Edad', color: '#94a3b8' } }
                }
            }
        });
        new Chart(document.getElementById('timeGenderChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.timeClusterStats.gender.map((s) => s.name))},
                datasets: [{ label: 'Segundos (Mediana)', data: ${JSON.stringify(data.timeClusterStats.gender.map((s) => s.median))}, backgroundColor: sampleColors }]
            },
            options: { 
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { title: { display: true, text: 'Tiempo (s)', color: '#94a3b8' } },
                    x: { title: { display: true, text: 'Género', color: '#94a3b8' } }
                }
            }
        });
        new Chart(document.getElementById('timeEduChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.timeClusterStats.edu.map((s) => s.name))},
                datasets: [{ label: 'Segundos (Mediana)', data: ${JSON.stringify(data.timeClusterStats.edu.map((s) => s.median))}, backgroundColor: 'rgba(20, 184, 166, 0.6)' }]
            },
            options: { 
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { title: { display: true, text: 'Tiempo (s)', color: '#94a3b8' } },
                    x: { title: { display: true, text: 'Nivel Educativo', color: '#94a3b8' } }
                }
            }
        });

        // SESSION DURATION CHART
        new Chart(document.getElementById('sessionDurationChart'), {
            type: 'bar',
            data: {
                labels: Object.keys(${JSON.stringify(data.missionStats.sessionRanges)}),
                datasets: [{
                    label: 'Nº Usuarios',
                    data: Object.values(${JSON.stringify(data.missionStats.sessionRanges)}),
                    backgroundColor: 'rgba(20, 184, 166, 0.5)',
                    borderColor: '#14b8a6',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1 },
                        title: { display: true, text: 'Participantes', color: '#94a3b8' }
                    },
                    x: {
                        title: { display: true, text: 'Rango de Tiempo', color: '#94a3b8' }
                    }
                }
            }
        });

        // AUDIT CHARTS
        const resourceLabels = Object.keys(${JSON.stringify(data.auditSummary.resourceDist)});
        const resourceColorMap = {
            'AGENT': 'rgba(99, 102, 241, 0.7)',  // Indigo
            'AUTH': 'rgba(245, 158, 11, 0.7)',   // Amber (High contrast vs Indigo)
            'SEARCH': 'rgba(168, 85, 247, 0.7)', // Purple
            'USER': 'rgba(16, 185, 129, 0.7)',   // Emerald
            'PLANE': 'rgba(236, 72, 153, 0.7)',  // Pink
            'AIRPORT': 'rgba(20, 184, 166, 0.7)' // Teal
        };
        const resourceEntries = Object.entries(${JSON.stringify(data.auditSummary.resourceDist)}).sort((a, b) => b[1] - a[1]);
        const sortedResourceLabels = resourceEntries.map(e => e[0]);
        const sortedResourceData = resourceEntries.map(e => e[1]);
        const resourceColors = sortedResourceLabels.map(l => resourceColorMap[l] || 'rgba(148, 163, 184, 0.7)');

        new Chart(document.getElementById('auditResourceChart'), {
            type: 'pie',
            data: {
                labels: sortedResourceLabels,
                datasets: [{ 
                    data: sortedResourceData, 
                    backgroundColor: resourceColors,
                    borderWidth: 0
                }]
            },
            options: {
                aspectRatio: 1.8,
                layout: { padding: 20 },
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { 
                            color: '#94a3b8',
                            padding: 15,
                            font: { size: 11 }
                        } 
                    },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value*100 / sum).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
                            return value + " (" + percentage + ")";
                        },
                        display: (context) => {
                            const dataset = context.dataset;
                            const sum = dataset.data.reduce((a, b) => a + b, 0);
                            const value = dataset.data[context.dataIndex];
                            return (value / sum) > 0.05;
                        }
                    }
                }
            }
        });

        // 11. Rendimiento por Tipo de Trayecto (Grouped Bar Chart)
        const auditStatusByType = ${JSON.stringify(data.auditSummary.statusByType || { oneWay: { success: 0, failed: 0 }, roundTrip: { success: 0, failed: 0 } })};
        new Chart(document.getElementById('auditStatusByTypeChart'), {
            type: 'bar',
            data: {
                labels: ['Solo Ida', 'Ida y Vuelta'],
                datasets: [
                    {
                        label: 'Completada (Éxito)',
                        data: [auditStatusByType.oneWay.success, auditStatusByType.roundTrip.success],
                        backgroundColor: '#10b981',
                        borderRadius: 8
                    },
                    {
                        label: 'Fallida (Error)',
                        data: [auditStatusByType.oneWay.failed, auditStatusByType.roundTrip.failed],
                        backgroundColor: '#f43f5e',
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(128,128,128,0.15)' }, // Visible on both dark and light
                        ticks: { color: '#94a3b8' }, // Slate gray is visible on both
                        title: { display: true, text: 'Nº de Búsquedas', color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { weight: 'bold' } } // Changed from white to slate gray
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: '#94a3b8' } },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });

        const sortedActions = Object.entries(${JSON.stringify(data.auditSummary.actionDist)})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        new Chart(document.getElementById('auditActionChart'), {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: sortedActions.map(a => a[0]),
                datasets: [{ label: 'Frecuencia', data: sortedActions.map(a => a[1]), backgroundColor: 'rgba(99, 102, 241, 0.6)' }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { title: { display: true, text: 'Frecuencia de Uso', color: '#94a3b8' } },
                    y: { title: { display: true, text: 'Acción Detectada', color: '#94a3b8' } }
                }
            }
        });



        new Chart(document.getElementById('auditEfficiencyChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(data.auditSummary.messagesToSearch.map((_, i) => "Búsq. " + (i + 1)))},
                datasets: [{ label: 'Mensajes previos', data: ${JSON.stringify(data.auditSummary.messagesToSearch)}, backgroundColor: '#ec4899' }]
            },
            options: { 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { stepSize: 1 },
                        title: { display: true, text: 'Mensajes Previos', color: '#94a3b8' }
                    },
                    x: {
                        title: { display: true, text: 'Misiones/Búsquedas Secuenciales', color: '#94a3b8' }
                    }
                } 
            }
        });



        new Chart(document.getElementById('auditTimeDistChart'), {
            type: 'bar',
            data: (() => {
                const durations = ${JSON.stringify(data.auditSummary.searchDurations)};
                const maxVal = Math.max(...durations, 0);
                const step = 10;
                const count = Math.max(1, Math.ceil((maxVal + 0.1) / step));
                
                const labels = [];
                const buckets = new Array(count).fill(0);
                
                for (let i = 0; i < count; i++) {
                    labels.push((i * step) + "-" + ((i + 1) * step) + "s");
                }
                
                durations.forEach(v => {
                    const idx = Math.floor(v / step);
                    if (idx < count) buckets[idx]++;
                    else buckets[count - 1]++;
                });
                
                return {
                    labels: labels,
                    datasets: [{ 
                        label: 'Éxitos', 
                        data: buckets, 
                        backgroundColor: 'rgba(20, 184, 166, 0.6)' 
                    }]
                };
            })(),
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Nº de Búsquedas', color: '#94a3b8' } },
                    x: { title: { display: true, text: 'Tiempo de Respuesta (Segundos)', color: '#94a3b8' } }
                }
            }
        });

        new Chart(document.getElementById('auditFailedTimeDistChart'), {
            type: 'bar',
            data: (() => {
                const durations = ${JSON.stringify(data.auditSummary.searchFailedDurations)};
                const maxVal = Math.max(...durations, 0);
                const step = 10;
                const count = Math.max(1, Math.ceil((maxVal + 0.1) / step));
                
                const labels = [];
                const buckets = new Array(count).fill(0);
                
                for (let i = 0; i < count; i++) {
                    labels.push((i * step) + "-" + ((i + 1) * step) + "s");
                }
                
                durations.forEach(v => {
                    const idx = Math.floor(v / step);
                    if (idx < count) buckets[idx]++;
                    else buckets[count - 1]++;
                });
                
                return {
                    labels: labels,
                    datasets: [{ 
                        label: 'Fallos', 
                        data: buckets, 
                        backgroundColor: 'rgba(245, 158, 11, 0.6)' 
                    }]
                };
            })(),
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Nº de Búsquedas', color: '#94a3b8' } },
                    x: { title: { display: true, text: 'Tiempo de Respuesta (Segundos)', color: '#94a3b8' } }
                }
            }
        });

    </script>
</body>
</html>
    `;
}

function getGradeClass(score: string | number) {
    const s = Number(score);
    if (s >= 80) return "grade-excellent";
    if (s >= 68) return "grade-good";
    if (s >= 50) return "grade-ok";
    return "grade-poor";
}

function getGradeText(score: string | number) {
    const s = Number(score);
    if (s >= 80) return "Excelente (A)";
    if (s >= 68) return "Bueno (B)";
    if (s >= 50) return "Aceptable (D)";
    return "Pobre (F)";
}

function generateMockData(count: number) {
    const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];
    const educations = ["High School", "Bachelor's", "Master's", "PhD", "Other"];
    const data = [];

    for (let i = 0; i < count; i++) {
        // Generate SUS results centered around 3-4 (good usability)
        const susResults = Array.from({ length: 10 }, () => Math.floor(Math.random() * 3) + 3);
        // Add some noise/variety
        if (Math.random() > 0.8) susResults[Math.floor(Math.random() * 10)] = 1;

        data.push({
            _id: `mock-${i}`,
            userId: `user-${i}`,
            susResults,
            age: Math.floor(Math.random() * 50) + 18,
            gender: genders[Math.floor(Math.random() * genders.length)],
            educationLevel: educations[Math.floor(Math.random() * educations.length)],
            timestamp: new Date(),
            receivedAt: new Date(),
            results: Array.from({ length: 3 }, (_, mIdx) => {
                const startTime = Date.now() - Math.random() * 1000000;
                return {
                    missionId: `mission-${mIdx + 1}`,
                    completedAt: new Date(startTime + 600000),
                    steps: [
                        { id: "1", title: "Inicio", completedAt: new Date(startTime) },
                        { id: "2", title: "Paso intermedio", completedAt: new Date(startTime + 150000) },
                        { id: "3", title: "Final", completedAt: new Date(startTime + 300000) }
                    ]
                };
            })
        });
    }
    return data;
}

analyze();
