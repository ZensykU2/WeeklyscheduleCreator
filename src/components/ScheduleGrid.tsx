import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { TimeBlock, ScheduleEntry, Day, DayPreset } from '../types';
import { timeToMinutes, minutesToTime } from '../utils/dateUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Trash2, GripVertical, Clock, Pin, Save, SaveAll } from 'lucide-react';

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
                        <DayColumnMemo
                            key={day}
                            day={day}
                            startTime={startTime}
                            endTime={endTime}
                            entries={entries.filter((e) => e.day === day)}
                            allEntries={entries}
                            presets={presets}
                            onAddEntry={onAddEntry}
                            onDeleteEntry={onDeleteEntry}
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

interface DayColumnProps {
    day: Day;
    startTime: string;
    endTime: string;
    entries: ScheduleEntry[];
    allEntries: ScheduleEntry[];
    presets: TimeBlock[];
    onAddEntry: (entry: ScheduleEntry) => void;
    onDeleteEntry: (id: string) => void;
    onUpdateEntry: (entry: ScheduleEntry) => void;
    selectedEntryIds: Set<string>;
    onSelectEntry: (id: string | null, multi: boolean) => void;
    isPinned: boolean;
    onTogglePin: () => void;
    dayPresets: DayPreset[];
    onSaveDayAsPreset: (day: Day) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, startTime, endTime, entries, allEntries, presets, onAddEntry, onDeleteEntry, onUpdateEntry, selectedEntryIds, onSelectEntry, isPinned, onTogglePin, dayPresets, onSaveDayAsPreset }) => {
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

                        groupEntries.forEach(entry => {
                            onDeleteEntry(entry.id);
                            const entryStartMins = timeToMinutes(entry.startTime);
                            const entryEndMins = timeToMinutes(entry.endTime);
                            const duration = entryEndMins - entryStartMins;

                            onAddEntry({
                                ...entry,
                                day,
                                startTime: minutesToTime(entryStartMins + clampedDragOffset),
                                endTime: minutesToTime(entryStartMins + clampedDragOffset + duration),
                            });
                        });
                    } else {
                        // Move single entry
                        onDeleteEntry(draggedEntry.id);
                        onAddEntry({
                            ...draggedEntry,
                            day,
                            startTime: minutesToTime(dropMins),
                            endTime: minutesToTime(dropMins + (timeToMinutes(draggedEntry.endTime) - timeToMinutes(draggedEntry.startTime))),
                        });
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
                isOver && "bg-indigo-600/10"
            )}
            style={{
                contain: 'layout'
            }}
            onMouseLeave={() => setHoverPreview([])}
        >
            <div className="h-12 flex items-center justify-between px-3 border-b border-white/5 bg-slate-950/20 sticky top-0 z-50 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] group/header hover:bg-slate-900/40 transition-[background-color] duration-200">
                <span>{day}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSaveDayAsPreset(day);
                        }}
                        className="p-1.5 rounded-lg transition-[transform,background-color,color,opacity] duration-200 active:scale-90 cursor-pointer opacity-0 group-hover/header:opacity-100 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
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
                            "p-1.5 rounded-lg transition-[transform,background-color,color,opacity] duration-200 active:scale-90 cursor-pointer opacity-0 group-hover/header:opacity-100",
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
                                <DraggableEntryMemo
                                    key={entry.id}
                                    entry={entry}
                                    block={block}
                                    onDelete={onDeleteEntry}
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
        </div>
    );
};

interface DraggableEntryProps {
    entry: ScheduleEntry;
    block?: TimeBlock;
    onDelete: (id: string) => void;
    onUpdate: (entry: ScheduleEntry) => void;
    top: number;
    height: number;
    isSelected: boolean;
    onSelect: (multi: boolean) => void;
    zIndex: number;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
    dayPresets: DayPreset[];
}

