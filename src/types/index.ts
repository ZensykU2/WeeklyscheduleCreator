export type Day = 'MO' | 'DI' | 'MI' | 'DO' | 'FR' | 'SA' | 'SO';

export type TimeBlockType =
    | 'project-int'
    | 'project-ext'
    | 'school-reg'
    | 'school-uk'
    | 'weiterbildung'
    | 'break';

export interface TimeBlock {
    id: string;
    name: string;
    color: string;
    type: TimeBlockType;
}

export interface ScheduleEntry {
    id: string;
    blockId: string;
    day: Day;
    startTime: string;
    endTime: string;
    isPersistent?: boolean;
    validFrom?: {
        year: number;
        week: number;
    };
    dayPresetColor?: string;
    dayPresetGroupId?: string;
    dayPresetId?: string;
}

export interface DayPreset {
    id: string;
    name: string;
    color: string;
    entries: Omit<ScheduleEntry, 'id' | 'day' | 'isPersistent' | 'validFrom'>[];
}

export interface WeekPlan {
    weekNumber: number;
    year: number;
    startDate: string;
    entries: ScheduleEntry[];
}

export interface Settings {
    workDays: Day[];
    dayStart: string;
    dayEnd: string;
    exportFormat: 'excel' | 'googleSheets';
    pinnedDays: Day[];
    language: 'de' | 'en';
    accentColor?: string;
}

export interface AppState {
    weekPlan: WeekPlan;
    presets: TimeBlock[];
    dayPresets: DayPreset[];
}
