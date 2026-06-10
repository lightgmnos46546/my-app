const fs = require('fs');
let c = fs.readFileSync('src/squadron-dashboard.tsx', 'utf8');

c = c.replace(
  '{id:"postflight",l:"📑 POST FLIGHT"},',
  '{id:"postflight",l:"📑 POST FLIGHT"},\n    {id:"pilot-hrs", l:"⏱️ PILOT HRS"},'
);

c = c.replace(
  '{id:"postflight",l:"📑 Post Flight", icon:"📑"},',
  '{id:"postflight",l:"📑 Post Flight", icon:"📑"},\n    {id:"pilot-hrs", l:"⏱️ Pilot Hrs", icon:"⏱️"},'
);

c = c.replace(
  '{tab==="postflight"&&<PostFlightTab/>}',
  '{tab==="postflight"&&<PostFlightTab/>}\n        {tab==="pilot-hrs"&&<PilotHrsTab/>}'
);

fs.writeFileSync('src/squadron-dashboard.tsx', c);
console.log('Fixed navigation menus');
