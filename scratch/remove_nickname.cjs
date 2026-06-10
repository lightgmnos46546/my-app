const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// Target string in PilotHrsTab:
const targetTd = '<td style={{padding:"8px",color:"#f8fafc",borderRight:"1px solid var(--border-panel)",fontWeight:600,fontSize:13}}>{p.rank} {p.name}</td>';

// We want to add the helper before the map, but it's easier to just do it inline
const replaceTd = '<td style={{padding:"8px",color:"#f8fafc",borderRight:"1px solid var(--border-panel)",fontWeight:600,fontSize:13}}>{p.rank} {p.name ? p.name.replace(/\\s*\\(.*?\\)\\s*/g, "").trim() : ""}</td>';

if (c.includes(targetTd)) {
    c = c.replace(targetTd, replaceTd);
    // There are 2 instances (S-92A and S-70i if they are duplicated, but wait... PilotHrsTab just loops over `typePilots.map((p,i) => ...`) 
    // Wait, no, there is only ONE loop inside `renderGridTable`!
    c = c.replace(targetTd, replaceTd); // replacing the exact line inside PilotHrsTab -> renderGridTable
    fs.writeFileSync('src/squadron-dashboard.tsx', c);
    console.log("Successfully removed nicknames from PilotHrsTab");
} else {
    throw new Error("Target TD not found!");
}
