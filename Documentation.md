# Technical Documentation: Wochenplan

## Core Philosophy
Wochenplan is designed as a **high-precision scheduler** that combines the responsiveness of a web app with the durability of a native desktop tool.

---

## 1. State Orchestration & History
The application uses a centralized state pattern in `App.tsx` managed by a custom `useHistory` hook.

### `useHistory` Stack
- **`past`**: A stack of previous `AppState` objects.
- **`future`**: A stack representing "undone" states for redoing.
- **Persistence Gate**: The `setState` function accepts a `saveToHistory` boolean. This is critical for initial loading; we load data into the current state without pushing an "empty" entry onto the undo stack.

### Persistence Logic
Data persistence is handled via IPC (Inter-Process Communication). 
1. **Renderer**: Calls `window.electron.store.set()`.
2. **Preload**: Bridges the call via `contextBridge`.
3. **Main Process**: Uses `electron-store` to write the JSON to the user's application data folder.

---

## 2. The Drag-and-Drop Lifecycle
Integrated via `react-dnd` with a coordinate-to-time mapping system.

### Coordinate Mapping
The `ScheduleGrid` calculates the entry position based on:
- **`dayStart` / `dayEnd`**: Defines the visible vertical range.
- **Column Height**: Used by `DayColumn` to determine the "minutes per pixel" ratio.
- **Logic**: `(offset.y / totalHeight) * totalMinutes` + `startMinutes`.

### Drop Handlers
- **`PRESET`**: Drops a single template item.
- **`DAY_PRESET`**: Drops a collection of entries. The app calculates the offsets relative to the drop point to maintain the internal structure of the template.
- **Persistence**: Dropped items default to "Once-only". Users can toggle "Persistent" via the UI, which pins the item to all future weeks.

---

## 3. Advanced Persistence: Persistent Entries
Persistent entries are entries visible across every week.

### Forward-Only Logic
To prevent historical data corruption:
- When an entry is marked as persistent, it gains a `validFrom` property containing the current `{year, weekNumber}`.
- It will **not** appear in previous weeks to preserve accurate past records.

### Deletion Handling
- Deleting a persistent entry for "Only this week" adds its `day`/`startTime` to a `deletedPersistentSlots` list.
- The rendering engine filters persistent entries against this list for the active week.

---

## 4. Performance & Rendering
Targeting a consistent 60fps experience in Electron.

### GPU Layering
- **Promotion**: Containers use `translateZ(0)` to force GPU compositing.
- **Backface Isolation**: `backface-visibility: hidden` prevents unnecessary redraws when the parent container shifts.

### Render Tree Pruning & Layout Isolation
- **Layout Isolation (CSS `contain`)**: During sidebar transitions (0.4s), the `ScheduleGrid` is toggled to `contain: strict`. This "freezes" the internal layout calculations of the hundreds of time entries, allowing the sidebar to resize the container smoothly without triggering expensive re-layouts of the entries until the animation stops.
- **`content-visibility: hidden`**: Applied to the Sidebar's inner content when collapsed. This instructs Chromium to completely skip the "Layout" and "Paint" phases for those DOM nodes, drastically reducing the cost of the width animation.
- **Memoization**: Every core component is a `React.memo`, using shallow comparison on props to skip re-renders.

---

## 5. Extensibility
### Adding Export Formats
All export logic is abstracted in `src/utils/exportUtils.ts`. To add a new format:
1. Define the format in the `Settings` type.
2. Implement a generator in `exportUtils`.
3. Update the `FileDown` click handler in `App.tsx`.

### Customizing Styles
The app uses a consistent HSL-based palette tied to Tailwind variables. Most colors are derived from the `slate-950` and `indigo-600` base tokens.
