const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// 1. Add import XLSX if not present
if (!c.includes('import * as XLSX')) {
  const lines = c.split('\\n');
  lines.splice(2, 0, 'import * as XLSX from "xlsx";');
  c = lines.join('\\n');
}

// 2. Replace weeks logic in PilotHrsTab
c = c.replace(/const weeks = \[\s*\{\s*label: "Week 1", days: \[1,2,3,4,5,6,7\] \},\s*\{\s*label: "Week 2", days: \[8,9,10,11,12,13,14\] \},\s*\{\s*label: "Week 3", days: \[15,16,17,18,19,20,21\] \},\s*\{\s*label: "Week 4", days: \[22,23,24,25,26,27,28\] \},\s*\];\s*if \(daysInMonth > 28\) \{\s*const w5 = \[\];\s*for\(let d=29; d<=daysInMonth; d\+\+\) w5\.push\(d\);\s*weeks\.push\(\{\s*label: "Week 5", days: w5 \}\);\s*\}/g, 
`const weeks = [];
    let currentWeekDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      currentWeekDays.push(d);
      const dayOfWeek = new Date(year, month, d).getDay();
      if (dayOfWeek === 0 || d === daysInMonth) {
        weeks.push({ label: \`Week \${weeks.length + 1}\`, days: currentWeekDays });
        currentWeekDays = [];
      }
    }`);

// 3. Add Export to Excel button
const oldHeader = `<div style={{padding:"10px 15px",background:"var(--bg-accent)",borderBottom:"1px solid var(--border-panel)",fontWeight:800,color:acType==="S-92A"?"#a5b4fc":"#6ee7b7",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>✈️</span> {acType} (จำนวนนักบิน {typePilots.length} นาย)
        </div>`;

const newHeader = `<div style={{padding:"10px 15px",background:"var(--bg-accent)",borderBottom:"1px solid var(--border-panel)",fontWeight:800,color:acType==="S-92A"?"#a5b4fc":"#6ee7b7",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div><span style={{fontSize:18}}>✈️</span> {acType} (จำนวนนักบิน {typePilots.length} นาย)</div>
          <button onClick={(e)=>{
            const table = e.currentTarget.closest("div").nextSibling;
            const wb = XLSX.utils.table_to_book(table);
            XLSX.writeFile(wb, \`PilotHrs_\${acType}_\${month+1}_\${year}.xlsx\`);
          }} style={{padding:"6px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>📥 Export Excel</button>
        </div>`;

c = c.replace(oldHeader, newHeader);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Features added');
