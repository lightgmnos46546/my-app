const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

if (!c.includes('const [expandedRow, setExpandedRow]')) {
    c = c.replace(
        'const [viewDate, setViewDate] = useState(new Date());',
        'const [viewDate, setViewDate] = useState(new Date());\n  const [expandedRow, setExpandedRow] = useState<number|null>(null);'
    );
}

const oldTable = `<div className="glass-panel">
          <div style={{padding:"15px 20px",borderBottom:"1px solid var(--border-panel)",fontWeight:800,fontSize:16}}>📝 บันทึกชั่วโมงบินรายวัน (POST Flight Log)</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"var(--bg-accent)"}}>
                  {["DAY","DATE","TYPE","MISSION","A/C","C/S","PILOT","CO-PILOT","T/O","L/D","ชม.บิน","ข้อขัดข้อง","จัดการ"].map(h=><th key={h} style={{padding:"12px 15px",color:"var(--text-secondary)",fontSize:12,textAlign:"center",whiteSpace:"nowrap"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.length===0&&<tr><td colSpan={13} style={{textAlign:"center",padding:30,color:"var(--text-secondary)"}}>ยังไม่มีข้อมูล Post Flight</td></tr>}
                {logs.map((l,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid var(--border-panel)"}}>
                    <td style={{padding:"12px 15px",color:"#fbbf24",fontWeight:700}}>{l.day}</td>
                    <td style={{padding:"12px 15px",fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>{l.date}</td>
                    <td style={{padding:"12px 15px"}}><span style={{background:l.type==="S-92A"?"#312e81":"#064e3b",color:l.type==="S-92A"?"#a5b4fc":"#6ee7b7",padding:"2px 8px",borderRadius:4,fontSize:12,fontWeight:700}}>{l.type}</span></td>
                    <td style={{padding:"12px 15px",color:"var(--text-secondary)"}}>{l.mission}</td>
                    <td style={{padding:"12px 15px",fontWeight:800,color:"#cbd5e1"}}>{l.ac}</td>
                    <td style={{padding:"12px 15px",fontWeight:800,color:"#f8fafc"}}>{l.cs}</td>
                    <td style={{padding:"12px 15px",fontWeight:700,color:"#60a5fa"}}>{l.pilot}</td>
                    <td style={{padding:"12px 15px",fontWeight:700,color:"#94a3b8"}}>{l.copilot}</td>
                    <td style={{padding:"12px 15px",fontFamily:"monospace"}}>{l.to}</td>
                    <td style={{padding:"12px 15px",fontFamily:"monospace"}}>{l.ld}</td>
                    <td style={{padding:"12px 15px",fontWeight:800,color:"#fff",fontSize:16}}>{l.hrs}</td>
                    <td style={{padding:"12px 15px",color:"#f87171",fontSize:13}}>{l.discrepancy}</td>
                    <td style={{padding:"12px 15px",textAlign:"center",whiteSpace:"nowrap"}}>
                      <button onClick={()=>setEditFlight({log:l, idx:i})} style={{padding:"4px 8px",background:"#3b82f6",color:"#fff",border:"none",borderRadius:4,marginRight:5,cursor:"pointer",fontWeight:700,fontSize:12}}>✏️ แก้ไข</button>
                      <button onClick={()=>handleDeleteLog(i)} style={{padding:"4px 8px",background:"#ef4444",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:700,fontSize:12}}>🗑️ ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>`;

