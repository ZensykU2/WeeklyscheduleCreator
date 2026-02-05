import React from 'react';
import { ScheduleGrid } from './components/calendar/ScheduleGrid';
import { Sidebar } from './components/sidebar/Sidebar';
import { Header } from './components/layout/Header';
import { CustomDragLayer } from './components/CustomDragLayer';
import { SettingsDialog } from './components/SettingsDialog';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TitleBar from './components/TitleBar';
import { useAppLogic } from './hooks/useAppLogic';

import { LanguageProvider } from './contexts/LanguageContext';

function App() {
    const { state, actions } = useAppLogic();

    return (
        <LanguageProvider language={state.settings.language}>
            <div className="h-screen w-screen bg-[#020617] text-white overflow-hidden flex flex-col font-sans select-none">
                <TitleBar />
                <div className="flex-1 flex overflow-hidden relative">
                    <DndProvider backend={HTML5Backend}>
                        <CustomDragLayer
                            presets={state.presets}
                            dayPresets={state.dayPresets}
                        />

                        <Sidebar
                            width={state.sidebarWidth}
                            onWidthChange={actions.setSidebarWidth}
                            isCollapsed={state.isSidebarCollapsed}
                            onToggleCollapse={() => actions.setIsSidebarCollapsed(!state.isSidebarCollapsed)}
                            onAnimationChange={actions.setIsSidebarAnimating}
                            presets={state.presets}
                            onAddPreset={actions.handleAddPreset}
                            onDeletePreset={actions.handleDeletePreset}
                            onUpdatePreset={actions.handleUpdatePreset}
                            dayPresets={state.dayPresets}
                            onAddDayPreset={actions.handleAddDayPreset}
                            onDeleteDayPreset={actions.handleDeleteDayPreset}
                            onUpdateDayPreset={actions.handleUpdateDayPreset}
                        />

                        <div className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
                            <Header
                                weekInfo={state.weekInfo}
                                onPrevWeek={() => actions.changeWeek(-1)}
                                onNextWeek={() => actions.changeWeek(1)}
                                onResetDate={() => actions.setCurrentDate(new Date())}
                                canUndo={state.canUndo}
                                canRedo={state.canRedo}
                                onUndo={actions.undo}
                                onRedo={actions.redo}
                                onExport={actions.handleExport}
                                onOpenSettings={() => actions.setIsSettingsOpen(true)}
                            />

                            <main className="flex-1 p-4 flex flex-col overflow-hidden relative">
                                {/* Subtle background decoration */}
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" style={{ willChange: 'opacity, transform', transform: 'translate3d(0,0,0)' }} />
                                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" style={{ willChange: 'opacity, transform', transform: 'translate3d(0,0,0)' }} />

                                <div className="z-10 flex flex-col h-full">
                                    <ScheduleGrid
                                        days={state.settings.workDays}
                                        startTime={state.settings.dayStart}
                                        endTime={state.settings.dayEnd}
                                        entries={state.weekPlan.entries}
                                        presets={state.presets}
                                        isAnimating={state.isSidebarAnimating}
                                        onAddEntry={actions.handleAddEntry}
                                        onDeleteEntry={actions.handleDeleteEntry}
                                        onDeleteGroup={actions.handleDeleteGroup}
                                        onMoveEntries={actions.handleMoveEntries}
                                        onUpdateEntry={actions.handleUpdateEntry}
                                        selectedEntryIds={state.selectedEntryIds}
                                        onSelectEntry={actions.handleSelectEntry}
                                        pinnedDays={state.settings.pinnedDays || []}
                                        onTogglePinDay={actions.handleTogglePinDay}
                                        dayPresets={state.dayPresets}
                                        onSaveDayAsPreset={actions.handleSaveDayAsPreset}
                                    />
                                </div>
                            </main>
                        </div>

                        {state.isSettingsOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                                <SettingsDialog
                                    settings={state.settings}
                                    onSave={(newSettings) => {
                                        actions.setSettings(newSettings);
                                        actions.setIsSettingsOpen(false);
                                    }}
                                    onClose={() => actions.setIsSettingsOpen(false)}
                                />
                            </div>
                        )}
                    </DndProvider>
                </div>
            </div>
        </LanguageProvider>
    );
}

export default App;
