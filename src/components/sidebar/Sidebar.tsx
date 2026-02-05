import React, { useState } from 'react';
import { TimeBlock, DayPreset } from '../../types';
import { Plus, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DraggablePreset } from './DraggablePreset';
import { DraggableDayPreset } from './DraggableDayPreset';
import { AddPresetForm } from './AddPresetForm';
import { useTranslation } from '../../hooks/useTranslation';

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
    onAnimationChange?: (animating: boolean) => void;
}

const SidebarBase: React.FC<SidebarProps> = ({ width, onWidthChange, isCollapsed, onToggleCollapse, onAnimationChange, presets, onAddPreset, onDeletePreset, onUpdatePreset, dayPresets, onAddDayPreset, onDeleteDayPreset, onUpdateDayPreset }) => {
    const [isAdding, setIsAdding] = useState(false);
    const { t } = useTranslation();
    const [isResizing, setIsResizing] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const handleAdd = (presetData: Omit<TimeBlock, 'id'>) => {
        onAddPreset({
            id: Math.random().toString(36).substring(2, 11),
            ...presetData
        });
        setIsAdding(false);
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

    const handleTransitionStart = React.useCallback(() => {
        setIsTransitioning(true);
        onAnimationChange?.(true);
    }, [onAnimationChange]);

    const handleTransitionEnd = React.useCallback(() => {
        setIsTransitioning(false);
        onAnimationChange?.(false);
    }, [onAnimationChange]);

    return (
        <div
            className="relative z-40 h-full shrink-0 overflow-visible"
            style={{
                width: isCollapsed ? '0px' : `${width}px`,
                transition: isResizing ? 'none' : 'width 0.4s cubic-bezier(0.4, 0, 0, 1)',
                willChange: isTransitioning ? 'width' : 'auto',
            }}
            onTransitionStart={handleTransitionStart}
            onTransitionEnd={handleTransitionEnd}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 z-[100] w-7 h-12 bg-indigo-600 hover:bg-indigo-500 border border-white/10 rounded-r-xl flex items-center justify-center text-white shadow-[8px_0_15px_-3px_rgba(79,70,229,0.3)] hover:w-8 active:scale-95 cursor-pointer",
                    "transition-[width,background-color,transform] duration-200"
                )}
                style={{
                    right: '-28px'
                }}
                title={isCollapsed ? "Sidebar öffnen" : "Sidebar schließen"}
            >
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <aside
                className="bg-slate-950 border-r border-white/5 flex flex-col relative group/sidebar h-full overflow-hidden"
                style={{
                    width: `${width}px`,
                    transform: isCollapsed ? `translateX(-${width}px)` : 'translateX(0)',
                    transition: isResizing ? 'none' : 'transform 0.4s cubic-bezier(0.4, 0, 0, 1)',
                    willChange: isTransitioning ? 'transform' : 'auto',
                    contain: isCollapsed ? 'strict' : 'layout style paint',
                    backfaceVisibility: 'hidden',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                }}
            >
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
                            <h2 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">{t('configuration')}</h2>
                            <span className="text-lg font-black text-white tracking-tight">{t('addPreset')}</span>
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
                        style={{ scrollbarGutter: 'stable' }}
                        onClick={(e) => {
                            if (presets.length === 0 && e.target === e.currentTarget && !isAdding) {
                                setIsAdding(true);
                            }
                        }}
                    >
                        <AnimatePresence>
                            {isAdding && (
                                <AddPresetForm
                                    onAdd={handleAdd}
                                    onCancel={() => setIsAdding(false)}
                                />
                            )}
                        </AnimatePresence>

                        <AnimatePresence initial={false}>
                            {presets.map((preset) => (
                                <DraggablePreset
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
                                    <p className="text-xs font-medium text-slate-600 max-w-[160px] leading-relaxed">{t('noPresets')}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {dayPresets && dayPresets.length > 0 && (
                            <>
                                <div className="h-px bg-white/10 my-4 mx-2" />
                                <div className="px-1 flex items-center gap-3 mb-4">
                                    <div className="flex flex-col">
                                        <h2 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">{t('templates')}</h2>
                                        <span className="text-lg font-black text-white tracking-tight leading-tight">{t('templates')}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {dayPresets.map((preset) => (
                                            <DraggableDayPreset
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
        </div>
    );
};

export const Sidebar = React.memo(SidebarBase);
