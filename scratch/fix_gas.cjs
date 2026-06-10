const fs = require('fs');
const path = require('path');
const tabsDir = 'src/tabs';

fs.readdirSync(tabsDir).forEach(f => {
  if (!f.endsWith('.tsx')) return;
  const p = path.join(tabsDir, f);
  let code = fs.readFileSync(p, 'utf8');
  if (!code.includes('loadFromSheet')) {
    code = 'import { saveToSheet, loadFromSheet, GAS_URL } from "../api/gas";\n' + code;
    fs.writeFileSync(p, code);
    console.log('Fixed gas imports in', p);
  }
});
