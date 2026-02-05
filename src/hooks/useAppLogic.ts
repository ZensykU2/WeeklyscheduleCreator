import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { WeekPlan, TimeBlock, DayPreset, Settings, ScheduleEntry, Day, AppState } from '../types';
import { getCurrentWeekRange, timeToMinutes, minutesToTime, getWeekNumber } from '../utils/dateUtils';
import { useHistory } from './useHistory';
import { storage } from '../store/storage';
import { exportToExcel } from '../utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';

export const useAppLogic = () => {
    const [settings, setSettings] = useState<Settings>({
        workDays: ['MO', 'DI', 'MI', 'DO', 'FR'],
        dayStart: '08:00',
        dayEnd: '17:00',
        exportFormat: 'excel',
        pinnedDays: [],
        language: 'de'
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
    }, []);

    useEffect(() => {
        if (!isLoaded.current) return;

        const loadWeekData = async () => {
            const savedPlan = await storage.getWeekPlan(weekInfo.year, weekInfo.weekNumber);
            const savedDeletedSlots = await storage.getDeletedPersistentSlots();

            setDeletedSlots(savedDeletedSlots);
            const prevWeekDate = new Date(currentDate);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            const prevWeekInfo = getWeekNumber(prevWeekDate);
            const prevPlan = await storage.getWeekPlan(prevWeekInfo[0], prevWeekInfo[1]);

            let persistentEntries: ScheduleEntry[] = [];
            if (prevPlan) {
                persistentEntries = prevPlan.entries.filter(e => e.isPersistent);
            }

            const filteredPersistentEntries = persistentEntries.filter(entry => {
                const wasDeleted = savedDeletedSlots.some(slot =>
                    slot.day === entry.day &&
                    slot.startTime === entry.startTime &&
                    slot.deletedInWeek.year === weekInfo.year &&
                    slot.deletedInWeek.week === weekInfo.weekNumber
                );
                return !wasDeleted;
            });

            if (savedPlan) {
                const existingIds = new Set(savedPlan.entries.map(e => e.id));
                const uniquePersistent = filteredPersistentEntries.filter(e => !existingIds.has(e.id));

                setWeekPlan({
                    ...savedPlan,
                    entries: [...savedPlan.entries, ...uniquePersistent]
                }, false);
            } else {
                setWeekPlan({
                    weekNumber: weekInfo.weekNumber,
                    year: weekInfo.year,
                    startDate: weekInfo.start.toISOString(),
                    entries: filteredPersistentEntries
                }, false);
            }
        };
        loadWeekData();
    }, [weekInfo, currentDate]);


    useEffect(() => {
        if (isLoaded.current) {
            storage.setSettings(settings);
        }
    }, [settings]);

    useEffect(() => {
        if (isLoaded.current) {
            storage.setWeekPlan(weekPlan);
        }
    }, [weekPlan]);

    useEffect(() => {
        if (isLoaded.current) {
            storage.setPresets(presets);
        }
    }, [presets]);

    useEffect(() => {
        if (isLoaded.current) {
            storage.setDayPresets(dayPresets);
        }
    }, [dayPresets]);

    const changeWeek = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + offset * 7);
        setCurrentDate(newDate);
    };

    const handleAddPreset = (preset: TimeBlock) => {
        setPresets(prev => [...prev, preset]);
    };

    const handleDeletePreset = (id: string) => {
        setPresets(prev => prev.filter(p => p.id !== id));
        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.filter(e => e.blockId !== id)
        }));
    };

    const handleUpdatePreset = (preset: TimeBlock) => {
        setPresets(prev => prev.map(p => p.id === preset.id ? preset : p));
    };

    const handleAddEntry = (entry: ScheduleEntry) => {
        setWeekPlan(prev => {
            if (settings.pinnedDays?.includes(entry.day)) {
                entry.isPersistent = true;
                if (!entry.validFrom) {
                    entry.validFrom = { year: weekInfo.year, week: weekInfo.weekNumber };
                }
            }

            const newStart = timeToMinutes(entry.startTime);
            const newEnd = timeToMinutes(entry.endTime);

            const nonOverlapping = prev.entries.filter(e => {
                if (e.day !== entry.day) return true;
                const eStart = timeToMinutes(e.startTime);
                const eEnd = timeToMinutes(e.endTime);
                const isOverlapping = newStart < eEnd && newEnd > eStart;
                return !isOverlapping;
            });

            return {
                ...prev,
                entries: [...nonOverlapping, entry]
            };
        });
    };

    const handleDeleteEntry = async (id: string) => {
        const entryToDelete = weekPlan.entries.find(e => e.id === id);

        if (!entryToDelete) return;

        if (entryToDelete.isPersistent) {
            const deletionRecord = {
                day: entryToDelete.day,
                startTime: entryToDelete.startTime,
                deletedInWeek: { year: weekInfo.year, week: weekInfo.weekNumber }
            };
            const newDeletedSlots = [...deletedSlots, deletionRecord];
            setDeletedSlots(newDeletedSlots);
            await storage.setDeletedPersistentSlots(newDeletedSlots);
        }

        let newEntries = weekPlan.entries.filter(e => e.id !== id);

        if (entryToDelete.dayPresetGroupId) {
            const groupId = entryToDelete.dayPresetGroupId;
            const groupEntries = newEntries.filter(e => e.dayPresetGroupId === groupId);

            if (groupEntries.length > 0) {
                groupEntries.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                const groups: ScheduleEntry[][] = [];
                let currentGroup: ScheduleEntry[] = [groupEntries[0]];

                for (let i = 1; i < groupEntries.length; i++) {
                    const prev = groupEntries[i - 1];
                    const curr = groupEntries[i];

                    if (prev.endTime !== curr.startTime) {
                        groups.push(currentGroup);
                        currentGroup = [];
                    }
                    currentGroup.push(curr);
                }
                groups.push(currentGroup);

                if (groups.length > 1) {

                    const updatedGroupEntries = groups.flatMap(group => {
                        const newGroupId = uuidv4();
                        return group.map(e => ({
                            ...e,
                            dayPresetGroupId: newGroupId
                        }));
                    });

                    newEntries = newEntries.map(e => {
                        const updated = updatedGroupEntries.find(u => u.id === e.id);
                        return updated || e;
                    });
                }
            }
        }

        setWeekPlan(prev => ({
            ...prev,
            entries: newEntries
        }));

        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleMoveEntries = (entriesToMove: { id: string; day: Day; startTime: string; endTime: string }[]) => {
        setWeekPlan(prev => {
            const movingIds = new Set(entriesToMove.map(e => e.id));

            const newRanges = entriesToMove.map(e => ({
                day: e.day,
                start: timeToMinutes(e.startTime),
                end: timeToMinutes(e.endTime)
            }));

            const nonOverlapping = prev.entries.filter(e => {
                if (movingIds.has(e.id)) return true;

                const isOverlapping = newRanges.some(range => {
                    if (e.day !== range.day) return false;
                    const eStart = timeToMinutes(e.startTime);
                    const eEnd = timeToMinutes(e.endTime);
                    return range.start < eEnd && range.end > eStart;
                });

                return !isOverlapping;
            });

            const updates = new Map(entriesToMove.map(e => [e.id, e]));

            return {
                ...prev,
                entries: nonOverlapping.map(e => {
                    const update = updates.get(e.id);
                    if (update) {
                        return {
                            ...e,
                            day: update.day,
                            startTime: update.startTime,
                            endTime: update.endTime
                        };
                    }
                    return e;
                })
            };
        });
    };

    const handleDeleteGroup = async (groupId: string) => {
        const groupEntries = weekPlan.entries.filter(e => e.dayPresetGroupId === groupId);

        const newDeletionRecords: { day: string; startTime: string; deletedInWeek: { year: number; week: number } }[] = [];

        groupEntries.forEach(entry => {
            if (entry.isPersistent) {
                newDeletionRecords.push({
                    day: entry.day,
                    startTime: entry.startTime,
                    deletedInWeek: { year: weekInfo.year, week: weekInfo.weekNumber }
                });
            }
        });

        if (newDeletionRecords.length > 0) {
            setDeletedSlots(prev => {
                const existingSignatures = new Set(prev.map(ds => `${ds.day}-${ds.startTime}`));
                const distinctNew = newDeletionRecords.filter(r => !existingSignatures.has(`${r.day}-${r.startTime}`));
                const updated = [...prev, ...distinctNew];
                storage.setDeletedPersistentSlots(updated);
                return updated;
            });
        }

        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.filter(e => e.dayPresetGroupId !== groupId)
        }));

        setSelectedEntryIds(prev => {
            const next = new Set(prev);
            groupEntries.forEach(e => next.delete(e.id));
            return next;
        });
    };

    const handleUpdateEntry = async (entry: ScheduleEntry) => {
        const newStart = timeToMinutes(entry.startTime);
        const newEnd = timeToMinutes(entry.endTime);

        setWeekPlan(prev => {
            const updatedEntries: ScheduleEntry[] = [];
            const itemsToRemove: ScheduleEntry[] = [];

            prev.entries.forEach(e => {
                if (e.id === entry.id) return;
                if (e.day !== entry.day) {
                    updatedEntries.push(e);
                    return;
                }

                const eStart = timeToMinutes(e.startTime);
                const eEnd = timeToMinutes(e.endTime);

                if (newEnd <= eStart || newStart >= eEnd) {
                    updatedEntries.push(e);
                    return;
                }

                if (newStart <= eStart && newEnd >= eEnd) {
                    itemsToRemove.push(e);
                    return;
                }

                if (newEnd > eStart && newEnd < eEnd && newStart <= eStart) {
                    const clippedStart = newEnd;
                    if (eEnd - clippedStart >= 60) {
                        updatedEntries.push({ ...e, startTime: minutesToTime(clippedStart) });
                    } else {
                        itemsToRemove.push(e);
                    }
                    return;
                }

                if (newStart < eEnd && newStart > eStart && newEnd >= eEnd) {
                    const clippedEnd = newStart;
                    if (clippedEnd - eStart >= 60) {
                        updatedEntries.push({ ...e, endTime: minutesToTime(clippedEnd) });
                    } else {
                        itemsToRemove.push(e);
                    }
                    return;
                }

                if (newStart > eStart && newEnd < eEnd) {
                    itemsToRemove.push(e);
                    return;
                }

                itemsToRemove.push(e);
            });

            if (itemsToRemove.length > 0) {
                const newDeletionRecords = itemsToRemove
                    .filter(e => e.isPersistent)
                    .map(e => ({
                        day: e.day,
                        startTime: e.startTime,
                        deletedInWeek: { year: weekInfo.year, week: weekInfo.weekNumber }
                    }));

                if (newDeletionRecords.length > 0) {
                    setDeletedSlots(prevDel => {
                        const existingSignatures = new Set(prevDel.map(ds => `${ds.day}-${ds.startTime}`));
                        const distinctNew = newDeletionRecords.filter(r => !existingSignatures.has(`${r.day}-${r.startTime}`));
                        const updated = [...prevDel, ...distinctNew];
                        storage.setDeletedPersistentSlots(updated);
                        return updated;
                    });
                }
            }

            return {
                ...prev,
                entries: [...updatedEntries, entry]
            };
        });
    };

    const handleExport = async () => {
        try {
            await exportToExcel(weekPlan, presets, settings);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleSelectEntry = (id: string | null, multi: boolean) => {
        if (id === null) {
            if (!multi) setSelectedEntryIds(new Set());
            return;
        }

        setSelectedEntryIds(prev => {
            const next = new Set(multi ? prev : []);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.keyCode === 90) { // Z
                e.preventDefault();
                undo();
            } else if (e.keyCode === 89) { // Y
                e.preventDefault();
                redo();
            } else if (e.keyCode === 68) { // D
                if (selectedEntryIds.size > 0) {
                    e.preventDefault();

                    const entriesToDuplicate = weekPlan.entries.filter(e => selectedEntryIds.has(e.id));
                    if (entriesToDuplicate.length === 0) return;

                    const newEntries: ScheduleEntry[] = [];
                    const newSelectedIds = new Set<string>();
                    const groups = new Map<string, ScheduleEntry[]>();
                    const singles: ScheduleEntry[] = [];

                    entriesToDuplicate.forEach(entry => {
                        if (entry.dayPresetGroupId) {
                            const existing = groups.get(entry.dayPresetGroupId) || [];
                            existing.push(entry);
                            groups.set(entry.dayPresetGroupId, existing);
                        } else {
                            singles.push(entry);
                        }
                    });

                    groups.forEach((groupEntries) => {
                        const newGroupId = uuidv4();
                        groupEntries.forEach(entry => {
                            const newEntry: ScheduleEntry = {
                                ...entry,
                                id: uuidv4(),
                                dayPresetGroupId: newGroupId,
                            };
                            newEntries.push(newEntry);
                            newSelectedIds.add(newEntry.id);
                        });
                    });
                    singles.forEach(entry => {
                        const newEntry: ScheduleEntry = {
                            ...entry,
                            id: uuidv4(),
                        };
                        newEntries.push(newEntry);
                        newSelectedIds.add(newEntry.id);
                    });

                    setWeekPlan(prev => ({
                        ...prev,
                        entries: [...prev.entries, ...newEntries]
                    }));
                    setSelectedEntryIds(newSelectedIds);
                }
            }
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedEntryIds.size > 0) {
                selectedEntryIds.forEach(id => handleDeleteEntry(id));
                setSelectedEntryIds(new Set());
            }
        }
    }, [undo, redo, selectedEntryIds, weekPlan.entries, setWeekPlan, handleDeleteEntry]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleTogglePinDay = useCallback(async (day: Day) => {
        const isCurrentlyPinned = settings.pinnedDays.includes(day);
        const newPinnedDays = isCurrentlyPinned
            ? settings.pinnedDays.filter(d => d !== day)
            : [...settings.pinnedDays, day];

        const newSettings = { ...settings, pinnedDays: newPinnedDays };
        setSettings(newSettings);
        await storage.setSettings(newSettings);

        if (!isCurrentlyPinned) {
            setWeekPlan(prev => ({
                ...prev,
                entries: prev.entries.map(e => e.day === day ? { ...e, isPersistent: true } : e)
            }));
        } else {
            setWeekPlan(prev => ({
                ...prev,
                entries: prev.entries.map(e => e.day === day ? { ...e, isPersistent: false } : e)
            }));
        }

    }, [settings]);

    const handleAddDayPreset = (preset: DayPreset) => {
        setDayPresets(prev => [...prev, preset]);
    };

    const handleDeleteDayPreset = (id: string) => {
        setDayPresets(prev => prev.filter(p => p.id !== id));
        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.map(e => e.dayPresetId === id ? {
                ...e,
                dayPresetId: undefined,
                dayPresetGroupId: undefined,
                dayPresetColor: undefined
            } : e)
        }));
    };

    const handleUpdateDayPreset = (preset: DayPreset) => {
        setDayPresets(prev => prev.map(p => p.id === preset.id ? preset : p));
    };

    const handleSaveDayAsPreset = (day: Day) => {
        const dayEntries = weekPlan.entries.filter(e => e.day === day);
        if (dayEntries.length === 0) return;

        const existingCount = dayPresets.filter(p => p.name.startsWith(`${day} Vorlage`)).length;
        const presetName = existingCount === 0 ? `${day} Vorlage` : `${day} Vorlage (${existingCount + 1})`;

        const newPreset: DayPreset = {
            id: uuidv4(),
            name: presetName,
            color: '#6366f1',
            entries: dayEntries.map(e => ({
                blockId: e.blockId,
                startTime: e.startTime,
                endTime: e.endTime,
                dayPresetColor: e.dayPresetColor,
                dayPresetGroupId: e.dayPresetGroupId,
            }))
        };

        handleAddDayPreset(newPreset);
    };

    return {
        state: {
            settings,
            currentDate,
            weekInfo,
            weekPlan,
            presets,
            dayPresets,
            selectedEntryIds,
            isSettingsOpen,
            isSidebarCollapsed,
            sidebarWidth,
            isSidebarAnimating,
            canUndo,
            canRedo
        },
        actions: {
            setSettings,
            setCurrentDate,
            setIsSettingsOpen,
            setIsSidebarCollapsed,
            setSidebarWidth,
            setIsSidebarAnimating,
            changeWeek,
            handleAddPreset,
            handleDeletePreset,
            handleUpdatePreset,
            handleAddEntry,
            handleDeleteEntry,
            handleUpdateEntry,
            handleSelectEntry,
            handleTogglePinDay,
            handleAddDayPreset,
            handleDeleteDayPreset,
            handleUpdateDayPreset,
            handleSaveDayAsPreset,
            handleExport,
            handleDeleteGroup,
            handleMoveEntries,
            undo,
            redo
        }
    };
};
