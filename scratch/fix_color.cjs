const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

c = c.replace(
  'const dc = l.day === "SAT" || l.day === "SUN" ? "#ef4444" : "#3b82f6";',
  'const capDay = l.day ? l.day.charAt(0).toUpperCase() + l.day.slice(1).toLowerCase() : "";\n                  const dc = DC[capDay] || DC[l.day] || "#3b82f6";'
);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Fixed day color assignment');
