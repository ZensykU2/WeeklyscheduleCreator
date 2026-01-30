import ExcelJS from 'exceljs';
import { WeekPlan, TimeBlock, Settings } from '../types';
import { timeToMinutes } from './dateUtils';
import { format, startOfWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

export async function exportToExcel(plan: WeekPlan, presets: TimeBlock[], settings: Settings) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`KW ${plan.weekNumber}`);

    // Calculate week dates
    const yearStart = new Date(plan.year, 0, 1);
    const weekStart = startOfWeek(addDays(yearStart, (plan.weekNumber - 1) * 7), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, settings.workDays.length - 1);

    // Short month names in German
    const shortMonths = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'];
    const startMonthShort = shortMonths[weekStart.getMonth()];
    const endMonthShort = shortMonths[weekEnd.getMonth()];
    const startDay = format(weekStart, 'd', { locale: de });
    const endDay = format(weekEnd, 'd', { locale: de });
    // Format: If same month: "KW 5, 27. - 31. Jan 2026", if different: "KW 5, 27. Jan - 2. Feb 2026"
    const headerText = weekStart.getMonth() === weekEnd.getMonth()
        ? `KW ${plan.weekNumber}, ${startDay}. - ${endDay}. ${startMonthShort} ${plan.year}`
        : `KW ${plan.weekNumber}, ${startDay}. ${startMonthShort} - ${endDay}. ${endMonthShort} ${plan.year}`;

    // Column widths
    worksheet.columns = [
        { key: 'time', width: 10 },
        ...settings.workDays.map(day => ({ key: day, width: 22 }))
    ];

    // === HEADER SECTION ===
    const totalCols = settings.workDays.length + 1;

    // Row 1: KW + Date range - single dark banner
    worksheet.mergeCells(1, 1, 1, totalCols);
    const headerCell = worksheet.getCell(1, 1);
    headerCell.value = headerText;
    headerCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 28;

    // Row 2: Empty spacer row
    worksheet.getRow(2).height = 6;

    // Row 3: Day headers
    const headerRow = worksheet.getRow(3);
    headerRow.getCell(1).value = 'Zeit';
    settings.workDays.forEach((day, idx) => {
        headerRow.getCell(idx + 2).value = day;
    });
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    // Create time rows (60 min steps to match UI) - starting from row 4
    const startMins = timeToMinutes(settings.dayStart);
    const endMins = timeToMinutes(settings.dayEnd);
    const DATA_START_ROW = 4;

    for (let mins = startMins; mins < endMins; mins += 60) {
        const startTimeStr = `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
        const endTimeStr = `${Math.floor((mins + 60) / 60).toString().padStart(2, '0')}:${((mins + 60) % 60).toString().padStart(2, '0')}`;
        const row = worksheet.addRow({ time: `${startTimeStr} - ${endTimeStr}` });
        row.height = 28;
        row.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF64748B' } };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Map entries - adjusted for new header offset
    plan.entries.forEach(entry => {
        const colIndex = settings.workDays.indexOf(entry.day) + 2;
        if (colIndex < 2) return;

        const entryStartMins = timeToMinutes(entry.startTime);
        const entryEndMins = timeToMinutes(entry.endTime);

        const startRow = Math.round((entryStartMins - startMins) / 60) + DATA_START_ROW;
        const endRow = Math.round((entryEndMins - startMins) / 60) + DATA_START_ROW - 1;

        const block = presets.find(p => p.id === entry.blockId);
        const color = (block?.color || '#3b82f6').replace('#', '');

        if (startRow <= endRow) {
            worksheet.mergeCells(startRow, colIndex, endRow, colIndex);
        }

        const cell = worksheet.getCell(startRow, colIndex);
        cell.value = block?.name || 'Unknown';
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF1E293B' } },
            left: { style: 'medium', color: { argb: 'FF1E293B' } },
            bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
            right: { style: 'medium', color: { argb: 'FF1E293B' } }
        };
    });

    // Add Legend - positioned to align with schedule data
    const legendCol = settings.workDays.length + 3;
    const usedBlockIds = Array.from(new Set(plan.entries.map(e => e.blockId)));
    const usedPresets = presets.filter(p => usedBlockIds.includes(p.id));

    // Type labels mapping
    const typeLabels: Record<string, string> = {
        'project-int': 'Projekt (Int)',
        'project-ext': 'Projekt (Ext)',
        'school-reg': 'Schule',
        'school-uk': 'ÜK',
        'weiterbildung': 'Weiterbildung',
        'break': 'Pause'
    };

    if (usedPresets.length > 0) {
        // Legend title at row 3 (same as day headers)
        worksheet.mergeCells(3, legendCol, 3, legendCol + 2);
        const legendTitleCell = worksheet.getCell(3, legendCol);
        legendTitleCell.value = 'LEGENDE';
        legendTitleCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        legendTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        legendTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        let legendRow = 4;
        usedPresets.forEach(preset => {
            const colorCell = worksheet.getCell(legendRow, legendCol);
            const typeCell = worksheet.getCell(legendRow, legendCol + 1);
            const nameCell = worksheet.getCell(legendRow, legendCol + 2);

            // Color swatch
            colorCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: `FF${preset.color.replace('#', '')}` }
            };
            colorCell.border = {
                top: { style: 'thin', color: { argb: 'FF475569' } },
                left: { style: 'thin', color: { argb: 'FF475569' } },
                bottom: { style: 'thin', color: { argb: 'FF475569' } },
                right: { style: 'thin', color: { argb: 'FF475569' } }
            };

            // Type label (Schule, Projekt, etc)
            typeCell.value = typeLabels[preset.type] || preset.type;
            typeCell.font = { bold: true, size: 10, color: { argb: 'FF64748B' } };
            typeCell.alignment = { vertical: 'middle' };

            // Name
            nameCell.value = preset.name;
            nameCell.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
            nameCell.alignment = { vertical: 'middle' };

            legendRow++;
        });

        worksheet.getColumn(legendCol).width = 4;
        worksheet.getColumn(legendCol + 1).width = 14;
        worksheet.getColumn(legendCol + 2).width = 20;
    }

    // Borders for all cells in range
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            if (!cell.border) {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            }
        });
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Wochenplan_KW${plan.weekNumber}_${plan.year}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
}
