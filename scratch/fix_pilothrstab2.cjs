const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

c = c.replace(/setLogs\(pfRows\.slice\(1\)\.map\(r=>\(\{\r?\n.*?\r?\n.*?\r?\n.*?\r?\n\s+\}\)\)\);\r?\n\s+\}/, (match) => {
  return match + `
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
      setPilots([...parsePilotData("S-92A", pA), ...parsePilotData("S-70i", pB)]);`;
});

c = c.replace(/<div style=\{\{padding:20\}\}>\r?\n\s+<\/div>/, `<div style={{padding:20}}>
          {view === "hours-92a" 
            ? renderGridTable("S-92A", pilots.filter(p => p.acType === "S-92A"))
            : renderGridTable("S-70i", pilots.filter(p => p.acType === "S-70i"))
          }
        </div>`);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Regex replace done');
