import React, { useState } from 'react';
import { TimeBlock, TimeBlockType } from '../../types';
import { Briefcase, UserCheck, School, BookOpen, GraduationCap, Coffee } from 'lucide-react';
import { ColorPicker, PREMIUM_COLORS } from '../ui/ColorPicker';
import { useClickOutside } from '../../hooks/useClickOutside';
import { motion } from 'framer-motion';

interface AddPresetFormProps {
    onAdd: (preset: Omit<TimeBlock, 'id'>) => void;
    onCancel: () => void;
}

export const AddPresetForm: React.FC<AddPresetFormProps> = ({ onAdd, onCancel }) => {
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PREMIUM_COLORS[0]);
    const [newType, setNewType] = useState<TimeBlockType>('project-int');

    const formRef = useClickOutside(onCancel);

    const handleSubmit = () => {
        if (newName.trim()) {
            onAdd({
                name: newName.trim(),
                color: newColor,
                type: newType,
            });
        }
    };

    const typeOptions: { id: TimeBlockType; name: string; icon: React.ReactNode }[] = [
        { id: 'project-int', name: 'Projekt (Int)', icon: <Briefcase size={12} /> },
        { id: 'project-ext', name: 'Projekt (Ext)', icon: <UserCheck size={12} /> },
        { id: 'school-reg', name: 'Schule (Reg)', icon: <School size={12} /> },
        { id: 'school-uk', name: 'ÜK', icon: <BookOpen size={12} /> },
        { id: 'weiterbildung', name: 'W.bildung', icon: <GraduationCap size={12} /> },
        { id: 'break', name: 'Pause', icon: <Coffee size={12} /> }
    ];

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
        >
            <div ref={formRef} className="p-4 bg-white/5 border border-indigo-500/30 rounded-2xl space-y-4 mb-4 mt-2">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Name</label>
                    <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="z.B. Meeting"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Kategorie</label>
                    <div className="grid grid-cols-2 gap-1.5">
                        {typeOptions.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setNewType(t.id)}
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
                            onClick={onCancel}
                            className="flex-1 py-2.5 hover:bg-white/5 rounded-xl text-slate-500 hover:text-slate-300 border border-white/5 cursor-pointer transition-[background-color,color,transform] active:scale-95 duration-200 text-xs font-bold uppercase tracking-wider"
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-600/20 cursor-pointer transition-[background-color,transform] active:scale-95 duration-200 text-xs font-bold uppercase tracking-wider"
                        >
                            Erstellen
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
