import { TimeBlock, ScheduleEntry, Day, WeekPlan, Settings, DayPreset } from './types';
import { storage } from './store/storage';
import { getCurrentWeekRange, timeToMinutes, minutesToTime } from './utils/dateUtils';
import { exportToExcel } from './utils/exportUtils';
import { ScheduleGrid } from './components/ScheduleGrid';
import { Sidebar } from './components/Sidebar';
import { CustomDragLayer } from './components/CustomDragLayer';
import { SettingsDialog } from './components/SettingsDialog';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Settings as SettingsIcon, ChevronLeft, ChevronRight, FileDown, Redo2, Undo2, CalendarRange, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHistory } from './hooks/useHistory';
import TitleBar from './components/TitleBar';

interface AppState {
    weekPlan: WeekPlan;
    presets: TimeBlock[];
    dayPresets: DayPreset[];
}

function App() {
    const [settings, setSettings] = useState<Settings>({
        workDays: ['MO', 'DI', 'MI', 'DO', 'FR'],
        dayStart: '08:00',
        dayEnd: '17:00',
        exportFormat: 'excel',
        pinnedDays: []
    });

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isSidebarAnimating, setIsSidebarAnimating] = useState(false);
    const [deletedSlots, setDeletedSlots] = useState<{ day: string; startTime: string; deletedInWeek: { year: number; week: number } }[]>([]);

    const isLoaded = useRef(false);

    const weekInfo = useMemo(() => getCurrentWeekRange(currentDate), [currentDate]);

    const initialPlan: WeekPlan = useMemo(() => {
        return {
            weekNumber: weekInfo.weekNumber,
            year: weekInfo.year,
            startDate: weekInfo.start.toISOString(),
            entries: []
        };
    }, [weekInfo]);

    const { state: appState, setState: setAppState, undo, redo, canUndo, canRedo } = useHistory<AppState>({
        weekPlan: initialPlan,
        presets: [],
        dayPresets: []
    });

    const weekPlan = appState.weekPlan;
    const presets = appState.presets;
    const dayPresets = appState.dayPresets;

    const setWeekPlan = useCallback((next: WeekPlan | ((curr: WeekPlan) => WeekPlan), save = true) => {
        setAppState(prev => ({
            ...prev,
            weekPlan: typeof next === 'function' ? (next as any)(prev.weekPlan) : next
        }), save);
    }, [setAppState]);

    const setPresets = useCallback((next: TimeBlock[] | ((curr: TimeBlock[]) => TimeBlock[]), save = true) => {
        setAppState(prev => ({
            ...prev,
            presets: typeof next === 'function' ? (next as any)(prev.presets) : next
        }), save);
    }, [setAppState]);

    const setDayPresets = useCallback((next: DayPreset[] | ((curr: DayPreset[]) => DayPreset[]), save = true) => {
        setAppState(prev => ({
            ...prev,
            dayPresets: typeof next === 'function' ? (next as any)(prev.dayPresets) : next
        }), save);
    }, [setAppState]);

    useEffect(() => {
        const loadInitialData = async () => {
            const [savedSettings, savedPresets, savedDayPresets] = await Promise.all([
                storage.getSettings(),
                storage.getPresets(),
                storage.getDayPresets()
            ]);
            setSettings({
                ...savedSettings,
                pinnedDays: savedSettings.pinnedDays || []
            });

            setAppState({
                weekPlan: initialPlan,
                presets: (savedPresets && savedPresets.length > 0)
                    ? savedPresets
                    : [{ id: 'break-1', name: 'Pause', color: '#64748b', type: 'break' }],
                dayPresets: savedDayPresets || []
            }, false);

            isLoaded.current = true;
        };
        loadInitialData();
    }, [initialPlan, setAppState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSettingsOpen) return; // Don't handle shortcuts if modal is open

            // Use keyCode for keyboard layout independence: Z=90, Y=89, D=68
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 90) {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 89) {
                e.preventDefault();
                redo();
            }
            // Duplicate Logic
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 68) {
                if (selectedEntryIds.size > 0) {
                    e.preventDefault();
                    // Duplicate all selected entries
                    const newEntries: ScheduleEntry[] = [];
                    const newSelectedIds = new Set<string>();

                    selectedEntryIds.forEach(id => {
                        const entry = weekPlan.entries.find(env => env.id === id);
                        if (entry) {
                            const newEntry = {
                                ...entry,
                                id: Math.random().toString(36).substring(2, 11),
                            };
                            newEntries.push(newEntry);
                            newSelectedIds.add(newEntry.id);
                        }
                    });

                    if (newEntries.length > 0) {
                        setWeekPlan(prev => ({
                            ...prev,
                            entries: [...prev.entries, ...newEntries]
                        }));
                        setSelectedEntryIds(newSelectedIds);
                    }
                }
            }
            // Delete Logic
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedEntryIds.size > 0) {
                    e.preventDefault();
                    setWeekPlan(prev => ({
                        ...prev,
                        entries: prev.entries.filter(e => !selectedEntryIds.has(e.id))
                    }));
                    setSelectedEntryIds(new Set());
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, selectedEntryIds, weekPlan.entries, setWeekPlan, isSettingsOpen]);


    useEffect(() => {
        const loadPlan = async () => {
            const [plan, persistentEntries, deletedPersistentSlots] = await Promise.all([
                storage.getWeekPlan(weekInfo.year, weekInfo.weekNumber),
                storage.getPersistentEntries(),
                storage.getDeletedPersistentSlots()
            ]);

            // Helper: Check if a slot was explicitly deleted for this week or later
            const isSlotDeleted = (day: string, startTime: string) => {
                return deletedPersistentSlots.some(ds =>
                    ds.day === day &&
                    ds.startTime === startTime &&
                    (weekInfo.year > ds.deletedInWeek.year ||
                        (weekInfo.year === ds.deletedInWeek.year && weekInfo.weekNumber >= ds.deletedInWeek.week))
                );
            };

            if (!plan) {
                // Filter persistent entries: Only those valid for this week or earlier
                const validPersistent = persistentEntries.filter(pe => {
                    // 1. Check if slot was explicitly deleted
                    if (isSlotDeleted(pe.day, pe.startTime)) return false;
                    // 2. Forward-only check
                    if (!pe.validFrom) return true; // Legacy support
                    if (weekInfo.year > pe.validFrom.year) return true;
                    if (weekInfo.year === pe.validFrom.year && weekInfo.weekNumber >= pe.validFrom.week) return true;
                    return false;
                });

                setWeekPlan({
                    weekNumber: weekInfo.weekNumber,
                    year: weekInfo.year,
                    startDate: weekInfo.start.toISOString(),
                    entries: validPersistent
                }, false);
            } else {
                // Merge persistent entries that aren't already in the plan
                const filteredPersistent = persistentEntries.filter(pe => {
                    // 1. Check if slot was explicitly deleted
                    if (isSlotDeleted(pe.day, pe.startTime)) return false;
                    // 2. Forward-only check
                    if (pe.validFrom) {
                        if (weekInfo.year < pe.validFrom.year) return false;
                        if (weekInfo.year === pe.validFrom.year && weekInfo.weekNumber < pe.validFrom.week) return false;
                    }
                    // 3. Overlap check
                    return !plan.entries.some(e => e.day === pe.day && e.startTime === pe.startTime);
                });

                setWeekPlan({
                    ...plan,
                    entries: [...plan.entries, ...filteredPersistent]
                }, false);
            }
        };
        loadPlan();
    }, [weekInfo, setWeekPlan]);

    useEffect(() => {
        if (isLoaded.current) {
            storage.setWeekPlan(weekPlan);

            // Sync persistent entries to dedicated store
            const persistent = weekPlan.entries.filter(e => e.isPersistent);
            storage.setPersistentEntries(persistent);
        }
    }, [weekPlan]);

    useEffect(() => {
        if (isLoaded.current) storage.setPresets(presets);
    }, [presets]);

    useEffect(() => {
        if (isLoaded.current) storage.setDayPresets(dayPresets);
    }, [dayPresets]);

    useEffect(() => {
        storage.setSettings(settings);
    }, [settings]);

    const handleAddEntry = useCallback((newEntry: ScheduleEntry) => {
        setWeekPlan(prev => {
            const newStart = timeToMinutes(newEntry.startTime);
            const newEnd = timeToMinutes(newEntry.endTime);

            // AUTO-PIN LOGIC: If day is pinned, force persistence
            if (settings.pinnedDays?.includes(newEntry.day)) {
                newEntry.isPersistent = true;
            }

            const filteredEntries = prev.entries.filter(e => {
                if (e.day !== newEntry.day) return true;
                const eStart = timeToMinutes(e.startTime);
                const eEnd = timeToMinutes(e.endTime);
                const overlaps = (newStart < eEnd && newEnd > eStart);
                return !overlaps;
            });

            return {
                ...prev,
                entries: [...filteredEntries, newEntry]
            };
        });
    }, [setWeekPlan, settings.pinnedDays]);

    const handleDeleteEntry = useCallback((entryId: string) => {
        const entryToDelete = weekPlan.entries.find(e => e.id === entryId);

        // If deleting a persistent entry, track it so it doesn't get re-added
        if (entryToDelete?.isPersistent) {
            const newDeletedSlot = {
                day: entryToDelete.day,
                startTime: entryToDelete.startTime,
                deletedInWeek: { year: weekInfo.year, week: weekInfo.weekNumber }
            };
            setDeletedSlots(prev => {
                const updated = [...prev.filter(ds => !(ds.day === newDeletedSlot.day && ds.startTime === newDeletedSlot.startTime)), newDeletedSlot];
                storage.setDeletedPersistentSlots(updated);
                return updated;
            });
        }

        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.filter(e => e.id !== entryId)
        }));
        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            next.delete(entryId);
            return next;
        });
    }, [setWeekPlan, weekPlan.entries, weekInfo]);

    const handleDeleteMultipleEntries = useCallback((entryIds: Set<string>) => {
        const entriesToDelete = weekPlan.entries.filter(e => entryIds.has(e.id));

        // Track persistent deletions
        const persistentDeletions = entriesToDelete
            .filter(e => e.isPersistent)
            .map(e => ({
                day: e.day,
                startTime: e.startTime,
                deletedInWeek: { year: weekInfo.year, week: weekInfo.weekNumber }
            }));

        if (persistentDeletions.length > 0) {
            setDeletedSlots(prev => {
                let updated = [...prev];
                persistentDeletions.forEach(nd => {
                    updated = updated.filter(ds => !(ds.day === nd.day && ds.startTime === nd.startTime));
                });
                const final = [...updated, ...persistentDeletions];
                storage.setDeletedPersistentSlots(final);
                return final;
            });
        }

        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.filter(e => !entryIds.has(e.id))
        }));
        setSelectedEntryIds(new Set());
    }, [setWeekPlan, weekPlan.entries, weekInfo]);

    useEffect(() => {
        const handleDeleteGroupEvent = (e: any) => {
            const groupId = e.detail;
            const entryIds = new Set(weekPlan.entries.filter(ent => ent.dayPresetGroupId === groupId).map(ent => ent.id));
            if (entryIds.size > 0) {
                handleDeleteMultipleEntries(entryIds);
            }
        };

        window.addEventListener('delete-group', handleDeleteGroupEvent);
        return () => window.removeEventListener('delete-group', handleDeleteGroupEvent);
    }, [weekPlan.entries, handleDeleteMultipleEntries]);

    const handleUpdateEntry = useCallback((updatedEntry: ScheduleEntry) => {
        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        }));
    }, [setWeekPlan]);

    const handleTogglePinDay = useCallback((day: Day) => {
        const isPinned = settings.pinnedDays?.includes(day);
        const newPinnedDays = isPinned
            ? settings.pinnedDays.filter(d => d !== day)
            : [...(settings.pinnedDays || []), day];

        setSettings(prev => ({ ...prev, pinnedDays: newPinnedDays }));

        // Update persistence for all entries in this day
        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.map(e => {
                if (e.day === day) {
                    if (!isPinned) {
                        // Turning ON pin -> Set validFrom to current week
                        return {
                            ...e,
                            isPersistent: true,
                            validFrom: { year: weekInfo.year, week: weekInfo.weekNumber }
                        };
                    } else {
                        // Turning OFF pin
                        // Clean up persistence flags
                        const { isPersistent, validFrom, ...rest } = e;
                        return { ...rest, isPersistent: false } as ScheduleEntry;
                    }
                }
                return e;
            })
        }));
    }, [settings.pinnedDays, setWeekPlan, weekInfo]);

    const handleSaveDayAsPreset = useCallback((day: Day) => {
        const dayEntries = weekPlan.entries.filter(e => e.day === day);
        if (dayEntries.length === 0) return; // Don't save empty days

        const newPreset: DayPreset = {
            id: Math.random().toString(36).substring(2, 11),
            name: `${day} Vorlage`,
            color: '#6366f1', // Default indigo
            entries: dayEntries.map(({ id, day, isPersistent, validFrom, dayPresetColor, ...rest }) => rest)
        };
        setDayPresets(prev => [...prev, newPreset]);
    }, [weekPlan.entries, setDayPresets]);

    const changeWeek = (offset: number) => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + offset * 7);
        setCurrentDate(next);
        setSelectedEntryIds(new Set());
    };

    const handleExport = () => {
        exportToExcel(weekPlan, presets, settings);
    };

    const handleSelectEntry = useCallback((id: string | null, multi: boolean) => {
        if (id === null) {
            if (!multi) setSelectedEntryIds(new Set());
            return;
        }

        setSelectedEntryIds(prev => {
            const next = new Set(multi ? prev : []);
            if (next.has(id)) {
                if (multi) next.delete(id);
                // If not multi, we just set it (effectively redundant but safe)
                else next.add(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    return (
        <div className="h-screen w-screen bg-[#020617] text-slate-300 font-sans flex flex-col overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Window Drag Area - Moved to TitleBar component to keep logic clean */}

            <TitleBar />

            <div className="flex flex-1 overflow-hidden relative z-10" style={{ contain: 'layout paint', transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}>
                <DndProvider backend={HTML5Backend}>
                    <CustomDragLayer presets={presets} dayPresets={dayPresets} />
                    <Sidebar
                        presets={presets}
                        onUpdatePreset={(updated) => setPresets(prev => prev.map(p => p.id === updated.id ? updated : p))}
                        onDeletePreset={(id) => setPresets(prev => prev.filter(p => p.id !== id))}
                        onAddPreset={(p) => setPresets(prev => [...prev, p])}
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        onAnimationChange={setIsSidebarAnimating}
                        width={sidebarWidth}
                        onWidthChange={setSidebarWidth}
                        dayPresets={dayPresets}
                        onAddDayPreset={(p) => setDayPresets(prev => [...prev, p])}
                        onDeleteDayPreset={(id) => setDayPresets(prev => prev.filter(p => p.id !== id))}
                        onUpdateDayPreset={(p) => setDayPresets(prev => prev.map(old => old.id === p.id ? p : old))}
                    />

                    <div className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
                        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950 z-30 shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <CalendarRange className="text-indigo-400" size={20} />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-black text-white tracking-tight leading-none">
                                            KW {weekInfo.weekNumber}
                                        </h1>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {weekInfo.start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – {weekInfo.end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-white/5 shrink-0">
                                    <button
                                        onClick={() => changeWeek(-1)}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => setCurrentDate(new Date())}
                                        className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                                    >
                                        Heute
                                    </button>
                                    <button
                                        onClick={() => changeWeek(1)}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90 cursor-pointer"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="w-px h-8 bg-white/5 mx-2" />

                                <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-white/5 shrink-0">
                                    <button
                                        onClick={undo}
                                        disabled={!canUndo}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                        title="Rückgängig (Ctrl+Z)"
                                    >
                                        <Undo2 size={16} />
                                    </button>
                                    <button
                                        onClick={redo}
                                        disabled={!canRedo}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                        title="Wiederholen (Ctrl+Y)"
                                    >
                                        <Redo2 size={16} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-[10px] font-black uppercase tracking-widest whitespace-nowrap cursor-pointer"
                                    >
                                        <FileDown size={14} />
                                        <span className="hidden xl:inline text-xs">Excel Export</span>
                                    </button>

                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:rotate-90 border border-white/5 cursor-pointer"
                                    >
                                        <SettingsIcon size={18} />
                                    </button>
                                </div>
                            </div>
                        </header>

                        <main className="flex-1 p-4 flex flex-col overflow-hidden relative">
                            {/* Subtle background decoration */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" style={{ willChange: 'opacity, transform', transform: 'translate3d(0,0,0)' }} />
                            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" style={{ willChange: 'opacity, transform', transform: 'translate3d(0,0,0)' }} />

                            <div className="z-10 flex flex-col h-full">
                                <ScheduleGrid
                                    days={settings.workDays}
                                    startTime={settings.dayStart}
                                    endTime={settings.dayEnd}
                                    entries={weekPlan.entries}
                                    presets={presets}
                                    isAnimating={isSidebarAnimating}
                                    onAddEntry={handleAddEntry}
                                    onDeleteEntry={handleDeleteEntry}
                                    onUpdateEntry={handleUpdateEntry}
                                    selectedEntryIds={selectedEntryIds}
                                    onSelectEntry={handleSelectEntry}
                                    pinnedDays={settings.pinnedDays || []}
                                    onTogglePinDay={handleTogglePinDay}
                                    dayPresets={dayPresets}
                                    onSaveDayAsPreset={handleSaveDayAsPreset}
                                />
                            </div>
                        </main>
                    </div>

                    {isSettingsOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                            <SettingsDialog
                                settings={settings}
                                onSave={(newSettings) => {
                                    setSettings(newSettings);
                                    setIsSettingsOpen(false);
                                }}
                                onClose={() => setIsSettingsOpen(false)}
                            />
                        </div>
                    )}
                </DndProvider>
            </div >
        </div >
    );
}

export default App;
