const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

const targetOnClick = /onClick=\{\(\)=>\{try\{const table = document\.getElementById\("pilot-hrs-table-" \+ acType\); const wb = XLSX\.utils\.table_to_book\(table, \{raw:true\}\);[\s\S]*?catch\(err\)\{alert\("Export Failed: " \+ err\.message\);\}\}\}/g;

const newOnClick = `onClick={async ()=>{
  try {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const table = document.getElementById("pilot-hrs-table-" + acType);
    if (!table) return;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('PilotHrs');

    const mergeCells = [];
    let rIdx = 1;
    for (let i = 0; i < table.rows.length; i++) {
        const row = table.rows[i];
        const wsRow = ws.getRow(rIdx);
        let cIdx = 1;
        for (let j = 0; j < row.cells.length; j++) {
            const cell = row.cells[j];
            while (ws.getCell(rIdx, cIdx).isMerged || ws.getCell(rIdx, cIdx).master !== ws.getCell(rIdx, cIdx)) {
                cIdx++;
            }
            const wsCell = ws.getCell(rIdx, cIdx);
            const text = cell.innerText.trim();
            const num = parseFloat(text);
            wsCell.value = (!isNaN(num) && text !== '') ? num : text;

            const rs = cell.rowSpan || 1;
            const cs = cell.colSpan || 1;
            if (rs > 1 || cs > 1) {
                ws.mergeCells(rIdx, cIdx, rIdx + rs - 1, cIdx + cs - 1);
            }
            
            wsCell.font = { name: 'TH SarabunPSK', size: 16, bold: rIdx <= 2 };
            wsCell.alignment = { vertical: 'middle', horizontal: (cIdx === 2 && rIdx > 2) ? 'left' : 'center' };
            wsCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            if (rIdx <= 2) {
                wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            }
            cIdx += cs;
        }
        rIdx++;
    }

    ws.columns.forEach((col, idx) => {
        if (idx === 0) col.width = 8;
        else if (idx === 1) col.width = 35;
        else if (idx === 2) col.width = 12;
        else if (idx === ws.columns.length - 1) col.width = 12;
        else col.width = 6;
    });

    // Fix alignments for merged cells that might be missed
    ws.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (cell.master === cell) return;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), \`PilotHrs_\${acType}_\${month+1}_\${year}.xlsx\`);
  } catch(err) {
    alert("Export Error: " + err.message);
  }
}}`;

const updated = c.replace(targetOnClick, newOnClick);
fs.writeFileSync('src/squadron-dashboard.tsx', updated);
console.log('Replaced onClick for exceljs');