const newTable = `
      <div className="table-container">
          <div style={{padding:"15px 20px",borderBottom:"1px solid var(--border-panel)",fontWeight:800,fontSize:16,background:"var(--bg-card)"}}>📝 บันทึกชั่วโมงบินรายวัน (POST Flight Log)</div>
          <div className="scrollbar-free-table-wrapper" style={{overflowX:"auto"}}>
            <table className="scrollbar-free-table" style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
              <thead>
                <tr style={{background:"var(--bg-card)"}}>
                  <th style={{padding:0,width:0,border:"none"}}></th>
                  {["DAY","DATE","TYPE","MISSION","A/C","C/S","PILOT","CO-PILOT","T/O","L/D","ชม.บิน","ข้อขัดข้อง"].map(h=><th key={h} style={{padding:"8px 5px",color:"var(--text-primary)",fontWeight:800,fontSize:14,textAlign:"center",borderRight:"1px solid var(--border-panel)",overflow:"hidden",whiteSpace:"nowrap"}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {logs.length===0&&<tr><td colSpan={13} style={{textAlign:"center",padding:40,color:"var(--text-secondary)",fontSize:16}}>ยังไม่มีข้อมูล Post Flight</td></tr>}
                {logs.map((l,i)=>{
                  const isExpanded = expandedRow === i;
                  const rowBg = isExpanded ? "var(--row-bg-expanded)" : i % 2 === 0 ? "transparent" : "var(--row-bg-even)";
                  const dc = l.day === "SAT" || l.day === "SUN" ? "#ef4444" : "#3b82f6";
                  const sf = "'Sarabun','IBM Plex Sans Thai',sans-serif";
                  
                  return (
                    <Fragment key={i}>
                      <tr onClick={()=>setExpandedRow(isExpanded?null:i)} style={{height:56, borderBottom:isExpanded?"none":"1px solid var(--border-panel)",background:rowBg,cursor:"pointer",transition:"background 0.15s",fontFamily:sf,fontWeight:500}}>
                        <td style={{padding:0,width:0,border:"none"}}></td>
                        <td style={{padding:"8px 5px",textAlign:"center"}}><span style={{background:dc,color:"#fff",fontWeight:800,fontSize:13,padding:"2px 6px",borderRadius:5}}>{l.day}</span></td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",whiteSpace:"nowrap"}}>{l.date ? l.date.split(" ").slice(0, 2).join(" ") : ""}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",whiteSpace:"nowrap"}}>
                          <span style={{background:l.type==="S-92A"?"rgba(16,185,129,0.15)":"rgba(56,189,248,0.15)",color:l.type==="S-92A"?"#10b981":"#38bdf8",fontWeight:700,fontSize:13,padding:"1px 6px",borderRadius:5}}>{l.type||"—"}</span>
                        </td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)"}}>{l.mission}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)"}}>{l.ac}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)"}}>{l.cs}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",fontWeight:800,whiteSpace:"nowrap"}}>{l.pilot}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",whiteSpace:"nowrap"}}>{l.copilot}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"#06b6d4",fontFamily:"monospace",fontWeight:800}}>{l.to}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"#a78bfa",fontFamily:"monospace",fontWeight:800}}>{l.ld}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",fontWeight:800,fontSize:16}}>{l.hrs}</td>
                        <td style={{padding:"8px 5px",textAlign:"center",color:"#f87171"}}>{l.discrepancy}</td>
                      </tr>
                      {isExpanded&&(
                        <tr className="expand-row" style={{background:"var(--expand-panel-bg)",borderBottom:"2px solid #7c3aed"}}>
                          <td colSpan={13} style={{padding:"12px 20px"}}>
                            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                              <span style={{fontSize:14,fontWeight:800,color:"var(--text-primary)",marginRight:5}}>จัดการ Post Flight</span>
                              <button onClick={(e)=>{e.stopPropagation();setEditFlight({log:l, idx:i});setExpandedRow(null);}} style={{padding:"6px 15px",fontSize:14,borderRadius:8,border:"1px solid #3b82f6",background:"#eff6ff",color:"#2563eb",cursor:"pointer",fontWeight:700}}>✏️ แก้ไข</button>
                              <button onClick={(e)=>{e.stopPropagation();handleDeleteLog(i);}} style={{padding:"6px 15px",fontSize:14,borderRadius:8,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer",fontWeight:700}}>🗑 ลบ</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>`;

c = c.replace(oldTable, newTable);
fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('PostFlightTab styling updated.');
