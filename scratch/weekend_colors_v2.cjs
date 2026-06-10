const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');
const lines = c.split('\n');

// PilotHrsTab th replacement at line 5776
if (lines[5775].includes('w.days.map((d,di) => (')) {
    lines[5775] = `                w.days.map((d,di) => {`;
    lines[5776] = `                  const dow = new Date(year, month, d).getDay();`;
    lines[5777] = `                  const isSat = dow === 6;`;
    lines[5778] = `                  const isSun = dow === 0;`;
    lines[5779] = `                  return (`;
    lines[5780] = `                    <th key={d} style={{padding:"4px 2px",color:isSat?"#c084fc":isSun?"#f87171":"#94a3b8",fontSize:10,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid var(--border-panel)",textAlign:"center",minWidth:22,background:isSat?"rgba(192,132,252,0.1)":isSun?"rgba(248,113,113,0.1)":wi%2===0?"rgba(255,255,255,0.02)":"transparent"}}>{d}</th>`;
    lines[5781] = `                  )`;
    lines[5782] = `                })`;
    // Delete old lines 5777-5778
    lines.splice(5783, 2);
}

// PilotHrsTab td replacement at line 5820 (which is now shifted by 5 lines because we added 8 lines and removed 3, diff = +5, so 5825)
// Let's just find it by searching from line 5800.
let tdLineIdx = -1;
for(let i=5800; i<5850; i++) {
    if (lines[i].includes('const dh = dailyHrs[d];')) {
        tdLineIdx = i;
        break;
    }
}
if (tdLineIdx !== -1) {
    // lines[tdLineIdx] is `const dh = dailyHrs[d];`
    lines.splice(tdLineIdx + 1, 0, 
        `                      const dow = new Date(year, month, d).getDay();`,
        `                      const isSat = dow === 6;`,
        `                      const isSun = dow === 0;`
    );
    // Now tdLineIdx + 4 is the return statement.
    // tdLineIdx + 5 is the <td key={d} ...>
    if (lines[tdLineIdx + 5].includes('<td key={d}')) {
        lines[tdLineIdx + 5] = `                        <td key={d} style={{padding:"4px 2px",textAlign:"center",color:dh>0?"#38bdf8":isSat?"#c084fc":isSun?"#f87171":"#475569",fontSize:12,fontWeight:dh>0?800:400,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",background:isSat?"rgba(192,132,252,0.05)":isSun?"rgba(248,113,113,0.05)":wi%2===0?"rgba(255,255,255,0.01)":"transparent"}}>`;
    }
}

// PilotHrsTab exceljs replacement
let exLineIdx = -1;
for(let i=5700; i<5800; i++) {
    if (lines[i].includes('const buf = await wb.xlsx.writeBuffer();')) {
        exLineIdx = i;
        break;
    }
}
if (exLineIdx !== -1) {
    lines.splice(exLineIdx, 0,
        `    const daysInMonth = new Date(year, month + 1, 0).getDate();`,
        `    for (let cIdx = 4; cIdx <= 3 + daysInMonth; cIdx++) {`,
        `        const dStr = ws.getCell(2, cIdx).value;`,
        `        const d = parseInt(dStr);`,
        `        if (!isNaN(d)) {`,
        `            const dow = new Date(year, month, d).getDay();`,
        `            let bgColor = null;`,
        `            let fontColor = null;`,
        `            if (dow === 6) { // Sat`,
        `                bgColor = 'FFE8D4FF';`,
        `                fontColor = 'FF8A2BE2';`,
        `            } else if (dow === 0) { // Sun`,
        `                bgColor = 'FFFFD4D4';`,
        `                fontColor = 'FFFF0000';`,
        `            }`,
        `            if (bgColor) {`,
        `                for (let rIdx = 2; rIdx <= ws.rowCount; rIdx++) {`,
        `                    const wsCell = ws.getCell(rIdx, cIdx);`,
        `                    if (rIdx === 2) {`,
        `                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };`,
        `                        wsCell.font = { name: 'TH SarabunPSK', size: 16, bold: true, color: { argb: fontColor } };`,
        `                    } else if (wsCell.value && wsCell.value !== '.' && wsCell.value !== '-') {`,
        `                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };`,
        `                        wsCell.font = { name: 'TH SarabunPSK', size: 16, bold: true, color: { argb: 'FF000000' } };`,
        `                    } else {`,
        `                        wsCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };`,
        `                        wsCell.font = { name: 'TH SarabunPSK', size: 16, color: { argb: fontColor } };`,
        `                    }`,
        `                }`,
        `            }`,
        `        }`,
        `    }`
    );
}

fs.writeFileSync('src/squadron-dashboard.tsx', lines.join('\n'));
console.log('Successfully injected code via absolute line matching');
