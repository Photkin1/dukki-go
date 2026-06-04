import { Moment, DayType } from './Moment';

export type TripInfo = {wait: number;travel: number};

export interface Schedule{
    getTripInfo(nowMoment: Moment): TripInfo;
}

export class FixedSchedule implements Schedule{
    private constructor(
        private schedule: Map<DayType, Map<number, number>>,
        private holidaysByYear: Map<number, Set<number>>
    ) {}


    static fromJSON(
        jsonData: Record<DayType, Record<string, number>>,
        holidaysJson: Record<string, number[]>
    ): FixedSchedule {
        const schedule = new Map<DayType, Map<number, number>>();
        
        for (const [dayType, trips] of Object.entries(jsonData)) {
            const dayMap = new Map<number, number>();
            for (const [timeStr, travel] of Object.entries(trips)) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                dayMap.set(hours * 60 + minutes, travel);
            }
            schedule.set(dayType as DayType, dayMap);
        }
        
        const holidaysByYear = new Map<number, Set<number>>();
        for (const [yearStr, days] of Object.entries(holidaysJson)) {
            holidaysByYear.set(Number(yearStr), new Set(days));
        }
        
        return new FixedSchedule(schedule, holidaysByYear);
    }
    getTripInfo(arrivalTime: Moment): TripInfo {
        const year = arrivalTime.getYear;
        const dayOfYear = arrivalTime.dayOfYear;
        const holidays = this.holidaysByYear.get(year) ?? new Set();
        
        const dayType = arrivalTime.getDayType(holidays);
        const daySchedule = this.schedule.get(dayType);
        
        const currentMinutes = arrivalTime.minuteOfDay;
        
        // Если есть расписание сегодня
        if (daySchedule && daySchedule.size > 0) {
            const departures = Array.from(daySchedule.keys()).sort((a, b) => a - b);
            
            for (const dep of departures) {
                if (dep >= currentMinutes) {
                    return { wait: dep - currentMinutes, travel: daySchedule.get(dep)! };
                }
            }
        }
        
        // Сегодня нет — берём завтра
        const nextDayType = arrivalTime.getNextDayType(holidays);
        const nextDaySchedule = this.schedule.get(nextDayType);
        
        if (!nextDaySchedule || nextDaySchedule.size === 0) {
            return { wait: Infinity, travel: 0 };
        }
        
        const firstDep = Array.from(nextDaySchedule.keys()).sort((a, b) => a - b)[0];
        const minutesToMidnight = 1440 - currentMinutes;
        
        return {
            wait: minutesToMidnight + firstDep,
            travel: nextDaySchedule.get(firstDep)!
        };
    }
}   


export class MetroSchedule implements Schedule {
    private constructor(
        private waitMinutes: number,
        private travelMinutes: number,
        private firstTrainEven: number,   // первый поезд в чётные дни
        private firstTrainOdd: number     // первый поезд в нечётные дни
    ) {}

    getTripInfo(arrivalTime: Moment): TripInfo {
        const currentMinutes = arrivalTime.minuteOfDay;
        
        // Определяем первый поезд в зависимости от чётности дня
        const firstTrain = arrivalTime.isDayOfMonthEven() ? this.firstTrainEven : this.firstTrainOdd;
        
        // После полуночи до 1:00 — метро ещё работает
        if (currentMinutes < 60) {
            return { wait: this.waitMinutes, travel: this.travelMinutes };
        }
        
        // Ночной перерыв
        if (currentMinutes < firstTrain) {
            return {
                wait: firstTrain - currentMinutes,
                travel: this.travelMinutes
            };
        }
        
        // Рабочие часы
        return { wait: this.waitMinutes, travel: this.travelMinutes };
    }

    static fromJSON(jsonData: {
        wait: number;
        travel: number;
        firstTrainEven: string;
        firstTrainOdd: string;
    }): MetroSchedule {
        
        const toMinutes = (timeStr: string): number => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        return new MetroSchedule(
            jsonData.wait,
            jsonData.travel,
            toMinutes(jsonData.firstTrainEven),
            toMinutes(jsonData.firstTrainOdd)
        );
    }
}
