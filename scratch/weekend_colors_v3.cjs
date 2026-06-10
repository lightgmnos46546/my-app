const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// Isolate PilotHrsTab
const startMarker = 'function PilotHrsTab() {';
const pIdx = c.indexOf(startMarker);
if (pIdx === -1) throw new Error("Could not find PilotHrsTab");

let before = c.substring(0, pIdx);
let pilotHrsBody = c.substring(pIdx);

// 1. Replace TH loop
const thMatch = pilotHrsBody.match(/\{weeks\.map\(\(w,wi\) => \([\s\S]*?<th key=\{d\}.*?\{d\}<\/th>[\s\S]*?\)\)[\s\S]*?\)\)\}/);
if (thMatch) {
    const thReplacement = `{weeks.map((w,wi) => (
                w.days.map((d,di) => {
                  const dow = new Date(year, month, d).getDay();
                  const isSat = dow === 6;
                  const isSun = dow === 0;
                  return (
                    <th key={d} style={{padding:"4px 2px",color:isSat?"#c084fc":isSun?"#f87171":"#94a3b8",fontSize:10,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid var(--border-panel)",textAlign:"center",minWidth:22,background:isSat?"rgba(192,132,252,0.1)":isSun?"rgba(248,113,113,0.1)":wi%2===0?"rgba(255,255,255,0.02)":"transparent"}}>{d}</th>
                  )
                })
              ))}`;
    pilotHrsBody = pilotHrsBody.replace(thMatch[0], thReplacement);
} else {
    throw new Error("Could not find TH loop");
}

// 2. Replace TD loop
const tdMatch = pilotHrsBody.match(/\{weeks\.map\(\(w,wi\) => \([\s\S]*?w\.days\.map\(\(d,di\) => \{[\s\S]*?const dh = dailyHrs\[d\];[\s\S]*?return \([\s\S]*?<td key=\{d\}[\s\S]*?\{dh > 0 \? dh\.toFixed\(1\) : "\."\}[\s\S]*?<\/td>[\s\S]*?\);[\s\S]*?\}\)[\s\S]*?\)\)\}/);
if (tdMatch) {
    const tdReplacement = `{weeks.map((w,wi) => (
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
    pilotHrsBody = pilotHrsBody.replace(tdMatch[0], tdReplacement);
} else {
    throw new Error("Could not find TD loop");
}

// 3. Replace ExcelJS logic
const excelMatch = pilotHrsBody.match(/ws\.columns\.forEach\(\(col, idx\) => \{[\s\S]*?ws\.eachRow\(\(row, rowNumber\) => \{[\s\S]*?\}\);/);
if (excelMatch) {
    const excelReplacement = `ws.columns.forEach((col, idx) => {
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

    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        wsCell.font = { name: 'TH SarabunPSK', size: 16, bold: true, color: { argb: 'FF000000' } };
                    } else {
                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                        wsCell.font = { name: 'TH SarabunPSK', size: 16, color: { argb: fontColor } };
                    }
                }
            }
        }
    }`;
    pilotHrsBody = pilotHrsBody.replace(excelMatch[0], excelReplacement);
} else {
    throw new Error("Could not find ExcelJS block");
}

fs.writeFileSync('src/squadron-dashboard.tsx', before + pilotHrsBody);
console.log("Successfully replaced safely via regex");
