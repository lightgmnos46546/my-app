const fs = require('fs');

let code = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// 1. Remove the 800ms delay in processQueue to speed up sequential fetches globally
code = code.replace(
  /await new Promise\(r => setTimeout\(r, 800\)\);/g,
  '// Removed artificial delay for faster loading'
);

// 2. Add 'Pilot Hrs' to NAV_ITEMS
if (!code.includes('{ id: "pilot-hrs", icon: "⏱️", label: "Pilot Hrs" }')) {
  code = code.replace(
    /\{ id: "post-flight", icon: "📝", label: "Post Flight" \},/,
    '{ id: "post-flight", icon: "📝", label: "Post Flight" },\n    { id: "pilot-hrs", icon: "⏱️", label: "Pilot Hrs" },'
  );
}

// 3. Add to renderContent switch
if (!code.includes('case "pilot-hrs":')) {
  code = code.replace(
    /case "post-flight":\s*return <PostFlightTab \/>;/,
    'case "post-flight": return <PostFlightTab />;\n      case "pilot-hrs": return <PilotHrsTab />;'
  );
}

// 4. Create PilotHrsTab (We will extract the pilot logic from PostFlightTab)
const pilotHrsTabCode = `
function PilotHrsTab() {
  const [logs, setLogs] = useCachedState<any[]>("tab_logs_new", []);
  const [pilots, setPilots] = useCachedState<any[]>("tab_pilots_pf", []);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("hours-92a");
  const [viewDate, setViewDate] = useState(new Date());

  const parseDateStrHelper = (s) => {
    if (!s) return null;
    const clean = s.replace(/^[ก-๙a-zA-Z\\s]+,\\s*/, "").trim();
    const p = clean.split(/\\s+/);
    if (p.length < 2) return null;
    const d = parseInt(p[0]);
    const m = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].findIndex(x=>x.toLowerCase()===p[1].toLowerCase());
    if (isNaN(d)||m<0) return null;
    const y = p[2] ? parseInt(p[2]) : new Date().getFullYear();
    return new Date(y, m, d);
  };

  useEffect(() => {
    Promise.all([
      loadFromSheet("POST FLIGHT LOGS"),
      loadFromSheet("PILOTS S-92A FOR DATA"),
      loadFromSheet("PILOTS S-70i FOR DATA")
    ]).then(([pfRows, pA, pB]) => {
      if(pfRows.length > 1) {
        const fmtTime = (t) => {
          if(!t) return "";
          if(typeof t === 'string' && t.includes("T") && t.endsWith("Z")) return t.split("T")[1].substring(0,5);
          return t;
        };
        setLogs(pfRows.slice(1).map(r=>({
          day: r[0]||"", date: r[1]||"", type: r[2]||"", mission: r[3]||"",
          ac: r[4]||"", cs: r[5]||"", pilot: r[6]||"", copilot: r[7]||"",
          to: fmtTime(r[8]), ld: fmtTime(r[9]), hrs: r[10]||"", discrepancy: r[11]||""
        })));
      }
      const parsePilotForPostFlight = (rows, type) => {
        if (rows.length <= 1) return [];
        const headers = rows[0];
        return rows.slice(1).map(r => ({
          acType: type, rank: r[0]||"", name: r[1]||"", callsign: r[3]||"", initial: r[3]||"",
          baseHrsFallback: r[15]||"0", rawRow: r, headers: headers
        })).filter(p => p.name.trim() !== "");
      };
      setPilots([...parsePilotForPostFlight(pA, "S-92A"), ...parsePilotForPostFlight(pB, "S-70i")]);
      setReady(true);
    }).catch(console.error);
  }, []);

  if(!ready) return <div style={{textAlign:"center",padding:50,color:"var(--text-secondary)"}}>กำลังโหลดข้อมูล...</div>;

  const getBaseHrsForViewDate = (pilot, vDate) => {
    const monthNames = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    let checkDate = new Date(vDate.getFullYear(), vDate.getMonth() - 1, 1);
    for (let i = 0; i < 24; i++) {
      const targetHeader = \`TOTAL \${monthNames[checkDate.getMonth()]} \${checkDate.getFullYear()}\`;
      const hIdx = pilot.headers.findIndex(h => h === targetHeader);
      if (hIdx !== -1) return parseFloat(pilot.rawRow[hIdx]) || 0;
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth() - 1, 1);
    }
    return parseFloat(pilot.baseHrsFallback) || 0;
  };

  const renderGridTable = (acType, typePilots) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [
      { label: "Week 1", days: [1,2,3,4,5,6,7] },
      { label: "Week 2", days: [8,9,10,11,12,13,14] },
      { label: "Week 3", days: [15,16,17,18,19,20,21] },
      { label: "Week 4", days: [22,23,24,25,26,27,28] },
    ];
    if (daysInMonth > 28) {
      const w5 = [];
      for(let d=29; d<=daysInMonth; d++) w5.push(d);
      weeks.push({ label: "Week 5", days: w5 });
    }

    return (
      <div style={{overflowX:"auto",background:"#0f172a",borderRadius:12,border:"1px solid var(--border-panel)",paddingBottom:10,marginBottom:30}}>
        <div style={{padding:"10px 15px",background:"var(--bg-accent)",borderBottom:"1px solid var(--border-panel)",fontWeight:800,color:acType==="S-92A"?"#a5b4fc":"#6ee7b7",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>✈️</span> {acType} (จำนวนนักบิน {typePilots.length} นาย)
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:1200}}>
          <thead>
            <tr style={{background:"var(--bg-panel)"}}>
              <th rowSpan={2} style={{padding:"8px",color:"var(--text-secondary)",fontSize:12,borderRight:"1px solid var(--border-panel)",borderBottom:"1px solid var(--border-panel)"}}>ลำดับ</th>
              <th rowSpan={2} style={{padding:"8px",color:"var(--text-secondary)",fontSize:12,borderRight:"1px solid var(--border-panel)",borderBottom:"1px solid var(--border-panel)",textAlign:"left"}}>ยศ - ชื่อ - นามสกุล</th>
              <th rowSpan={2} style={{padding:"8px",color:"var(--text-secondary)",fontSize:12,borderRight:"1px solid #334155",borderBottom:"1px solid var(--border-panel)"}}>ณ ต้นเดือน</th>
              {weeks.map((w,i) => (
                <th key={i} colSpan={w.days.length} style={{padding:"4px",color:"var(--text-secondary)",fontSize:11,borderRight:i<weeks.length-1?"1px solid #334155":"1px solid var(--border-panel)",borderBottom:"1px solid var(--border-panel)",textAlign:"center",background:i%2===0?"rgba(255,255,255,0.02)":"transparent"}}>{w.label}</th>
              ))}
              <th rowSpan={2} style={{padding:"8px",color:"#fbbf24",fontSize:12,borderBottom:"1px solid var(--border-panel)",borderLeft:"1px solid var(--border-panel)"}}>ยอดบินรวม</th>
            </tr>
            <tr style={{background:"var(--bg-panel)"}}>
              {weeks.map((w,wi) => (
                w.days.map((d,di) => (
                  <th key={d} style={{padding:"4px 2px",color:"#94a3b8",fontSize:10,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",borderBottom:"1px solid var(--border-panel)",textAlign:"center",minWidth:22,background:wi%2===0?"rgba(255,255,255,0.02)":"transparent"}}>{d}</th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {typePilots.map((p,i) => {
              const baseHrs = getBaseHrsForViewDate(p, viewDate);
              const pilotLogs = logs.filter(l => {
                if(!l.date) return false;
                const pd = parseDateStrHelper(l.date);
                if(!pd) return false;
                if(pd.getFullYear() !== year || pd.getMonth() !== month) return false;
                if (l.type !== acType) return false;
                const checkMatch = (str) => {
                  if(!str) return false;
                  const s = str.toUpperCase();
                  if (p.callsign && s.includes(p.callsign.toUpperCase())) return true;
                  if (p.initial && s.includes(p.initial.toUpperCase())) return true;
                  if (p.name && s.includes(p.name.toUpperCase())) return true;
                  return false;
                };
                return checkMatch(l.pilot) || checkMatch(l.copilot);
              });

              const dailyHrs = {};
              pilotLogs.forEach(l => {
                const pd = parseDateStrHelper(l.date);
                if(pd) {
                  const d = pd.getDate();
                  dailyHrs[d] = (dailyHrs[d] || 0) + (parseFloat(l.hrs)||0);
                }
              });

              const monthTotal = pilotLogs.reduce((s,l)=>s+(parseFloat(l.hrs)||0), 0);
              const grandTotal = baseHrs + monthTotal;

              return (
                <tr key={i} style={{borderBottom:"1px solid var(--border-panel)"}}>
                  <td style={{padding:"8px",textAlign:"center",color:"var(--text-secondary)",borderRight:"1px solid var(--border-panel)",fontSize:12}}>{i+1}</td>
                  <td style={{padding:"8px",color:"#f8fafc",borderRight:"1px solid var(--border-panel)",fontWeight:600,fontSize:13}}>{p.rank} {p.name} <span style={{color:"var(--text-secondary)",fontSize:11,marginLeft:5}}>({p.callsign})</span></td>
                  <td style={{padding:"8px",textAlign:"center",color:"#94a3b8",borderRight:"1px solid #334155",fontWeight:700,fontSize:13}}>{baseHrs>0?baseHrs.toFixed(1):"-"}</td>
                  {weeks.map((w,wi) => (
                    w.days.map((d,di) => {
                      const dh = dailyHrs[d];
                      return (
                        <td key={d} style={{padding:"4px 2px",textAlign:"center",color:dh>0?"#38bdf8":"#475569",fontSize:12,fontWeight:dh>0?800:400,borderRight:(di===w.days.length-1 && wi!==weeks.length-1)?"1px solid #334155":"1px solid rgba(255,255,255,0.05)",background:wi%2===0?"rgba(255,255,255,0.01)":"transparent"}}>
                          {dh > 0 ? dh.toFixed(1) : "."}
                        </td>
                      );
                    })
                  ))}
                  <td style={{padding:"8px",textAlign:"center",color:grandTotal>0?"#fbbf24":"var(--text-secondary)",fontWeight:800,fontSize:14,borderLeft:"1px solid var(--border-panel)"}}>{grandTotal>0?grandTotal.toFixed(1):"-"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",gap:10,background:"var(--bg-panel)",padding:5,borderRadius:10,width:"fit-content"}}>
        <button onClick={()=>setView("hours-92a")} style={{padding:"8px 20px",borderRadius:8,background:view==="hours-92a"?"#8b5cf6":"transparent",color:view==="hours-92a"?"#fff":"var(--text-secondary)",border:"none",cursor:"pointer",fontWeight:700}}>สรุปชั่วโมงบิน S-92A</button>
        <button onClick={()=>setView("hours-70i")} style={{padding:"8px 20px",borderRadius:8,background:view==="hours-70i"?"#8b5cf6":"transparent",color:view==="hours-70i"?"#fff":"var(--text-secondary)",border:"none",cursor:"pointer",fontWeight:700}}>สรุปชั่วโมงบิน S-70i</button>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:15,background:"var(--bg-panel)",padding:"10px 20px",borderRadius:12}}>
        <div style={{fontWeight:800,color:"var(--text-primary)"}}>ดูข้อมูลของเดือน:</div>
        <button onClick={()=>{const nd=new Date(viewDate);nd.setMonth(nd.getMonth()-1);setViewDate(nd)}} style={{padding:"6px 12px",borderRadius:6,border:"1px solid var(--border-panel)",background:"transparent",color:"var(--text-primary)",cursor:"pointer"}}>◀</button>
        <div style={{fontWeight:800,fontSize:16,color:"#fbbf24",minWidth:120,textAlign:"center"}}>{MONTH_EN[viewDate.getMonth()]} {viewDate.getFullYear()}</div>
        <button onClick={()=>{const nd=new Date(viewDate);nd.setMonth(nd.getMonth()+1);setViewDate(nd)}} style={{padding:"6px 12px",borderRadius:6,border:"1px solid var(--border-panel)",background:"transparent",color:"var(--text-primary)",cursor:"pointer"}}>▶</button>
      </div>

      <div className="glass-panel">
        <div style={{padding:"15px 20px",borderBottom:"1px solid var(--border-panel)",fontWeight:800,fontSize:16}}>
          {view === "hours-92a" ? "📊 สรุปชั่วโมงบิน S-92A" : "📊 สรุปชั่วโมงบิน S-70i"}
        </div>
        <div style={{padding:20}}>
          {view === "hours-92a" && renderGridTable("S-92A", pilots.filter(p=>p.acType==="S-92A"))}
          {view === "hours-70i" && renderGridTable("S-70i", pilots.filter(p=>p.acType==="S-70i"))}
        </div>
      </div>
    </div>
  );
}
`;

