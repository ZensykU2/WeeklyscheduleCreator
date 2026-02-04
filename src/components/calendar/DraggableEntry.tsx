import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { ScheduleEntry, TimeBlock, DayPreset } from '../../types';
import { Trash2, GripVertical, Clock, Pin } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface DraggableEntryProps {
    entry: ScheduleEntry;
    block?: TimeBlock;
    onDelete: (id: string) => void;
    onDeleteGroup?: (groupId: string) => void; // New prop
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

const DraggableEntryBase: React.FC<DraggableEntryProps> = ({ entry, block, onDelete, onDeleteGroup, onUpdate, top, height, isSelected, onSelect, zIndex, isFirstInGroup, isLastInGroup, dayPresets }) => {
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

    const [showColors, setShowColors] = useState(false);

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
                        // Call prop if available
                        if (onDeleteGroup) {
                            onDeleteGroup(entry.dayPresetGroupId!);
                        } else {
                            // Fallback
                            onDelete(entry.id);
                        }
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

export const DraggableEntry = React.memo(DraggableEntryBase);
