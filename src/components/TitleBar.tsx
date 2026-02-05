import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

const TitleBar: React.FC = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        console.log('TitleBar mounted. window.electronTitleBar available:', !!(window as any).electronTitleBar);
    }, []);

    const handleMinimize = () => {
        console.log('TitleBar: Minimize clicked');
        (window as any).electronTitleBar?.minimize();
    };

    const handleMaximize = () => {
        console.log('TitleBar: Maximize clicked');
        (window as any).electronTitleBar?.maximize();
        setIsMaximized(!isMaximized);
    };

    const handleClose = () => {
        console.log('TitleBar: Close clicked');
        (window as any).electronTitleBar?.close();
    };

    return (
        <div className="h-8 bg-slate-950 flex items-center justify-between select-none border-b border-white/5 z-[100] relative">
            <div
                className="absolute inset-0 z-0"
                style={{ WebkitAppRegion: 'drag' } as any}
            />

            <div className="flex items-center gap-2 px-3 z-10 pointer-events-none">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wochenplaner</span>
            </div>

            <div className="flex items-center h-full z-10 relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    title="Minimieren"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                    title={isMaximized ? "Verkleinern" : "Maximieren"}
                >
                    {isMaximized ? <Copy size={12} /> : <Square size={12} />}
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 flex items-center justify-center text-slate-400 hover:bg-red-600/80 hover:text-white transition-colors"
                    title="Schließen"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