if (!code.includes('function PilotHrsTab()')) {
  code += '\n\n' + pilotHrsTabCode;
}

// 5. Simplify PostFlightTab logic to ONLY load POST FLIGHT LOGS
// We replace the Promise.all section in PostFlightTab.
const originalPromiseAll = 'Promise.all([\n      loadFromSheet("POST FLIGHT LOGS"),\n      loadFromSheet("PILOTS S-92A FOR DATA"),\n      loadFromSheet("PILOTS S-70i FOR DATA")\n    ]).then(([pfRows, pA, pB]) => {';
const newPromise = 'loadFromSheet("POST FLIGHT LOGS").then(pfRows => {';

code = code.replace(
  /Promise\.all\(\[\s*loadFromSheet\("POST FLIGHT LOGS"\),\s*loadFromSheet\("PILOTS S-92A FOR DATA"\),\s*loadFromSheet\("PILOTS S-70i FOR DATA"\)\s*\]\)\.then\(\(\[pfRows, pA, pB\]\) => \{/,
  newPromise
);

// Remove the pilot parsing part from PostFlightTab
code = code.replace(
  /const parsePilotForPostFlight = \([\s\S]*?setPilots\(\[\.\.\.parsePilotForPostFlight\(pA, "S-92A"\), \.\.\.parsePilotForPostFlight\(pB, "S-70i"\)\]\);/g,
  ''
);

// 6. Remove view toggle buttons from PostFlightTab
code = code.replace(
  /<div style={{display:"flex",gap:10,background:"var\(--bg-panel\)",padding:5,borderRadius:10,width:"fit-content"}}>[\s\S]*?<\/div>/g,
  (match) => {
    if (match.includes('สรุปชั่วโมงบินรายเดือน(S-70i)')) {
      return ''; // Remove the toggle div entirely in PostFlightTab
    }
    return match;
  }
);

// 7. Remove the monthly pilot tables rendering code from PostFlightTab
code = code.replace(
  /\{view === "hours-92a" && renderGridTable\("S-92A", pilots\.filter\(p=>p\.acType==="S-92A"\)\)\}[\s\S]*?\{view === "hours-70i" && renderGridTable\("S-70i", pilots\.filter\(p=>p\.acType==="S-70i"\)\)\}/g,
  ''
);

// 8. Remove the \`if (view === "log")\` wrapper since it's always log
code = code.replace(
  /\{view === "log" && \(\s*(<div className="glass-panel">[\s\S]*?<\/div>)\s*\)\}/g,
  '$1'
);

fs.writeFileSync('src/squadron-dashboard.tsx', code);
console.log('Split completed successfully');
