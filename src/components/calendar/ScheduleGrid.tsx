import React from 'react';
import { TimeBlock, ScheduleEntry, Day, DayPreset } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/dateUtils';
import { DayColumn } from './DayColumn';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ScheduleGridProps {
    days: Day[];
    startTime: string;
    endTime: string;
    entries: ScheduleEntry[];
    presets: TimeBlock[];
    onAddEntry: (entry: ScheduleEntry) => void;
    onDeleteEntry: (id: string) => void;
    onDeleteGroup?: (groupId: string) => void;
    onMoveEntries: (entries: { id: string; day: Day; startTime: string; endTime: string }[]) => void;
    onUpdateEntry: (entry: ScheduleEntry) => void;
    selectedEntryIds: Set<string>;
    onSelectEntry: (id: string | null, multi: boolean) => void;
    pinnedDays: Day[];
    onTogglePinDay: (day: Day) => void;
    dayPresets: DayPreset[];
    onSaveDayAsPreset: (day: Day) => void;
    isAnimating?: boolean;
}

const ScheduleGridBase: React.FC<ScheduleGridProps> = ({
    days,
    startTime,
    endTime,
    entries,
    presets,
    onAddEntry,
    onDeleteEntry,
    onDeleteGroup,
    onMoveEntries,
    onUpdateEntry,
    selectedEntryIds,
    onSelectEntry,
    pinnedDays,
    onTogglePinDay,
    dayPresets,
    onSaveDayAsPreset,
    isAnimating = false
}) => {
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const totalMins = endMins - startMins;

    // Memoize toggle handler
    const handleTogglePin = React.useCallback((day: Day) => {
        onTogglePinDay(day);
    }, [onTogglePinDay]);

    // slots are ONLY the start hours
    const timeSlots = React.useMemo(() => Array.from({ length: Math.floor(totalMins / 60) }).map(
        (_, i) => minutesToTime(startMins + i * 60)
    ), [totalMins, startMins]);

    return (
        <div
            className="flex-1 overflow-auto bg-slate-900/60 rounded-[2rem] border border-white/5 shadow-2xl relative"
            style={{
                contain: isAnimating ? 'strict' : 'layout paint',
                willChange: isAnimating ? 'transform' : 'auto',
                // Prevent horizontal scrollbar flickering during layout shift
                overflowX: isAnimating ? 'hidden' : 'auto'
            }}
            onClick={() => onSelectEntry(null, false)}
        >
            <div className="inline-flex min-w-full p-4">
                {/* Time Column */}
                <div className="w-20 sticky left-0 z-[60] bg-slate-950 border-r border-white/5 rounded-l-2xl">
                    <div className="h-12 border-b border-white/5" />
                    {timeSlots.map((time) => (
                        <div key={time} className="h-[4.5rem] text-[10px] text-slate-500 flex items-start justify-center pt-2 font-black tracking-widest uppercase relative">
                            {time}
                        </div>
                    ))}
                    {/* Improved End Time at the bottom */}
                    <div className="h-8 text-[10px] text-slate-400 flex items-center justify-center font-black tracking-widest uppercase border-t border-white/5 bg-white/5 rounded-bl-2xl">
                        {endTime}
                    </div>
                </div>

                {/* Day Columns */}
                <div className="flex flex-1 min-w-0">
                    {days.map((day) => (
                        <DayColumn
                            key={day}
                            day={day}
                            startTime={startTime}
                            endTime={endTime}
                            entries={entries.filter((e) => e.day === day)}
                            allEntries={entries}
                            presets={presets}
                            onAddEntry={onAddEntry}
                            onDeleteEntry={onDeleteEntry}
                            onDeleteGroup={onDeleteGroup}
                            onMoveEntries={onMoveEntries}
                            onUpdateEntry={onUpdateEntry}
                            selectedEntryIds={selectedEntryIds}
                            onSelectEntry={onSelectEntry}
                            isPinned={pinnedDays.includes(day)}
                            onTogglePin={() => handleTogglePin(day)}
                            dayPresets={dayPresets}
                            onSaveDayAsPreset={onSaveDayAsPreset}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export const ScheduleGrid = React.memo(ScheduleGridBase);
