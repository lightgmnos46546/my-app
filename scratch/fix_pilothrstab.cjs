const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// 1. Fix the `then(([pfRows, pA, pB]) => {` to actually save pilots.
const oldLoad = `    Promise.all([
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
      
      setReady(true);
    }).catch(console.error);`;

const newLoad = `    Promise.all([
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
      
      const parsePilotData = (type, rows) => {
        if(rows.length < 2) return [];
        const headers = rows[0];
        return rows.slice(1).map(r => ({
          acType: type,
          headers: headers,
          rawRow: r,
          rank: r[0]||"",
          name: r[1]||"",
          callsign: r[2]||"",
          initial: r[3]||"",
          baseHrsFallback: r[4]||"0"
        }));
      };
      
      setPilots([...parsePilotData("S-92A", pA), ...parsePilotData("S-70i", pB)]);
      setReady(true);
    }).catch(console.error);`;

c = c.replace(oldLoad, newLoad);

// 2. Fix the missing renderGridTable
const oldJSX = `      <div className="glass-panel">
        <div style={{padding:"15px 20px",borderBottom:"1px solid var(--border-panel)",fontWeight:800,fontSize:16}}>
          {view === "hours-92a" ? "📊 สรุปชั่วโมงบิน S-92A" : "📊 สรุปชั่วโมงบิน S-70i"}
        </div>
        <div style={{padding:20}}>
          
        </div>
      </div>`;

const newJSX = `      <div className="glass-panel">
        <div style={{padding:"15px 20px",borderBottom:"1px solid var(--border-panel)",fontWeight:800,fontSize:16}}>
          {view === "hours-92a" ? "📊 สรุปชั่วโมงบิน S-92A" : "📊 สรุปชั่วโมงบิน S-70i"}
        </div>
        <div style={{padding:20}}>
          {view === "hours-92a" 
            ? renderGridTable("S-92A", pilots.filter(p => p.acType === "S-92A"))
            : renderGridTable("S-70i", pilots.filter(p => p.acType === "S-70i"))
          }
        </div>
      </div>`;

c = c.replace(oldJSX, newJSX);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Fixed PilotHrsTab successfully');
