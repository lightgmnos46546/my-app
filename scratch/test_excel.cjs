const ExcelJS = require('exceljs');
const fs = require('fs');

(async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('S-92A');

    // Simulate export logic from squadron-dashboard.tsx
    const headerRow = worksheet.addRow(["ลำดับ", "ยศ - ชื่อ - นามสกุล", "ณ ต้นเดือน", "1", "2"]);
    const day1 = new Date(2026, 5, 6); // June 6 2026 is Saturday
    const day2 = new Date(2026, 5, 7); // June 7 2026 is Sunday
    
    // Day 1 (Saturday)
    if (day1.getDay() === 6) {
        headerRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8D4FF' } };
        headerRow.getCell(4).font = { color: { argb: 'FF8A2BE2' } };
    }
    // Day 2 (Sunday)
    if (day2.getDay() === 0) {
        headerRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        headerRow.getCell(5).font = { color: { argb: 'FFDC2626' } };
    }

    const exportPath = 'scratch/ExportTest.xlsx';
    await workbook.xlsx.writeFile(exportPath);
    
    console.log("Excel generated successfully!");
    
    // Now verify the colors in the generated file
    const verifyWb = new ExcelJS.Workbook();
    await verifyWb.xlsx.readFile(exportPath);
    const verifyWs = verifyWb.getWorksheet('S-92A');
    const cell4 = verifyWs.getRow(1).getCell(4);
    const cell5 = verifyWs.getRow(1).getCell(5);
    
    console.log("Saturday Cell Fill:", cell4.fill.fgColor.argb);
    console.log("Saturday Cell Font:", cell4.font.color.argb);
    console.log("Sunday Cell Fill:", cell5.fill.fgColor.argb);
    console.log("Sunday Cell Font:", cell5.font.color.argb);
    
    if (cell4.fill.fgColor.argb === 'FFE8D4FF' && cell5.fill.fgColor.argb === 'FFFEE2E2') {
        console.log("TEST PASSED: Colors are correctly injected into the Excel file!");
        process.exit(0);
    } else {
        console.error("TEST FAILED");
        process.exit(1);
    }
})();
