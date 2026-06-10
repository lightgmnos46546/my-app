const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

c = c.replace(/<table style=\{\{width:"100%",borderCollapse:"collapse",minWidth:1200\}\}>/g, '<table id={"pilot-hrs-table-" + acType} style={{width:"100%",borderCollapse:"collapse",minWidth:1200}}>');

c = c.replace(/onClick=\{\(e\)=>\{const table = e\.currentTarget\.closest\("div"\)\.nextSibling; const wb = XLSX\.utils\.table_to_book\(table\); XLSX\.writeFile\(wb, `PilotHrs_\$\{acType\}_\$\{month\+1\}_\$\{year\}\.xlsx`\);\}\}/g, 
'onClick={()=>{try{const table = document.getElementById("pilot-hrs-table-" + acType); const wb = XLSX.utils.table_to_book(table); XLSX.writeFile(wb, `PilotHrs_${acType}_${month+1}_${year}.xlsx`);}catch(err){alert("Export Failed: " + err.message);}}}');

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Fixed export button');
