const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

c = c.replace('import * as XLSX from "xlsx";', 'import XLSX from "xlsx-js-style";');

const oldOnClick = 'const wb = XLSX.utils.table_to_book(table); XLSX.writeFile(wb, `PilotHrs_${acType}_${month+1}_${year}.xlsx`);';

const newOnClick = `
              const wb = XLSX.utils.table_to_book(table, {raw:true});
              const ws = wb.Sheets[wb.SheetNames[0]];
              
              // Set column widths
              const wscols = [{wch: 5}, {wch: 25}, {wch: 8}];
              for(let i=0; i<31; i++) wscols.push({wch: 4});
              wscols.push({wch: 10});
              ws['!cols'] = wscols;

              // Apply styles to all cells
              const range = XLSX.utils.decode_range(ws['!ref']);
              for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                  const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
                  if (!ws[cellAddress]) continue;
                  
                  const isHeader = R < 2;
                  
                  ws[cellAddress].s = {
                    font: { name: 'TH SarabunPSK', sz: 16, bold: isHeader },
                    alignment: { vertical: 'center', horizontal: C === 1 && !isHeader ? 'left' : 'center' },
                    border: {
                      top: { style: 'thin', color: {rgb:"000000"} },
                      bottom: { style: 'thin', color: {rgb:"000000"} },
                      left: { style: 'thin', color: {rgb:"000000"} },
                      right: { style: 'thin', color: {rgb:"000000"} }
                    },
                    fill: isHeader ? { fgColor: {rgb: "D9E1F2"} } : undefined
                  };
                }
              }

              XLSX.writeFile(wb, \`PilotHrs_\${acType}_\${month+1}_\${year}.xlsx\`);
`;

c = c.replace(oldOnClick, newOnClick);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Added styles to export');
