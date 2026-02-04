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
    }, []);

    // Load data when week changes
    useEffect(() => {
        if (!isLoaded.current) return;

        const loadWeekData = async () => {
            const savedPlan = await storage.getWeekPlan(weekInfo.year, weekInfo.weekNumber);
            const savedDeletedSlots = await storage.getDeletedPersistentSlots(); // Fixed method name

            setDeletedSlots(savedDeletedSlots);

            // Fetch previous week's persistent entries if allowCarryOver is enabled (logic can be expanded here)
            // For now, simpler logic:
            const prevWeekDate = new Date(currentDate);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            const prevWeekInfo = getWeekNumber(prevWeekDate);
            const prevPlan = await storage.getWeekPlan(prevWeekInfo[0], prevWeekInfo[1]);

            let persistentEntries: ScheduleEntry[] = [];
            if (prevPlan) {
                persistentEntries = prevPlan.entries.filter(e => e.isPersistent);
            }

            // Filter out persistent entries that were explicitly deleted in THIS week
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
                // Merge saved entries with persistent entries from previous week
                // Avoid duplicates: if an entry exists in savedPlan, allow it (it might be moved/edited)
                // If it's pure persistent, add it.
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

    // Save settings
    useEffect(() => {
        if (isLoaded.current) {
            storage.setSettings(settings); // Fixed method name
        }
    }, [settings]);

    // Save week plan
    useEffect(() => {
        if (isLoaded.current) {
            storage.setWeekPlan(weekPlan); // Fixed method name
        }
    }, [weekPlan]);

    // Save presets
    useEffect(() => {
        if (isLoaded.current) {
            storage.setPresets(presets); // Fixed method name
        }
    }, [presets]);

    useEffect(() => {
        if (isLoaded.current) {
            storage.setDayPresets(dayPresets); // Fixed method name
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
        // Cascade delete entries
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
            const newStart = timeToMinutes(entry.startTime);
            const newEnd = timeToMinutes(entry.endTime);

            // Filter out overlapping entries for the same day
            const nonOverlapping = prev.entries.filter(e => {
                if (e.day !== entry.day) return true;
                const eStart = timeToMinutes(e.startTime);
                const eEnd = timeToMinutes(e.endTime);
                // Check overlap: (StartA < EndB) and (EndA > StartB)
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

        // If deleting a persistent entry, mark it as deleted
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

        // Logic for bundle splitting
        let newEntries = weekPlan.entries.filter(e => e.id !== id);

        if (entryToDelete.dayPresetGroupId) {
            const groupId = entryToDelete.dayPresetGroupId;
            const groupEntries = newEntries.filter(e => e.dayPresetGroupId === groupId);

            if (groupEntries.length > 0) {
                // Sort by time
                groupEntries.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                // Check for gaps
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

                // Re-assign group IDs only if a split occurred
                if (groups.length > 1) {
                    // Keep the original Group ID for the first chunk? 
                    // Or for the largest chunk?
                    // User said: "should only break the slots up... shouldn't break up all of them"
                    // Strategy: Assign new group IDs for all chunks to ensure cleanliness, 
                    // BUT ensure chunks themselves remain bundled.
                    // The previous logic did exactly that: each chunk got a new ID.
                    // If the user says "it shouldn't break up all of them", maybe they mean
                    // items within [C, D] should NOT be split? My logic preserves [C, D] as a group.
                    // Perhaps the issue is that in the PREVIOUS implementation I might have had a bug?
                    // Let's ensure this logic is solid.
                    // [A, B, C, D] -> delete B -> [A] (gap) [C, D].
                    // groups = [[A], [C, D]].
                    // result: A gets ID1, C,D get ID2.
                    // This seems correct for "splitting the bundle".

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
                // If groups.length === 1, it means we deleted an end item (A or D). 
                // The remaining [A, B, C] are contiguous. They keep their original Group ID. Correct.
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

    // New action to move multiple entries atomically without triggering deletion splitting
    const handleMoveEntries = (entriesToMove: { id: string; day: Day; startTime: string; endTime: string }[]) => {
        setWeekPlan(prev => {
            const entries = [...prev.entries];
            const updates = new Map(entriesToMove.map(e => [e.id, e]));

            return {
                ...prev,
                entries: entries.map(e => {
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

        // Handle persistent deletion for all items
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
            const newDeletedSlots = [...deletedSlots, ...newDeletionRecords];
            setDeletedSlots(newDeletedSlots);
            await storage.setDeletedPersistentSlots(newDeletedSlots);
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

    const handleUpdateEntry = (entry: ScheduleEntry) => {
        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.map(e => e.id === entry.id ? entry : e)
        }));
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
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            redo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedEntryIds.size > 0) {
                selectedEntryIds.forEach(id => handleDeleteEntry(id));
                setSelectedEntryIds(new Set());
            }
        }
    }, [undo, redo, selectedEntryIds]);

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

        // Cascade persistence to ALL entries in that day
        if (!isCurrentlyPinned) {
            // If we are pinning (turning ON), make all entries persistent
            setWeekPlan(prev => ({
                ...prev,
                entries: prev.entries.map(e => e.day === day ? { ...e, isPersistent: true } : e)
            }));
        } else {
            // If we are unpinning (turning OFF), optional: remove persistence? 
            // Usually users expect "Pin Day" -> "Make everything persistent". Unpin might not necessarily revert.
            // But let's assume it should toggle accordingly for "live" behavior?
            // Actually, "Pinning" usually implies functionality for *future* drops. 
            // The request says "pinning the day doesn't automatically pin all the items anymore in that day".
            // So on toggle ON, we set True. On toggle OFF, we set False.
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
        // Unlink entries that used this preset
        setWeekPlan(prev => ({
            ...prev,
            entries: prev.entries.map(e => e.dayPresetId === id ? {
                ...e,
                dayPresetId: undefined,
                dayPresetGroupId: undefined, // Remove grouping if source preset is gone? Or keep grouping? User said "border should get deleted". Border comes from group/preset.
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

        // Auto-generate name based on day and count
        const existingCount = dayPresets.filter(p => p.name.startsWith(`${day} Vorlage`)).length;
        const presetName = existingCount === 0 ? `${day} Vorlage` : `${day} Vorlage (${existingCount + 1})`;

        const newPreset: DayPreset = {
            id: uuidv4(),
            name: presetName,
            color: '#6366f1', // Default Indigo
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
            handleMoveEntries, // New action
            undo,
            redo
        }
    };
};
