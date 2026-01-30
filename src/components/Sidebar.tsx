import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { TimeBlock, TimeBlockType, DayPreset } from '../types';
import { Plus, Trash2, GripVertical, Check, X, Briefcase, GraduationCap, Coffee, School, BookOpen, UserCheck, Palette, PanelLeft, PanelLeftClose, ChevronLeft, ChevronRight, Pencil, CalendarDays, LayoutTemplate } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    width: number;
    onWidthChange: (width: number) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    presets: TimeBlock[];
    onAddPreset: (preset: TimeBlock) => void;
    onDeletePreset: (id: string) => void;
    onUpdatePreset: (preset: TimeBlock) => void;
    dayPresets: DayPreset[];
    onAddDayPreset: (preset: DayPreset) => void;
    onDeleteDayPreset: (id: string) => void;
    onUpdateDayPreset: (preset: DayPreset) => void;
}

const PREMIUM_COLORS = [
    '#6366f1', '#d946ef', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#64748b', '#8b5cf6'
];

const ColorPicker: React.FC<{
    selected: string;
    onChange: (color: string) => void;
    orientation?: 'row' | 'grid';
}> = ({ selected, onChange, orientation = 'row' }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className="space-y-3">
            <div className={`flex flex-wrap gap-1.5 p-2 bg-black/20 rounded-xl border border-white/5 ${orientation === 'grid' ? 'grid grid-cols-5' : ''}`}>
                {PREMIUM_COLORS.map(color => (
                    <button
                        key={color}
                        onClick={(e) => { e.stopPropagation(); onChange(color); }}
                        className={`w-5 h-5 rounded-full transition-all hover:scale-125 active:scale-95 cursor-pointer ${selected === color ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowAdvanced(!showAdvanced); }}
                    className={`flex items-center justify-center w-5 h-5 rounded-full transition-all hover:scale-125 active:scale-95 bg-gradient-to-tr from-indigo-500 via-fuchsia-500 to-amber-500 overflow-hidden ring-1 ring-white/20 cursor-pointer ${showAdvanced ? 'scale-110 ring-white' : ''}`}
                >
                    <Palette size={10} className="text-white" />
                </button>
            </div>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 bg-slate-900 border border-white/10 rounded-2xl custom-color-picker">
                            <HexColorPicker color={selected} onChange={onChange} style={{ width: '100%', height: '120px' }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SidebarBase: React.FC<SidebarProps> = ({ width, onWidthChange, isCollapsed, onToggleCollapse, presets, onAddPreset, onDeletePreset, onUpdatePreset, dayPresets, onAddDayPreset, onDeleteDayPreset, onUpdateDayPreset }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PREMIUM_COLORS[0]);
    const [newType, setNewType] = useState<TimeBlockType>('project-int');
    const [isResizing, setIsResizing] = useState(false);

    const addFormRef = useClickOutside(() => {
        if (isAdding) setIsAdding(false);
    });

    const handleAdd = () => {
        if (newName.trim()) {
            onAddPreset({
                id: Math.random().toString(36).substring(2, 11),
                name: newName,
                color: newColor,
                type: newType,
            });
            setNewName('');
            setIsAdding(false);
        }
    };

    const startResizing = React.useCallback(() => setIsResizing(true), []);
    const stopResizing = React.useCallback(() => setIsResizing(false), []);

    const resize = React.useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = Math.max(240, Math.min(480, e.clientX));
            onWidthChange(newWidth);
        }
    }, [isResizing, onWidthChange]);

    React.useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <aside
            className="bg-slate-950 border-r border-white/5 flex flex-col z-40 relative group/sidebar h-full"
            style={{
                width: isCollapsed ? '0px' : `${width}px`,
                transition: isResizing ? 'none' : 'width 0.4s cubic-bezier(0.4, 0, 0, 1)',
                willChange: 'width',
                contain: 'layout',
                transform: 'translateZ(0)'
            }}
        >
            {/* Collapse Toggle - Centered and High Visibility */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                    "absolute top-1/2 -right-3.5 -translate-y-1/2 z-[100] w-7 h-12 bg-indigo-600 hover:bg-indigo-500 border border-white/10 rounded-r-xl flex items-center justify-center text-white shadow-[8px_0_15px_-3px_rgba(79,70,229,0.3)] hover:w-8 active:scale-95 cursor-pointer",
                    "transition-all duration-[400ms] cubic-bezier(0.4, 0, 0, 1)",
                    isCollapsed ? "translate-x-3.5" : "translate-x-0"
                )}
                title={isCollapsed ? "Sidebar öffnen" : "Sidebar schließen"}
            >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    onMouseDown={startResizing}
                    className="absolute inset-y-0 -right-1 w-2 cursor-col-resize hover:bg-indigo-500/20 active:bg-indigo-500/40 transition-colors z-50"
                />
            )}

            <div
                className={cn(
                    "flex flex-col h-full overflow-hidden transition-opacity duration-300",
                    isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                )}
                style={{
                    width: `${width}px`,
                    contentVisibility: isCollapsed ? 'hidden' : 'visible'
                }}
            >
                <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                <div className="p-6 pb-2 flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Kategorien</h2>
                        <span className="text-lg font-black text-white tracking-tight">Vorlagen</span>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all active:scale-95 text-slate-400 hover:text-white cursor-pointer"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                <div
                    className="px-6 flex-1 overflow-y-auto space-y-3 pb-8 cursor-default"
                    onClick={(e) => {
                        // Only trigger quick-add if no presets exist and clicking empty space
                        if (presets.length === 0 && e.target === e.currentTarget && !isAdding) {
                            setIsAdding(true);
                        }
                    }}
                >
                    <AnimatePresence>
                        {isAdding && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div ref={addFormRef} className="p-4 bg-white/5 border border-indigo-500/30 rounded-2xl space-y-4 mb-4 mt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Name</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                            placeholder="z.B. Meeting"
                                            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Kategorie</label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { id: 'project-int', name: 'Projekt (Int)', icon: <Briefcase size={12} /> },
                                                { id: 'project-ext', name: 'Projekt (Ext)', icon: <UserCheck size={12} /> },
                                                { id: 'school-reg', name: 'Schule (Reg)', icon: <School size={12} /> },
                                                { id: 'school-uk', name: 'ÜK', icon: <BookOpen size={12} /> },
                                                { id: 'weiterbildung', name: 'W.bildung', icon: <GraduationCap size={12} /> },
                                                { id: 'break', name: 'Pause', icon: <Coffee size={12} /> }
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setNewType(t.id as TimeBlockType)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${newType === t.id
                                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {t.icon}
                                                    <span>{t.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Farbe</label>
                                        <ColorPicker
                                            selected={newColor}
                                            onChange={setNewColor}
                                            orientation="grid"
                                        />
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => setIsAdding(false)}
                                                className="flex-1 py-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-300 border border-white/5 cursor-pointer transition-[background-color,color,transform] active:scale-95 duration-200 text-xs font-bold uppercase tracking-wider"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                onClick={handleAdd}
                                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-600/20 cursor-pointer transition-[background-color,transform] active:scale-95 duration-200 text-xs font-bold uppercase tracking-wider"
                                            >
                                                Erstellen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence initial={false}>
                        {presets.map((preset) => (
                            <DraggablePresetMemo
                                key={preset.id}
                                preset={preset}
                                onDelete={onDeletePreset}
                                onUpdate={onUpdatePreset}
                            />
                        ))}
                        {presets.length === 0 && !isAdding && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4 cursor-pointer hover:bg-white/5 transition-colors rounded-3xl"
                                onClick={() => setIsAdding(true)}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-600 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors">
                                    <Plus size={24} />
                                </div>
                                <p className="text-xs font-medium text-slate-600 max-w-[160px] leading-relaxed">Keine Vorlagen vorhanden. Klicke hier oder auf das + oben.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Day Presets Section */}
                    {dayPresets && dayPresets.length > 0 && (
                        <>
                            <div className="h-px bg-white/10 my-4 mx-2" />
                            <div className="px-1 flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-indigo-500/10">
                                    <LayoutTemplate size={18} className="text-indigo-400" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Ganzer Tag</h2>
                                    <span className="text-lg font-black text-white tracking-tight leading-tight">Tagesvorlagen</span>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <AnimatePresence initial={false}>
                                    {dayPresets.map((preset) => (
                                        <DraggableDayPresetMemo
                                            key={preset.id}
                                            preset={preset}
                                            onDelete={onDeleteDayPreset}
                                            onUpdate={onUpdateDayPreset}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

export const Sidebar = React.memo(SidebarBase);

const DraggablePreset: React.FC<{
    preset: TimeBlock;
    onDelete: (id: string) => void;
    onUpdate: (preset: TimeBlock) => void;
}> = ({ preset, onDelete, onUpdate }) => {
    const [showColors, setShowColors] = useState(false);
    const pickerRef = useClickOutside(() => {
        if (showColors) setShowColors(false);
    });

    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'PRESET',
        item: { id: preset.id },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [preset.id]);

    // Hide native drag preview - we use CustomDragLayer instead
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    const typeLabels: Record<TimeBlockType, string> = {
        'project-int': 'Projekt (Int)',
        'project-ext': 'Projekt (Ext)',
        'school-reg': 'Schule',
        'school-uk': 'ÜK',
        'weiterbildung': 'Weiterbildung',
        'break': 'Pause'
    };

    const typeLabel = typeLabels[preset.type];

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(preset.name);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editName.trim()) {
            onUpdate({ ...preset, name: editName.trim() });
        } else {
            setEditName(preset.name); // Revert if empty
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditName(preset.name);
            setIsEditing(false);
        }
    };

    return (
        <div className="relative group">
            <motion.div
                ref={(node) => { drag(node); }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex items-center justify-between p-4 rounded-2xl border border-white/10 cursor-grab active:cursor-grabbing shadow-lg transition-[transform,opacity,background-color] duration-200 ${isDragging ? 'opacity-30 scale-90' : 'opacity-100'
                    }`}
                style={{
                    backgroundColor: preset.color,
                    transform: 'translate3d(0,0,0)'
                }}
            >
                <div className="flex flex-col min-w-0 flex-1 mr-2">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/20 text-sm font-black text-white rounded px-1 -ml-1 border-none focus:ring-2 focus:ring-white/50 outline-none w-full"
                        />
                    ) : (
                        <span className="text-sm font-black text-white drop-shadow-md truncate pr-2 uppercase tracking-wide">{preset.name}</span>
                    )}
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{typeLabel}</span>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none group-hover:pointer-events-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                            setShowColors(false);
                        }}
                        className="p-1.5 hover:bg-black/20 rounded-lg transition-all text-white/80 hover:text-white cursor-pointer"
                        title="Bearbeiten"
                    >
                        <Pencil size={14} />
                    </button>
                    <div className="relative">
                        <button
                            className={`w-6 h-6 rounded-full border border-white/20 shadow-inner transition-transform cursor-pointer ${showColors ? 'scale-125 rotate-45' : ''}`}
                            style={{ backgroundColor: preset.color }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowColors(!showColors);
                            }}
                        />
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(preset.id);
                        }}
                        className="p-1.5 hover:bg-black/20 rounded-lg transition-all text-white/80 hover:text-white cursor-pointer"
                        title="Löschen"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {showColors && (
                    <motion.div
                        ref={pickerRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ColorPicker
                            selected={preset.color}
                            onChange={(color) => {
                                onUpdate({ ...preset, color });
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DraggableDayPreset: React.FC<{
    preset: DayPreset;
    onDelete: (id: string) => void;
    onUpdate: (preset: DayPreset) => void;
}> = ({ preset, onDelete, onUpdate }) => {
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: 'DAY_PRESET',
        item: { id: preset.id },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [preset.id]);

    // Hide native drag preview - we use CustomDragLayer instead
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(preset.name);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editName.trim()) {
            onUpdate({ ...preset, name: editName.trim() });
        } else {
            setEditName(preset.name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditName(preset.name);
            setIsEditing(false);
        }
    };

    const [showColors, setShowColors] = useState(false);
    const pickerRef = useClickOutside(() => {
        if (showColors) setShowColors(false);
    });

    return (
        <div className="relative group">
            <motion.div
                ref={(node) => { drag(node); }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-900/50 cursor-grab active:cursor-grabbing hover:bg-slate-800/50 transition-[transform,opacity,background-color,border-color] duration-200 ${isDragging ? 'opacity-30 scale-90' : 'opacity-100'
                    }`}
                style={{
                    borderColor: preset.color || '#6366f1',
                    transform: 'translate3d(0,0,0)'
                }}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${preset.color || '#6366f1'}20` }}
                    >
                        <LayoutTemplate size={16} style={{ color: preset.color || '#6366f1' }} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/20 text-sm font-bold text-white rounded px-1 -ml-1 border-none focus:ring-2 focus:ring-indigo-500/50 outline-none w-full"
                            />
                        ) : (
                            <span className="text-sm font-bold text-white truncate">{preset.name}</span>
                        )}
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{preset.entries.length} Einträge</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                        <Pencil size={14} />
                    </button>
                    <div className="relative">
                        <button
                            className="w-6 h-6 rounded-full border border-white/20 shadow-inner transition-transform cursor-pointer"
                            style={{ backgroundColor: preset.color || '#6366f1' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowColors(!showColors);
                            }}
                        />
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(preset.id);
                        }}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </motion.div>

            <AnimatePresence>
                {showColors && (
                    <motion.div
                        ref={pickerRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mt-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ColorPicker
                            selected={preset.color || '#6366f1'}
                            onChange={(color) => {
                                onUpdate({ ...preset, color });
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DraggablePresetMemo = React.memo(DraggablePreset);
const DraggableDayPresetMemo = React.memo(DraggableDayPreset);