const DraggableEntry: React.FC<DraggableEntryProps> = ({ entry, block, onDelete, onUpdate, top, height, isSelected, onSelect, zIndex, isFirstInGroup, isLastInGroup, dayPresets }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'ENTRY',
        item: { id: entry.id, type: 'ENTRY', dayPresetGroupId: entry.dayPresetGroupId },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [entry.id, entry.dayPresetGroupId]);

    const typeLabels: Record<string, string> = {
        'project-int': 'Projekt (Int)',
        'project-ext': 'Projekt (Ext)',
        'school-reg': 'Schule',
        'school-uk': 'ÜK',
        'weiterbildung': 'Weiterbildung',
        'break': 'Pause'
    };

    const [showColors, setShowColors] = React.useState(false);

    // Live color sync
    const presetTheme = dayPresets.find(p => p.id === entry.dayPresetId);
    const borderColor = presetTheme?.color || entry.dayPresetColor || 'rgba(255,255,255,0.2)';

    return (
        <div
            ref={(node) => { drag(node); }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
            }}
            className={cn(
                "absolute left-1 right-1 p-2.5 text-[10px] font-bold flex flex-col justify-between border group overflow-visible cursor-grab active:cursor-grabbing hover:brightness-110",
                "transition-[transform,opacity,background-color,border-color,box-shadow,filter] duration-200 ease-out",
                isDragging ? "opacity-0" : "opacity-100",
                isSelected ? "border-white ring-2 ring-white/50 scale-[1.02] shadow-2xl z-[100] rounded-xl" : "shadow-xl",
                !isSelected && entry.dayPresetGroupId && [
                    !isFirstInGroup && "border-t-0",
                    !isLastInGroup && "border-b-0",
                    isFirstInGroup && isLastInGroup ? "rounded-xl" :
                        isFirstInGroup ? "rounded-t-xl rounded-b-none" :
                            isLastInGroup ? "rounded-b-xl rounded-t-none" :
                                "rounded-none"
                ],
                !isSelected && !entry.dayPresetGroupId && "rounded-xl border-white/20"
            )}
            style={{
                top: `${top}rem`,
                height: `${height}rem`,
                backgroundColor: block?.color || '#3366ff',
                zIndex: isSelected ? 100 : zIndex,
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden',
                ...(entry.dayPresetGroupId && !isSelected ? {
                    borderColor: borderColor,
                    borderWidth: '2px',
                    borderTopWidth: isFirstInGroup ? '2px' : '0px',
                    borderBottomWidth: isLastInGroup ? '2px' : '0px',
                } : {})
            }}
        >
            {/* Group Delete Button - Visible on hover for grouped items */}
            {entry.dayPresetGroupId && isFirstInGroup && !isSelected && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // This logic will be handled if we pass down a group delete handler, 
                        // but for now we'll trigger simple delete. 
                        // To properly delete the group, we should trigger a search in the parent.
                        // I'll update App.tsx context or just pass a click event that the parent handles.
                        const event = new CustomEvent('delete-group', { detail: entry.dayPresetGroupId });
                        window.dispatchEvent(event);
                    }}
                    className="absolute -top-3 -right-3 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg scale-0 group-hover:scale-110 transition-all z-[200] cursor-pointer"
                    title="Ganze Gruppe löschen"
                >
                    <Trash2 size={12} />
                </button>
            )}
            <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/70 drop-shadow-sm truncate pr-1">
                        {block ? typeLabels[block.type] : 'Unbekannt'}
                    </span>
                    <GripVertical size={10} className="text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
                </div>
                <span className="text-xs font-black text-white truncate drop-shadow-md uppercase pr-2 line-clamp-1">
                    {block?.name || 'Unknown'}
                </span>
            </div>
            <div className="flex items-center justify-between mt-auto">
                <span className="text-[9px] font-black text-white/90 tracking-tighter drop-shadow-sm flex items-center gap-1">
                    <Clock size={10} />
                    {entry.startTime} - {entry.endTime}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate({ ...entry, isPersistent: !entry.isPersistent });
                        }}
                        className={cn(
                            "p-1 px-1.5 rounded-md transition-[transform,background-color,color,opacity] duration-200 scale-90 hover:scale-100 flex items-center border border-white/5 cursor-pointer",
                            entry.isPersistent
                                ? "bg-indigo-500 text-white shadow-lg"
                                : "bg-black/20 hover:bg-black/40 text-white/50 hover:text-white opacity-0 group-hover:opacity-100"
                        )}
                        title={entry.isPersistent ? "Dauerhaft (In jeder Woche sichtbar)" : "Einmalig (Nur diese Woche)"}
                    >
                        <Pin size={10} className={cn(entry.isPersistent ? "fill-white" : "")} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(entry.id);
                        }}
                        className="p-1 px-1.5 rounded-md bg-black/20 hover:bg-black/40 text-white/50 hover:text-white transition-[transform,opacity,background-color] duration-200 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100 flex items-center border border-white/5 cursor-pointer"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>

            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        </div>
    );
};

export const ScheduleGrid = React.memo(ScheduleGridBase);

const DayColumnMemo = React.memo(DayColumn);
const DraggableEntryMemo = React.memo(DraggableEntry);
