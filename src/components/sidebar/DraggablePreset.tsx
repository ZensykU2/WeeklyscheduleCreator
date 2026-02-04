import React, { useState, useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { TimeBlock, TimeBlockType } from '../../types';
import { Trash2, Pencil } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { ColorPicker } from '../ui/ColorPicker';
import { motion, AnimatePresence } from 'framer-motion';

interface DraggablePresetProps {
    preset: TimeBlock;
    onDelete: (id: string) => void;
    onUpdate: (preset: TimeBlock) => void;
}

const DraggablePresetBase: React.FC<DraggablePresetProps> = ({ preset, onDelete, onUpdate }) => {
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

export const DraggablePreset = React.memo(DraggablePresetBase);
