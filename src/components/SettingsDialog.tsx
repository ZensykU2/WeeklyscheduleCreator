import React, { useEffect } from 'react';
import { Settings, Day } from '../types';
import { X } from 'lucide-react';
import { useClickOutside } from '../hooks/useClickOutside';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsDialogProps {
    settings: Settings;
    onSave: (settings: Settings) => void;
    onClose: () => void;
}

const DAYS: Day[] = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ settings, onSave, onClose }) => {
    const [tempSettings, setTempSettings] = React.useState<Settings>(settings);
    const modalRef = useClickOutside(onClose);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const toggleDay = (day: Day) => {
        setTempSettings(prev => ({
            ...prev,
            workDays: prev.workDays.includes(day)
                ? prev.workDays.filter(d => d !== day)
                : [...prev.workDays, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
        }));
    };

    return (
        <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-[520px] bg-slate-900/90 border border-white/10 rounded-[2.5rem] shadow-2xl p-10 backdrop-blur-3xl"
        >
            <div className="flex items-center justify-between mb-10">
                <div className="flex flex-col">
                    <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Konfiguration</h2>
                    <span className="text-3xl font-black text-white tracking-tight">Einstellungen</span>
                </div>
                <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all active:scale-95 text-slate-400 hover:text-white cursor-pointer">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-10">
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Arbeitstage</label>
                    <div className="flex justify-between gap-2 p-2 bg-white/5 rounded-[1.5rem] border border-white/5">
                        {DAYS.map(day => (
                            <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                className={`flex-1 aspect-square rounded-[1rem] font-black text-xs transition-all active:scale-90 cursor-pointer ${tempSettings.workDays.includes(day)
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 ring-1 ring-white/20'
                                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Tag beginnt</label>
                        <HourPicker
                            value={tempSettings.dayStart}
                            onChange={val => setTempSettings({ ...tempSettings, dayStart: val })}
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Tag endet</label>
                        <HourPicker
                            value={tempSettings.dayEnd}
                            onChange={val => setTempSettings({ ...tempSettings, dayEnd: val })}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-12 flex gap-4">
                <button
                    onClick={() => onSave(tempSettings)}
                    className="flex-3 bg-indigo-600 hover:bg-indigo-500 py-5 px-8 rounded-2xl font-black text-sm text-white transition-all shadow-2xl shadow-indigo-600/30 active:scale-[0.98] border border-indigo-400/50 flex-[2] cursor-pointer"
                >
                    Änderungen speichern
                </button>
                <button
                    onClick={onClose}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 py-5 px-6 rounded-2xl font-bold text-sm text-slate-400 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                >
                    Abbrechen
                </button>
            </div>
        </motion.div>
    );
};

interface HourPickerProps {
    value: string;
    onChange: (val: string) => void;
}

const HourPicker: React.FC<HourPickerProps> = ({ value, onChange }) => {
    const hours = Array.from({ length: 24 }).map((_, i) => `${String(i).padStart(2, '0')}:00`);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const selectedRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (selectedRef.current && containerRef.current) {
            selectedRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    }, []);

    return (
        <div
            ref={containerRef}
            className="flex flex-col gap-2 p-2 bg-black/20 rounded-[1.5rem] border border-white/5 h-[160px] overflow-y-auto scrollbar-hide"
        >
            {hours.map((h) => (
                <motion.button
                    key={h}
                    ref={value === h ? selectedRef : null}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChange(h)}
                    className={`flex items-center justify-center py-3 rounded-xl font-black text-sm transition-all cursor-pointer ${value === h
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                        }`}
                >
                    {h}
                </motion.button>
            ))}
        </div>
    );
};
