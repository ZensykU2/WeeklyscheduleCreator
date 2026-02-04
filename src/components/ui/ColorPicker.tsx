import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

export const PREMIUM_COLORS = [
    '#6366f1', '#d946ef', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#64748b', '#8b5cf6'
];

interface ColorPickerProps {
    selected: string;
    onChange: (color: string) => void;
    orientation?: 'row' | 'grid';
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ selected, onChange, orientation = 'row' }) => {
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

            {showAdvanced && (
                <div onClick={(e) => e.stopPropagation()} className="p-3 bg-black/40 rounded-xl border border-white/10 animate-in fade-in zoom-in-95">
                    <HexColorPicker color={selected} onChange={onChange} style={{ width: '100%', height: '120px' }} />
                </div>
            )}
        </div>
    );
};
