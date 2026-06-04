// types.ts
export type DayType = 
    | "monday" 
    | "tuesday" 
    | "wednesday" 
    | "thursday" 
    | "friday" 
    | "saturday" 
    | "sunday" 
    | "holiday";

export class Moment {
    private constructor(private minutesSinceEpoch: number) {}

    public static now(): Moment {
        const nowMinutes: number = Math.trunc(Date.now() / 60000);
        const offset: number = new Date().getTimezoneOffset(); // минут от UTC (Москва: -180)
        const localMinutes: number = nowMinutes - offset;
        return new Moment(localMinutes);
    }
    
    public static fromMinutes(minutes: number): Moment {
        return new Moment(minutes);
    }

    public addMinutes(minutes: number): Moment {
        return new Moment(this.minutesSinceEpoch + minutes);
    }  

    public get minuteOfDay(): number {
        return this.minutesSinceEpoch % 1440;
    }
    
    public get hoursOfDay(): number {
        return Math.trunc(this.minuteOfDay / 60);
    }
    
    public get dayOfWeek(): number {
        return (Math.floor(this.minutesSinceEpoch / 1440) + 4) % 7;
    }
    
    public get dayOfYear(): number {
        const date: Date = new Date(this.minutesSinceEpoch * 60000);
        const startThisYears: Date = new Date(date.getFullYear(), 0, 0);
        const day: number = Math.trunc((date.getTime() - startThisYears.getTime()) / (60000 * 60 * 24));
        return day;
    }
    
    public get dayOfMonth(): number {
        return new Date(this.minutesSinceEpoch * 60000).getDate();
    }
    public get getYear(): number {
        return new Date(this.minutesSinceEpoch * 60000).getFullYear();
    }
    
    public isDayOfMonthEven(): boolean {
        return this.dayOfMonth % 2 === 0;
    }
    
    public getDayType(holidays: Set<number>): DayType {
        // Проверка на праздник по дню года
        if (holidays.has(this.dayOfYear)) {
            return "holiday";
        }
        
        // День недели: 0 вс, 1 пн, 2 вт, 3 ср, 4 чт, 5 пт, 6 сб
        switch (this.dayOfWeek) {
            case 1: return "monday";
            case 2: return "tuesday";
            case 3: return "wednesday";
            case 4: return "thursday";
            case 5: return "friday";
            case 6: return "saturday";
            case 0: return "sunday";
            default: return "monday";
        }
    }
    public getNextDayType(holidays: Set<number>): DayType {
        return this.addMinutes(1440).getDayType(holidays);
    }
}