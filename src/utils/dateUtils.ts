import { format, startOfWeek, addDays, getWeek, getYear, parseISO, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { Day } from '../types';

export const dayMap: Record<Day, number> = {
    'MO': 0,
    'DI': 1,
    'MI': 2,
    'DO': 3,
    'FR': 4,
    'SA': 5,
    'SO': 6
};

export const reverseDayMap: Record<number, Day> = {
    0: 'MO',
    1: 'DI',
    2: 'MI',
    3: 'DO',
    4: 'FR',
    5: 'SA',
    6: 'SO'
};

export function getCurrentWeekRange(date: Date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
    const end = addDays(start, 4); // Friday
    const weekNumber = getWeek(date, { weekStartsOn: 1 });
    const year = getYear(date);

    return {
        start,
        end,
        weekNumber,
        year,
        formattedRange: `${format(start, 'dd.MM.')} - ${format(end, 'dd.MM.yyyy')}`
    };
}

export function getDaysOfWeek(startDate: Date) {
    return Array.from({ length: 7 }).map((_, i) => ({
        date: addDays(startDate, i),
        dayName: reverseDayMap[i]
    }));
}

export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
