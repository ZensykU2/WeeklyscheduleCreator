import React, { useState, useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { DayPreset } from '../../types';
import { Trash2, Pencil, LayoutTemplate } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { ColorPicker } from '../ui/ColorPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

interface DraggableDayPresetProps {
    preset: DayPreset;
    onDelete: (id: string) => void;
    onUpdate: (preset: DayPreset) => void;
}

const DraggableDayPresetBase: React.FC<DraggableDayPresetProps> = ({ preset, onDelete, onUpdate }) => {
    const { t } = useTranslation();
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
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
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
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="relative group"
        >
            <div
                ref={(node) => { drag(node); }}
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
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{preset.entries.length} {t('entriesCount')}</span>
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
            </div>

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
        </motion.div>
    );
};

export const DraggableDayPreset = React.memo(DraggableDayPresetBase);
