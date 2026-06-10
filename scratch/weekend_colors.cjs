const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// 1. Update the th mapping in PilotHrsTab
const thTarget = `              {weeks.map((w,wi) => (
                w.days.map((d,di) => (
                  <th key={d} style={{padding:"4px 2px",color:"#94a3b8",fontSize:10,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid var(--border-panel)",textAlign:"center",minWidth:22,background:wi%2===0?"rgba(255,255,255,0.02)":"transparent"}}>{d}</th>
                ))
              ))}`;

const thReplacement = `              {weeks.map((w,wi) => (
                w.days.map((d,di) => {
                  const dow = new Date(year, month, d).getDay();
                  const isSat = dow === 6;
                  const isSun = dow === 0;
                  return (
                    <th key={d} style={{padding:"4px 2px",color:isSat?"#c084fc":isSun?"#f87171":"#94a3b8",fontSize:10,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid var(--border-panel)",textAlign:"center",minWidth:22,background:isSat?"rgba(192,132,252,0.1)":isSun?"rgba(248,113,113,0.1)":wi%2===0?"rgba(255,255,255,0.02)":"transparent"}}>{d}</th>
                  )
                })
              ))}`;

// 2. Update the td mapping in PilotHrsTab
const tdTarget = `                  {weeks.map((w,wi) => (
                    w.days.map((d,di) => {
                      const dh = dailyHrs[d];
                      return (
                        <td key={d} style={{padding:"4px 2px",textAlign:"center",color:dh>0?"#38bdf8":"#475569",fontSize:12,fontWeight:dh>0?800:400,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",background:wi%2===0?"rgba(255,255,255,0.01)":"transparent"}}>
                          {dh > 0 ? dh.toFixed(1) : "."}
                        </td>
                      );
                    })
                  ))}`;

const tdReplacement = `                  {weeks.map((w,wi) => (
                    w.days.map((d,di) => {
                      const dh = dailyHrs[d];
                      const dow = new Date(year, month, d).getDay();
                      const isSat = dow === 6;
                      const isSun = dow === 0;
                      return (
                        <td key={d} style={{padding:"4px 2px",textAlign:"center",color:dh>0?"#38bdf8":isSat?"#c084fc":isSun?"#f87171":"#475569",fontSize:12,fontWeight:dh>0?800:400,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",background:isSat?"rgba(192,132,252,0.05)":isSun?"rgba(248,113,113,0.05)":wi%2===0?"rgba(255,255,255,0.01)":"transparent"}}>
                          {dh > 0 ? dh.toFixed(1) : "."}
                        </td>
                      );
                    })
                  ))}`;


// 3. Update ExcelJS export logic to include colors
const excelTarget = `    ws.columns.forEach((col, idx) => {
        if (idx === 0) col.width = 8;
        else if (idx === 1) col.width = 35;
        else if (idx === 2) col.width = 12;
        else if (idx === ws.columns.length - 1) col.width = 12;
        else col.width = 6;
    });

    ws.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (cell.master === cell) return;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });`;

const excelReplacement = `    ws.columns.forEach((col, idx) => {
        if (idx === 0) col.width = 8;
        else if (idx === 1) col.width = 35;
        else if (idx === 2) col.width = 12;
        else if (idx === ws.columns.length - 1) col.width = 12;
        else col.width = 6;
    });

    ws.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (cell.master === cell) return;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    for (let cIdx = 4; cIdx <= 3 + daysInMonth; cIdx++) {
        const dStr = ws.getCell(2, cIdx).value;
        const d = parseInt(dStr);
        if (!isNaN(d)) {
            const dow = new Date(year, month, d).getDay();
            let bgColor = null;
            let fontColor = null;
            if (dow === 6) { // Sat
                bgColor = 'FFE8D4FF';
                fontColor = 'FF8A2BE2';
            } else if (dow === 0) { // Sun
                bgColor = 'FFFFD4D4';
                fontColor = 'FFFF0000';
            }
            if (bgColor) {
                for (let rIdx = 2; rIdx <= ws.rowCount; rIdx++) {
                    const wsCell = ws.getCell(rIdx, cIdx);
                    if (rIdx === 2) {
                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        wsCell.font = { name: 'TH SarabunPSK', size: 16, bold: true, color: { argb: fontColor } };
                    } else if (wsCell.value && wsCell.value !== '.' && wsCell.value !== '-') {
                        // Data cell with numbers (fly hours)
                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        wsCell.font = { name: 'TH SarabunPSK', size: 16, bold: true, color: { argb: 'FF000000' } }; // keep blueish? No, exceljs rgb doesn't map to #38bdf8 directly unless hardcoded, let's just make it bold black for data
                    } else {
                        // Empty data cell
                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        wsCell.font = { name: 'TH SarabunPSK', size: 16, color: { argb: fontColor } };
                    }
                }
            }
        }
    }`;

// Wait! Since PilotHrsTab might have the target multiple times, I will use replace() to ensure it targets the correct ones.
// In PilotHrsTab, the `renderGridTable` logic is inside the `PilotHrsTab` function.
// Let's just do a global replace for the th and td targets, as they are unique to PilotHrsTab.
c = c.replace(thTarget, thReplacement);
c = c.replace(tdTarget, tdReplacement);
c = c.replace(excelTarget, excelReplacement);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Replaced weekend colors in UI and ExcelJS');
