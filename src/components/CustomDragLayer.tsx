import React from 'react';
import { useDragLayer } from 'react-dnd';
import { TimeBlock, DayPreset } from '../types';
import { LayoutTemplate } from 'lucide-react';

interface CustomDragLayerProps {
    presets: TimeBlock[];
    dayPresets: DayPreset[];
}

const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
};

function getItemStyles(currentOffset: { x: number; y: number } | null) {
    if (!currentOffset) {
        return { display: 'none' };
    }
    const { x, y } = currentOffset;
    // Center the preview on the cursor
    return {
        transform: `translate(${x - 140}px, ${y - 30}px)`,
        WebkitTransform: `translate(${x - 140}px, ${y - 30}px)`,
    };
}

export const CustomDragLayer: React.FC<CustomDragLayerProps> = ({ presets, dayPresets }) => {
    const { itemType, isDragging, item, currentOffset } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        currentOffset: monitor.getClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    if (!isDragging || !currentOffset) {
        return null;
    }

    function renderItem() {
        if (itemType === 'PRESET') {
            const preset = presets.find(p => p.id === item?.id);
            if (!preset) return null;

            return (
                <div
                    className="flex items-center justify-between p-4 rounded-2xl border border-white/10 shadow-lg"
                    style={{
                        backgroundColor: preset.color,
                        width: '280px',
                        opacity: 0.85,
                    }}
                >
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-black text-white drop-shadow-md truncate pr-2 uppercase tracking-wide">
                            {preset.name}
                        </span>
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                            {preset.type}
                        </span>
                    </div>
                </div>
            );
        }

        if (itemType === 'DAY_PRESET') {
            const preset = dayPresets.find(p => p.id === item?.id);
            if (!preset) return null;

            return (
                <div
                    className="flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-900 shadow-lg"
                    style={{
                        borderColor: preset.color || '#6366f1',
                        width: '280px',
                        opacity: 0.85,
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
                            <span className="text-sm font-bold text-white truncate">{preset.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {preset.entries.length} Einträge
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    }

    return (
        <div style={layerStyles}>
            <div style={getItemStyles(currentOffset)}>
                {renderItem()}
            </div>
        </div>
    );
};
