const fs = require('fs');
const content = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

const targetStr = 'const [viewDate, setViewDate] = useState(new Date());\\n  const [expandedRow, setExpandedRow] = useState<number|null>(null);';
const replacement = 'const [viewDate, setViewDate] = useState(new Date());\n  const [expandedRow, setExpandedRow] = useState<number|null>(null);';

const newContent = content.replace(targetStr, replacement);
fs.writeFileSync('src/squadron-dashboard.tsx', newContent);
console.log('Fixed syntax error');
