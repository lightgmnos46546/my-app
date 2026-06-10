const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

const target1 = '<div style={{padding:"10px 15px",background:"var(--bg-accent)",borderBottom:"1px solid var(--border-panel)",fontWeight:800,color:acType==="S-92A"?"#a5b4fc":"#6ee7b7",display:"flex",alignItems:"center",gap:10}}>';
const replace1 = '<div style={{padding:"10px 15px",background:"var(--bg-accent)",borderBottom:"1px solid var(--border-panel)",fontWeight:800,color:acType==="S-92A"?"#a5b4fc":"#6ee7b7",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>';

const target2 = '<span style={{fontSize:18}}>✈️</span> {acType} (จำนวนนักบิน {typePilots.length} นาย)';
const replace2 = '<div><span style={{fontSize:18}}>✈️</span> {acType} (จำนวนนักบิน {typePilots.length} นาย)</div>\\n          <button onClick={(e)=>{const table = e.currentTarget.closest("div").nextSibling; const wb = XLSX.utils.table_to_book(table); XLSX.writeFile(wb, `PilotHrs_${acType}_${month+1}_${year}.xlsx`);}} style={{padding:"6px 12px",borderRadius:6,border:"none",background:"#10b981",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13}}>📥 Export Excel</button>';

if (c.includes(target1) && c.includes(target2)) {
  c = c.replace(target1, replace1).replace(target2, replace2);
  fs.writeFileSync('src/squadron-dashboard.tsx', c);
  console.log("Successfully replaced");
} else {
  console.log("Target strings not found");
}
