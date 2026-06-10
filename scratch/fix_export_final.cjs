const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

const lines = c.split('\\n');
const idx = lines.findIndex(l => l.includes('<span style={{fontSize:18}}>✈️</span> {acType}'));

if (idx !== -1) {
  // Update the line before to have space-between
  if (lines[idx-1].includes('gap:10')) {
    lines[idx-1] = lines[idx-1].replace('gap:10', 'justifyContent:"space-between",gap:10');
  }

  // Update the current line to add the button
  lines[idx] = '          <div><span style={{fontSize:18}}>✈️</span> {acType} (จำนวนนักบิน {typePilots.length} นาย)</div>\\n          <button onClick={(e)=>{const table = e.currentTarget.closest("div").nextSibling; const wb = XLSX.utils.table_to_book(table); XLSX.writeFile(wb, `PilotHrs_${acType}_${month+1}_${year}.xlsx`);}} style={{padding:"6px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>📥 Export Excel</button>';

  fs.writeFileSync('src/squadron-dashboard.tsx', lines.join('\\n'));
  console.log('SUCCESS');
} else {
  console.log('NOT FOUND');
}
