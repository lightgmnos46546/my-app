const fs = require('fs');
let content = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

// Find the line that renders l.hrs in PostFlightTab
// <td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",fontWeight:800,fontSize:16}}>{l.hrs}</td>
content = content.replace(
  '<td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",fontWeight:800,fontSize:16}}>{l.hrs}</td>',
  '<td style={{padding:"8px 5px",textAlign:"center",color:"var(--text-primary)",fontWeight:800,fontSize:16}}>{l.hrs ? (!isNaN(parseFloat(l.hrs)) ? parseFloat(l.hrs).toFixed(1) : l.hrs) : ""}</td>'
);

fs.writeFileSync('src/squadron-dashboard.tsx', content);
console.log('Fixed hrs decimal format');
