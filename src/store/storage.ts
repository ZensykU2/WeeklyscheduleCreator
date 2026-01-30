import { TimeBlock, WeekPlan, Settings, ScheduleEntry, DayPreset } from '../types';

interface StoreData {
    presets: TimeBlock[];
    weekPlans: Record<string, WeekPlan>; // key: "year-week"
    settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
    workDays: ['MO', 'DI', 'MI', 'DO', 'FR'],
    dayStart: '08:00',
    dayEnd: '17:00',
    exportFormat: 'excel',
    pinnedDays: []
};

// Mock store for now since we're in the renderer and need to handle IPC for real electron-store
// I will implement the IPC bridge later if needed, but for now let's use localStorage for simplicity
// or assume electron-store is handled in the main process.

export const storage = {
    getSettings: async (): Promise<Settings> => {
        const s = await (window as any).electronTitleBar?.store.get('settings');
        return s || DEFAULT_SETTINGS;
    },
    setSettings: async (settings: Settings) => {
        await (window as any).electronTitleBar?.store.set('settings', settings);
    },
    getPresets: async (): Promise<TimeBlock[]> => {
        const p = await (window as any).electronTitleBar?.store.get('presets');
        return p || [];
    },
    setPresets: async (presets: TimeBlock[]) => {
        await (window as any).electronTitleBar?.store.set('presets', presets);
    },
    getWeekPlan: async (year: number, week: number): Promise<WeekPlan | null> => {
        const wp = await (window as any).electronTitleBar?.store.get(`plan-${year}-${week}`);
        return wp || null;
    },
    setWeekPlan: async (plan: WeekPlan) => {
        await (window as any).electronTitleBar?.store.set(`plan-${plan.year}-${plan.weekNumber}`, plan);
    },
    getPersistentEntries: async (): Promise<ScheduleEntry[]> => {
        const p = await (window as any).electronTitleBar?.store.get('persistentEntries');
        return p || [];
    },
    setPersistentEntries: async (entries: ScheduleEntry[]) => {
        await (window as any).electronTitleBar?.store.set('persistentEntries', entries);
    },
    getDayPresets: async (): Promise<DayPreset[]> => {
        const p = await (window as any).electronTitleBar?.store.get('dayPresets');
        return p || [];
    },
    setDayPresets: async (presets: DayPreset[]) => {
        await (window as any).electronTitleBar?.store.set('dayPresets', presets);
    },
    getDeletedPersistentSlots: async (): Promise<{ day: string; startTime: string; deletedInWeek: { year: number; week: number } }[]> => {
        const p = await (window as any).electronTitleBar?.store.get('deletedPersistentSlots');
        return p || [];
    },
    setDeletedPersistentSlots: async (slots: { day: string; startTime: string; deletedInWeek: { year: number; week: number } }[]) => {
        await (window as any).electronTitleBar?.store.set('deletedPersistentSlots', slots);
    }
};
