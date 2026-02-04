import React from 'react';
import { useDrop } from 'react-dnd';
import { TimeBlock, ScheduleEntry, Day, DayPreset } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/dateUtils';
import { DraggableEntry } from './DraggableEntry';
import { Pin, SaveAll } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface DayColumnProps {
    day: Day;
    startTime: string;
    endTime: string;
    entries: ScheduleEntry[];
    allEntries: ScheduleEntry[];
    presets: TimeBlock[];
    onAddEntry: (entry: ScheduleEntry) => void;
    onDeleteEntry: (id: string) => void;
    onDeleteGroup?: (groupId: string) => void;
    onMoveEntries: (entries: { id: string; day: Day; startTime: string; endTime: string }[]) => void;
    onUpdateEntry: (entry: ScheduleEntry) => void;
    selectedEntryIds: Set<string>;
    onSelectEntry: (id: string | null, multi: boolean) => void;
    isPinned: boolean;
    onTogglePin: () => void;
    dayPresets: DayPreset[];
    onSaveDayAsPreset: (day: Day) => void;
}

const DayColumnBase: React.FC<DayColumnProps> = ({ day, startTime, endTime, entries, allEntries, presets, onAddEntry, onDeleteEntry, onDeleteGroup, onMoveEntries, onUpdateEntry, selectedEntryIds, onSelectEntry, isPinned, onTogglePin, dayPresets, onSaveDayAsPreset }) => {
    const [hoverPreview, setHoverPreview] = React.useState<{ top: number; height: number; color?: string }[]>([]);

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    const totalMins = endMins - startMins;

    const [{ isOver }, drop] = useDrop(() => ({
        accept: ['PRESET', 'ENTRY', 'DAY_PRESET'],
        hover: (item: { id: string; type?: string; dayPresetGroupId?: string }, monitor) => {
            const offset = monitor.getClientOffset();
            if (!offset) return;

            const gridRect = document.getElementById(`grid-${day}`)?.getBoundingClientRect();
            if (!gridRect) return;

            const y = Math.max(0, offset.y - gridRect.top);
            // Use computed content height (4.5rem = 72px per hour slot) instead of measured height
            const contentHeight = (totalMins / 60) * 72;
            // Clamp to valid range - last valid slot is endTime - 60 (e.g., 16:00 if end is 17:00)
            const rawDropMins = Math.floor((y / contentHeight) * (totalMins / 60)) * 60 + startMins;
            const dropMins = Math.min(rawDropMins, endMins - 60);

            const dropType = monitor.getItemType();

            if (dropType === 'DAY_PRESET') {
                const preset = dayPresets.find(p => p.id === item.id);
                if (preset) {
                    setHoverPreview(preset.entries.map(e => {
                        const s = timeToMinutes(e.startTime);
                        const ed = timeToMinutes(e.endTime);
                        return {
                            top: ((s - startMins) / 60) * 4.5,
                            height: ((ed - s) / 60) * 4.5,
                            color: preset.color
                        };
                    }));
                }
            } else if (item.type === 'ENTRY') {
                const draggedEntry = allEntries.find(e => e.id === item.id);
                if (draggedEntry) {
                    let dragOffsetMins = dropMins - timeToMinutes(draggedEntry.startTime);

                    if (draggedEntry.dayPresetGroupId) {
                        const groupEntries = allEntries.filter(e => e.dayPresetGroupId === draggedEntry.dayPresetGroupId);
                        // Find the group's earliest start and latest end
                        const groupStartMins = Math.min(...groupEntries.map(e => timeToMinutes(e.startTime)));
                        const groupEndMins = Math.max(...groupEntries.map(e => timeToMinutes(e.endTime)));

                        // Clamp offset so entire group stays within bounds
                        const minOffset = startMins - groupStartMins; // Can't go before startMins
                        const maxOffset = endMins - groupEndMins; // Can't go past endMins
                        dragOffsetMins = Math.max(minOffset, Math.min(maxOffset, dragOffsetMins));

                        setHoverPreview(groupEntries.map(e => {
                            const s = timeToMinutes(e.startTime) + dragOffsetMins;
                            const ed = timeToMinutes(e.endTime) + dragOffsetMins;
                            const block = presets.find(p => p.id === e.blockId);
                            return {
                                top: ((s - startMins) / 60) * 4.5,
                                height: ((ed - s) / 60) * 4.5,
                                color: block?.color
                            };
                        }));
                    } else {
                        const duration = timeToMinutes(draggedEntry.endTime) - timeToMinutes(draggedEntry.startTime);
                        const block = presets.find(p => p.id === draggedEntry.blockId);
                        setHoverPreview([{
                            top: ((dropMins - startMins) / 60) * 4.5,
                            height: (duration / 60) * 4.5,
                            color: block?.color
                        }]);
                    }
                }
            } else {
                const block = presets.find(p => p.id === item.id);
                setHoverPreview([{
                    top: ((dropMins - startMins) / 60) * 4.5,
                    height: 4.5,
                    color: block?.color
                }]);
            }
        },
        drop: (item: { id: string; type?: string }, monitor) => {
            const offset = monitor.getClientOffset();
            if (!offset) return;

            // Check for DAY_PRESET drop
            const dropType = monitor.getItemType();
            if (dropType === 'DAY_PRESET') {
                const preset = dayPresets.find(p => p.id === item.id);
                if (preset) {
                    const groupId = Math.random().toString(36).substring(2, 11);
                    preset.entries.forEach(template => {
                        onAddEntry({
                            ...template,
                            id: Math.random().toString(36).substring(2, 11),
                            day: day,
                            dayPresetColor: preset.color, // Track which Day Preset added this
                            dayPresetGroupId: groupId, // New: Assign group ID for visual grouping
                            dayPresetId: preset.id // New: Assign template ID for live color syncing
                        });
                    });
                }
                return;
            }

            const gridRect = document.getElementById(`grid-${day}`)?.getBoundingClientRect();
            if (!gridRect) return;

            const y = Math.max(0, offset.y - gridRect.top);
            // Use fixed slot height (4.5rem = 72px) instead of calculated from measured height
            const slotHeight = 72; // 4.5rem in pixels
            // Clamp to valid range - last valid slot is endTime - 60 (e.g., 16:00 if end is 17:00)
            // If hovering over the blocked footer (last 32px), don't show preview
            if (y > (totalMins / 60) * 72) {
                setHoverPreview([]);
                return;
            }

            const rawDropMins = Math.floor(y / slotHeight) * 60 + startMins;
            const dropMins = Math.min(rawDropMins, endMins - 60);

            if (item.type === 'ENTRY') {
                const draggedEntry = allEntries.find(e => e.id === item.id);
                if (draggedEntry) {
                    const dragOffsetMins = dropMins - timeToMinutes(draggedEntry.startTime);

                    if (draggedEntry.dayPresetGroupId) {
                        // Move entire group
                        const groupEntries = allEntries.filter(e => e.dayPresetGroupId === draggedEntry.dayPresetGroupId);

                        // Find the group's earliest start and latest end
                        const groupStartMins = Math.min(...groupEntries.map(e => timeToMinutes(e.startTime)));
                        const groupEndMins = Math.max(...groupEntries.map(e => timeToMinutes(e.endTime)));

                        // Clamp offset so entire group stays within bounds
                        const minOffset = startMins - groupStartMins;
                        const maxOffset = endMins - groupEndMins;
                        const clampedDragOffset = Math.max(minOffset, Math.min(maxOffset, dragOffsetMins));

                        const updates = groupEntries.map(entry => {
                            const entryStartMins = timeToMinutes(entry.startTime);
                            const entryEndMins = timeToMinutes(entry.endTime);
                            const duration = entryEndMins - entryStartMins;

                            return {
                                id: entry.id,
                                day: day,
                                startTime: minutesToTime(entryStartMins + clampedDragOffset),
                                endTime: minutesToTime(entryStartMins + clampedDragOffset + duration)
                            };
                        });

                        onMoveEntries(updates);
                    } else {
                        // Move single entry using move strategy as well to be safer, or keep delete/add?
                        // Using move strategy is cleaner.
                        onMoveEntries([{
                            id: draggedEntry.id,
                            day: day,
                            startTime: minutesToTime(dropMins),
                            endTime: minutesToTime(dropMins + (timeToMinutes(draggedEntry.endTime) - timeToMinutes(draggedEntry.startTime)))
                        }]);
                    }
                }
            } else {
                onAddEntry({
                    id: Math.random().toString(36).substring(2, 11),
                    blockId: item.id,
                    day,
                    startTime: minutesToTime(dropMins),
                    endTime: minutesToTime(dropMins + 60),
                });
            }
            setHoverPreview([]);
        },
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }), [day, startTime, startMins, totalMins, onAddEntry, onDeleteEntry, allEntries, dayPresets, presets]);

    return (
        <div
            id={`col-${day}`}
            ref={(node) => { drop(node); }}
            className={cn(
                "flex-1 min-w-[200px] border-r border-white/5 relative select-none transition-[background-color]",
            )}
            onMouseLeave={() => setHoverPreview([])}
        >
            {/* Hover Highlight Overlay - stops before footer (bottom-8) */}
            {isOver && (
                <div className="absolute inset-x-0 top-12 bottom-8 bg-indigo-600/10 pointer-events-none z-0" />
            )}

            <div className="h-12 flex items-center justify-between px-3 border-b border-white/5 bg-slate-950/20 sticky top-0 z-[1000] font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] group/header hover:bg-slate-900/40 transition-[background-color] duration-200">
                <span>{day}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSaveDayAsPreset(day);
                        }}
                        className="p-1.5 rounded-lg transition-[transform,background-color,color,opacity] duration-200 active:scale-90 cursor-pointer opacity-0 group-hover/header:opacity-100 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 relative z-50"
                        title="Diesen Tag als Vorlage speichern"
                    >
                        <SaveAll size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin();
                        }}
                        className={cn(
                            "p-1.5 rounded-lg transition-[transform,background-color,color,opacity] duration-200 active:scale-90 cursor-pointer opacity-0 group-hover/header:opacity-100 relative z-50",
                            isPinned
                                ? "text-indigo-400 bg-indigo-400/10 opacity-100" // Always visible if pinned
                                : "text-slate-500 hover:text-white hover:bg-white/10"
                        )}
                        title={isPinned ? "Tag lösen (Auto-Pin aus)" : "Tag anpinnen (Auto-Pin ein)"}
                    >
                        <Pin size={12} className={cn(isPinned && "fill-current")} />
                    </button>
                </div>
            </div>
            <div id={`grid-${day}`} className="relative">
                <div className="relative" style={{ height: `${(totalMins / 60) * 4.5}rem` }}>
                    {/* Grid lines */}
                    {Array.from({ length: Math.ceil(totalMins / 60) }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute left-0 right-0 border-b border-white/[0.02]"
                            style={{ top: `${i * 4.5}rem`, height: '4.5rem' }}
                        />
                    ))}

                    {/* Ghost block for D&D preview */}
                    {isOver && hoverPreview.map((ghost, idx) => (
                        <div
                            key={idx}
                            className="absolute left-2 right-2 rounded-xl border-2 border-dashed border-white/60 bg-white/10 z-0 pointer-events-none animate-pulse"
                            style={{
                                top: `${ghost.top}rem`,
                                height: `${ghost.height}rem`,
                                backgroundColor: ghost.color ? `${ghost.color}20` : undefined,
                                borderColor: ghost.color
                            }}
                        />
                    ))}

                    {/* Entries */}
                    {entries
                        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                        .map((entry, i, sortedEntries) => {
                            const entryStartMins = timeToMinutes(entry.startTime);
                            const entryEndMins = timeToMinutes(entry.endTime);
                            const top = ((entryStartMins - startMins) / 60) * 4.5;
                            const height = ((entryEndMins - entryStartMins) / 60) * 4.5;
                            const block = presets.find(p => p.id === entry.blockId);

                            // Calculate grouping
                            const isFirstInGroup = entry.dayPresetGroupId
                                ? i === 0 || sortedEntries[i - 1].dayPresetGroupId !== entry.dayPresetGroupId
                                : true;
                            const isLastInGroup = entry.dayPresetGroupId
                                ? i === sortedEntries.length - 1 || sortedEntries[i + 1].dayPresetGroupId !== entry.dayPresetGroupId
                                : true;

                            return (
                                <DraggableEntry
                                    key={entry.id}
                                    entry={entry}
                                    block={block}
                                    onDelete={onDeleteEntry}
                                    onDeleteGroup={onDeleteGroup}
                                    onUpdate={onUpdateEntry}
                                    top={top}
                                    height={height}
                                    isSelected={selectedEntryIds.has(entry.id)}
                                    onSelect={(multi) => onSelectEntry(entry.id, multi)}
                                    zIndex={10 + i}
                                    isFirstInGroup={isFirstInGroup}
                                    isLastInGroup={isLastInGroup}
                                    dayPresets={dayPresets}
                                />
                            );
                        })}
                </div>
            </div>
            {/* Blocked Footer to match Time Column's End Time block */}
            <div className="h-8 border-t border-white/5 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03)_10px,transparent_10px,transparent_20px)]" />
        </div>
    );
};

export const DayColumn = React.memo(DayColumnBase);
