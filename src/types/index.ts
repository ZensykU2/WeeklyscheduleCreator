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
    startTime: string; // "08:00"
    endTime: string;   // "09:30"
    isPersistent?: boolean;
    validFrom?: {
        year: number;
        week: number;
    };
    dayPresetColor?: string; // Border color if entry came from a Day Preset
    dayPresetGroupId?: string; // Group ID for visual grouping of items dropped together
    dayPresetId?: string; // ID of the source Day Preset for live color syncing
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
    startDate: string; // ISO String
    entries: ScheduleEntry[];
}

export interface Settings {
    workDays: Day[];
    dayStart: string;   // "08:00"
    dayEnd: string;     // "17:00"
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
