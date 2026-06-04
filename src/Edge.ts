// Edge.ts
import { Moment } from './Moment';
import { Schedule, TripInfo, FixedSchedule, MetroSchedule } from './Schedule';

export type TransportType = "walk" | "bus" | "train" | `metro_${number}`;

export interface Edge {
    readonly toId: string;
    readonly transportType: TransportType;
    readonly transportName: string;
    getWeight(arrivalTime: Moment): number;
    getTripInfo?(arrivalTime: Moment): TripInfo;
}

// ==================== СТАТИЧЕСКОЕ РЕБРО ====================

export class StaticEdge implements Edge {
    constructor(
        public toId: string,
        public transportType: TransportType,
        public transportName: string,
        private travelMinutes: number
    ) {}

    getWeight(arrivalTime: Moment): number {
        return this.travelMinutes;
    }

    static fromJSON(json: {
        toId: string;
        transportType: "walk";
        transportName: string;
        travelMinutes: number;
    }): StaticEdge {
        return new StaticEdge(
            json.toId,
            json.transportType,
            json.transportName,
            json.travelMinutes
        );
    }
}

// ==================== ДИНАМИЧЕСКОЕ РЕБРО ====================

export class DynamicEdge implements Edge {
    constructor(
        public toId: string,
        public transportType: TransportType,
        public transportName: string,
        private schedule: Schedule
    ) {}

    getWeight(arrivalTime: Moment): number {
        const trip = this.schedule.getTripInfo(arrivalTime);
        if (trip.wait === Infinity) return Infinity;
        return trip.wait + trip.travel;
    }

    getTripInfo(arrivalTime: Moment): TripInfo {
        return this.schedule.getTripInfo(arrivalTime);
    }

    static fromJSON(
        json: {
            toId: string;
            transportType: TransportType;
            transportName: string;
        },
        scheduleJson: any,
        holidaysJson?: any
    ): DynamicEdge {
        if (scheduleJson.wait !== undefined) {
            const schedule = MetroSchedule.fromJSON(scheduleJson);
            return new DynamicEdge(
                json.toId,
                json.transportType,
                json.transportName,
                schedule
            );
        }
        
        const schedule = FixedSchedule.fromJSON(scheduleJson, holidaysJson || {});
        return new DynamicEdge(
            json.toId,
            json.transportType,
            json.transportName,
            schedule
        );
    }
}

// ==================== ФАБРИКА ====================

export function createEdge(json: any): Edge {
    if (json.type === "static") {
        return StaticEdge.fromJSON(json);
    }
    
    return DynamicEdge.fromJSON(
        { toId: json.toId, transportType: json.transportType, transportName: json.transportName },
        json.schedule,
        json.holidays
    );
}