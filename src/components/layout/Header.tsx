import React from 'react';
import { Settings as SettingsIcon, ChevronLeft, ChevronRight, FileDown, Redo2, Undo2, CalendarRange } from 'lucide-react';

interface HeaderProps {
    weekInfo: { weekNumber: number; year: number; start: Date; end: Date };
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onResetDate: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onExport: () => void;
    onOpenSettings: () => void;
}

import { useTranslation } from '../../hooks/useTranslation';

export const Header: React.FC<HeaderProps> = ({
    weekInfo,
    onPrevWeek,
    onNextWeek,
    onResetDate,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onExport,
    onOpenSettings
}) => {
    const { t, lang } = useTranslation();

    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950 z-30 shrink-0">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <CalendarRange className="text-indigo-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight leading-none">
                            {t('week')} {weekInfo.weekNumber}
                        </h1>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {weekInfo.start.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit' })} – {weekInfo.end.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-white/5 shrink-0">
                    <button
                        onClick={onPrevWeek}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={onResetDate}
                        className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                    >
                        {t('today')}
                    </button>
                    <button
                        onClick={onNextWeek}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="w-px h-8 bg-white/5 mx-2" />

                <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-white/5 shrink-0">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title={`${t('undo')} (Ctrl+Z)`}
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                        title={`${t('redo')} (Ctrl+Y)`}
                    >
                        <Redo2 size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onExport}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-[10px] font-black uppercase tracking-widest whitespace-nowrap cursor-pointer"
                    >
                        <FileDown size={14} />
                        <span className="hidden xl:inline text-xs">{t('export')}</span>
                    </button>

                    <button
                        onClick={onOpenSettings}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:rotate-90 border border-white/5 cursor-pointer"
                    >
                        <SettingsIcon size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
};
