import { useState, useEffect } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────
const AIRPORTS = [
  {icao:"VTBD",name:"Don Mueang",        base:"Wing 6",  region:"กลาง", branch:"ทอ."},
  {icao:"VTBL",name:"Khok Kathiam",      base:"Wing 2",  region:"กลาง", branch:"ทอ."},
  {icao:"VTPI",name:"Takhli",            base:"Wing 4",  region:"กลาง", branch:"ทอ."},
  {icao:"VTPH",name:"Hua Hin",           base:"Wing 53", region:"กลาง", branch:"ทอ."},
  {icao:"VTBU",name:"U-Tapao",           base:"RTN Wing",region:"กลาง", branch:"ทร."},
  {icao:"VTBP",name:"Sattahip NAS",      base:"RTN",     region:"กลาง", branch:"ทร."},
  {icao:"VTBH",name:"Sa Pran Nak",       base:"Army",    region:"กลาง", branch:"ทบ."},
  {icao:"VTCC",name:"Chiang Mai",        base:"Wing 41", region:"เหนือ",branch:"ทอ."},
  {icao:"VTPP",name:"Phitsanulok",       base:"Wing 46", region:"เหนือ",branch:"ทอ."},
  {icao:"VTPB",name:"Phetchabun",        base:"Wing 46", region:"เหนือ",branch:"ทอ."},
  {icao:"VTUD",name:"Udon Thani",        base:"Wing 23", region:"อีสาน",branch:"ทอ."},
  {icao:"VTUU",name:"Ubon Ratchathani",  base:"Wing 21", region:"อีสาน",branch:"ทอ."},
  {icao:"VTUQ",name:"Nakhon Ratchasima", base:"Wing 1",  region:"อีสาน",branch:"ทอ."},
  {icao:"VTUK",name:"Khon Kaen",         base:"Det.",    region:"อีสาน",branch:"ทอ."},
  {icao:"VTSS",name:"Hat Yai",           base:"Wing 56", region:"ใต้",  branch:"ทอ."},
  {icao:"VTSC",name:"Narathiwat",        base:"Wing 56", region:"ใต้",  branch:"ทอ."},
  {icao:"VTSB",name:"Surat Thani",       base:"Det.",    region:"ใต้",  branch:"ทอ."},
];

const NOTAMS = {
  VTBD:[
    {id:"A0123/26",p:"HIGH",t:"AIRSPACE",raw:"(A0123/26 NOTAMN\nQ) VTBB/QRTCA/IV/BO /AE/000/100/1355N10036E005\nA) VTBD B) 2605260600 C) 2605261800\nE) TEMPORARY RESTRICTED AREA ACTIVATED WITHIN 5NM RADIUS OF VTBD AD. FL000-FL100.\nCREATED: 26 MAY 2026 0430Z)"},
    {id:"A0115/26",p:"MED",  t:"RWY",     raw:"(A0115/26 NOTAMN\nQ) VTBB/QMRLC/IV/NBO/A /000/999/1355N10036E005\nA) VTBD B) 2605260000 C) 2605270000\nE) RWY 03/21 CLSD. THR DISPLACED 500M DUE TO PAVEMENT MAINTENANCE.\nCREATED: 25 MAY 2026 2100Z)"},
  ],
  VTBU:[{id:"B0045/26",p:"MED",t:"NAV AID",raw:"(B0045/26 NOTAMN\nQ) VTBB/QNTAS/IV/NBO/AE/000/999/1241N10100E025\nA) VTBU B) 2605250000 C) 2605300000\nE) TACAN CH88X (UTP) U/S. DO NOT USE.\nCREATED: 24 MAY 2026 1800Z)"}],
  VTCC:[{id:"C0078/26",p:"LOW",t:"OBSTACLE",raw:"(C0078/26 NOTAMN\nQ) VTBB/QOAAS/IV/NBO/AE/000/005/1846N09858E003\nA) VTCC B) 2605260700 C) 2605261200\nE) ACFT PARKED ON TWY ALPHA ADJ TO RWY 18 THR FOR MAINTENANCE CHECK.\nCREATED: 26 MAY 2026 0600Z)"}],
  VTPP:[
    {id:"D0031/26",p:"HIGH",t:"AIRSPACE",raw:"(D0031/26 NOTAMN\nQ) VTBB/QRDCA/IV/BO /AE/050/200/1647N10017E020\nA) VTPP B) 2605260800 C) 2605261600\nE) RESTRICTED AREA P-905 ACTIVE. FL050-FL200. MILITARY TACTICAL TRAINING IN PROGRESS.\nCREATED: 25 MAY 2026 2000Z)"},
    {id:"D0029/26",p:"LOW", t:"NAV AID", raw:"(D0029/26 NOTAMN\nQ) VTBB/QLAPL/IV/NBO/A /000/999/1647N10017E005\nA) VTPP B) 2605260000 C) 2605262359\nE) PAPI RWY 36 LHS U/S. VISUAL APPROACH ONLY.\nCREATED: 25 MAY 2026 1400Z)"},
  ],
  VTUD:[{id:"E0012/26",p:"MED",t:"NAV AID",raw:"(E0012/26 NOTAMN\nQ) VTBB/QNVAS/IV/NBO/AE/000/999/1723N10247E025\nA) VTUD B) 2605260600 C) 2605270600\nE) VOR/DME UTH 116.3MHZ CH110X U/S FOR MAINTENANCE.\nCREATED: 26 MAY 2026 0400Z)"}],
  VTUU:[
    {id:"F0021/26",p:"HIGH",t:"AIRSPACE",raw:"(F0021/26 NOTAMN\nQ) VTBB/QRRCA/IV/BO /AE/000/999/1515N10452E015\nA) VTUU B) 2605260600 C) 2605261800\nE) RESTRICTED AREA R-901 ACTIVE SFC-UNL. AUTH REQUIRED FROM UBON APPROACH 119.1MHZ.\nCREATED: 26 MAY 2026 0500Z)"},
    {id:"F0019/26",p:"MED", t:"NAV AID", raw:"(F0019/26 NOTAMN\nQ) VTBB/QILSA/IV/NBO/A /000/999/1515N10452E005\nA) VTUU B) 2605260000 C) 2605262359\nE) ILS RWY 05 (UBP) LOCALIZER U/S. USE VOR/DME OR NDB FOR NON-PRECISION APCH.\nCREATED: 25 MAY 2026 2200Z)"},
  ],
  VTPI:[{id:"G0008/26",p:"HIGH",t:"AIRSPACE",raw:"(G0008/26 NOTAMN\nQ) VTBB/QRDCA/IV/BO /AE/000/100/1516N10018E015\nA) VTPI B) 2605260900 C) 2605261500\nE) ARTILLERY FIRING EXERCISE ACTIVE. DANGER AREA D-201 SFC-FL100. RADIUS 10NM EAST.\nCREATED: 26 MAY 2026 0600Z)"}],
  VTBP:[{id:"J0015/26",p:"HIGH",t:"RWY",    raw:"(J0015/26 NOTAMN\nQ) VTBB/QMRLC/IV/BO /A /000/999/1240N10059E005\nA) VTBP B) 2605260000 C) 2605280000\nE) RWY 04/22 CLSD FOR STRUCTURAL MAINTENANCE. ONLY HELICOPTER PAD AVBL FOR OPS.\nCREATED: 25 MAY 2026 1200Z)"}],
  VTBL:[{id:"K0004/26",p:"MED",t:"AIRSPACE",raw:"(K0004/26 NOTAMN\nQ) VTBB/QRDCA/IV/NBO/AE/000/050/1453N10040E010\nA) VTBL B) 2605260600 C) 2605261600\nE) PARACHUTE DROPPING EXERCISE ACTIVE. AREA 10NM RADIUS VTBL SFC-FL050.\nCREATED: 26 MAY 2026 0500Z)"}],
};

const AIRCRAFT_A = [
  {id:"920129",status:"PMC",cols:{h50:33,  h375:144,  h750:519,  h1500:471.5},trouble:"201 SQDN",           insp30:"19 Jun 2026",insp12:"30 Nov 2025",com:1,nav:1,radar:1,emer:1,remark:""},
  {id:"920131",status:"FMC",cols:{h50:38.3,h375:264.7,h750:639.7,h1500:543.1},trouble:"201 SQDN",           insp30:"08 Jun 2026",insp12:"11 Sep 2026",com:1,nav:1,radar:1,emer:1,remark:""},
  {id:"920133",status:"FMC",cols:{h50:47.6,h375:128,  h750:86.3, h1500:835.4},trouble:"STBY 9923",          insp30:"08 Jun 2026",insp12:"24 Oct 2026",com:1,nav:1,radar:1,emer:1,remark:""},
  {id:"920286",status:"NMC",cols:{h50:22.2,h375:13.9, h750:146.7,h1500:896.7},trouble:"201 SQDN",           insp30:"29 May 2026",insp12:"30 Apr 2026",com:1,nav:1,radar:1,emer:1,remark:"PA / TCAS error"},
  {id:"920298",status:"NMC",cols:{h50:48.4,h375:296,  h750:671,  h1500:671},  trouble:"12/24 Month AMD.2 รออะไหล่",insp30:"null",      insp12:"22 Dec 2022",com:1,nav:1,radar:1,emer:1,remark:"รอพัสดุ"},
];
const AIRCRAFT_B = [
  {id:"704040",status:"NMC",cols:{h40:40,  h120:86.5, h480:307.3,h960:787.3},trouble:"201 SQDN",            insp90:"20 Jul 2026",insp12:"20 Apr 2027",com:1,nav:1,radar:1,emer:1,remark:""},
  {id:"704056",status:"FMC",cols:{h40:14.5,h120:94.5, h480:373.3,h960:669.8},trouble:"ฉ.12 วปร.1/65(94301)",insp90:"26 Jun 2026",insp12:"26 Mar 2027",com:1,nav:1,radar:1,emer:1,remark:""},
  {id:"704060",status:"NMC",cols:{h40:19.8,h120:104.4,h480:354.1,h960:465.3},trouble:"AMD 2 (ครบตรวจ 12 เดือน)",insp90:"03 Mar 2026",insp12:"26 May 2026",com:1,nav:1,radar:1,emer:1,remark:""},
  {id:"704103",status:"NMC",cols:{h40:34.9,h120:87.5, h480:7.2,  h960:7.8},  trouble:"AMD 2 (INSP.PMI 2)",  insp90:"30 Jun 2026",insp12:"01 Oct 2026",com:1,nav:1,radar:1,emer:1,remark:"รอ Upgrade MFD"},
  {id:"704104",status:"FMC",cols:{h40:22.6,h120:68.8, h480:428.8,h960:908.8},trouble:"มว.บิน C",            insp90:"16 Jun 2026",insp12:"16 Mar 2027",com:1,nav:1,radar:1,emer:1,remark:""},
];

const FLIGHTS = [
  {day:"FRI",date:"29 May",mission:"พ.11-20(NAV)S-92",ac:"129",cs:"SPD 129",pilot:"N-RA",coPilot:"S-BHUME",takeoff:"07:30",land:"09:00",route:"VTBL-VTBD-VTBL",remark:"เปลี่ยนผลัดหน่วยบิน",sq:"4312"},
];

const DUTY_TODAY = {
  date:"29 May 2026",
  sqdn201:{ alert1:{name:"P-VEE",tel:"096-810-8715"}, sof:{name:"K-NAN",tel:"084-850-0710"}, emergency:{name:"",topic:""}, baseOps:{name:"-",tel:"-"}, remark:"" },
  det9923:["P-SIT","T-NIN","M-WAT"],
  cSqdn:["N-SAK","N-NAN","N-DOL","N-PONG"],
};
const DUTY_TMR = {date:"30 May 2026",alert1:"S-BHUME",sof:"-",brief:"-"};

const MONTHLY = [
  {day:"Friday",   date:"1 May",  alert:"N-NON",   sof:"K-NAN",   base:"N-NON",  topic:"",             d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, N-NAN, N-DOL, N-WAT",rmk:"",           type:"weekday"},
  {day:"Saturday", date:"2 May",  alert:"T-VUT",   sof:"",        base:"T-VUT",  topic:"",             d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, N-NAN, N-DOL, N-WAT",rmk:"",           type:"saturday"},
  {day:"Sunday",   date:"3 May",  alert:"T-VUT",   sof:"",        base:"T-VUT",  topic:"",             d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, N-NAN, N-DOL, N-WAT",rmk:"",           type:"sunday"},
  {day:"Monday",   date:"4 May",  alert:"T-VUT",   sof:"",        base:"T-VUT",  topic:"",             d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, N-NAN, N-DOL, N-WAT",rmk:"วันฉัตรมงคล",type:"holiday"},
  {day:"Tuesday",  date:"5 May",  alert:"N-WIT",   sof:"P-WIT",   base:"N-WIT",  topic:"",             d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, W-MOL, N-DOL, N-WAT",rmk:"",           type:"weekday"},
  {day:"Wednesday",date:"6 May",  alert:"PS-KORN", sof:"C-KUN",   base:"PS-KORN",topic:"",             d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, W-MOL, N-DOL, N-WAT",rmk:"",           type:"weekday"},
  {day:"Thursday", date:"7 May",  alert:"T-DEE",   sof:"C-KUN",   base:"T-DEE",  topic:"T-DEE/N-NON",  d9923:"P-SIT T-PHAT S-BHUME",csqdn:"N-SAK, N-NAN, N-DOL, N-WAT",rmk:"",           type:"weekday"},
  {day:"Friday",   date:"8 May",  alert:"N-NON",   sof:"P-WIT",   base:"N-NON",  topic:"",             d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, N-NAN, T-PAT, S-SIT", rmk:"",           type:"weekday"},
  {day:"Saturday", date:"9 May",  alert:"N-NON",   sof:"",        base:"N-NON",  topic:"",             d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, N-NAN, S-GIT, S-SIT", rmk:"",           type:"saturday"},
  {day:"Sunday",   date:"10 May", alert:"N-NON",   sof:"",        base:"N-NON",  topic:"",             d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, W-MOL, S-GIT, S-SIT", rmk:"",           type:"sunday"},
  {day:"Monday",   date:"11 May", alert:"S-BHUME", sof:"PA-PONG", base:"",       topic:"",             d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, W-MOL, T-PAT, S-SIT", rmk:"",           type:"weekday"},
  {day:"Tuesday",  date:"12 May", alert:"M-WAT",   sof:"T-PHAT",  base:"",       topic:"",             d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, W-MOL, T-PAT, S-SIT", rmk:"",           type:"weekday"},
  {day:"Wednesday",date:"13 May", alert:"T-NET",   sof:"",        base:"",       topic:"",             d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, W-MOL, T-PAT, S-SIT", rmk:"วันพืชมงคล", type:"holiday"},
  {day:"Thursday", date:"14 May", alert:"N-PONG",  sof:"C-KUN",   base:"",       topic:"N-PONG/M-WAT", d9923:"P-SIT N-PON P-THEP",  csqdn:"PT-YA, W-MOL, T-PAT, S-SIT", rmk:"",           type:"weekday"},
  {day:"Friday",   date:"15 May", alert:"NT-WAT",  sof:"K-NAN",   base:"",       topic:"",             d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, S-GIT, T-DEE", rmk:"",           type:"weekday"},
  {day:"Saturday", date:"16 May", alert:"NT-WAT",  sof:"",        base:"",       topic:"",             d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, S-GIT, T-DEE", rmk:"",           type:"saturday"},
  {day:"Sunday",   date:"17 May", alert:"NT-WAT",  sof:"",        base:"",       topic:"",             d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, S-GIT, T-DEE", rmk:"",           type:"sunday"},
  {day:"Monday",   date:"18 May", alert:"S-BHUME", sof:"K-NAN",   base:"",       topic:"",             d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, S-GIT, T-DEE", rmk:"",           type:"weekday"},
  {day:"Tuesday",  date:"19 May", alert:"S-SIT",   sof:"K-NAN",   base:"",       topic:"",             d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, S-GIT, T-DEE", rmk:"",           type:"weekday"},
  {day:"Wednesday",date:"20 May", alert:"S-KORN",  sof:"T-PHAT",  base:"",       topic:"",             d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, T-PAT, T-DEE", rmk:"",           type:"weekday"},
  {day:"Thursday", date:"21 May", alert:"M-ROUY",  sof:"P-WIT",   base:"",       topic:"M-ROUY/S-KORN",d9923:"P-SIT M-WAN M-WAT",   csqdn:"N-SAK, N-NAN, T-PAT, T-DEE", rmk:"",           type:"weekday"},
  {day:"Friday",   date:"22 May", alert:"T-NET",   sof:"K-NAN",   base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, W-MOL, KARN, P-WIT",  rmk:"",           type:"weekday"},
  {day:"Saturday", date:"23 May", alert:"T-NET",   sof:"",        base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, W-MOL, KARN, P-WIT",  rmk:"",           type:"saturday"},
  {day:"Sunday",   date:"24 May", alert:"T-NET",   sof:"",        base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, W-MOL, KARN, P-WIT",  rmk:"",           type:"sunday"},
  {day:"Monday",   date:"25 May", alert:"PS-KORN", sof:"",        base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, W-MOL, KARN, P-WIT",  rmk:"วันวิสาขบูชา",type:"holiday"},
  {day:"Tuesday",  date:"26 May", alert:"N-PONG",  sof:"PA-PONG", base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, W-MOL, KARN, P-WIT",  rmk:"",           type:"weekday"},
  {day:"Wednesday",date:"27 May", alert:"M-WAT",   sof:"",        base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, N-NAN, KARN, P-WIT",  rmk:"",           type:"weekday"},
  {day:"Thursday", date:"28 May", alert:"S-BHUME", sof:"K-NAN",   base:"",       topic:"",             d9923:"P-SIT P-CHART N-NON", csqdn:"PT-YA, N-NAN, KARN, P-WIT",  rmk:"",           type:"weekday"},
  {day:"Friday",   date:"29 May", alert:"P-VEE",   sof:"K-NAN",   base:"",       topic:"",             d9923:"P-SIT T-NIN M-WAT",   csqdn:"N-SAK, N-NAN, N-DOL, N-PONG",rmk:"",           type:"weekday"},
  {day:"Saturday", date:"30 May", alert:"S-BHUME", sof:"",        base:"",       topic:"",             d9923:"P-SIT T-NIN M-WAT",   csqdn:"N-SAK, N-NAN, N-DOL, N-PONG",rmk:"",           type:"saturday"},
  {day:"Sunday",   date:"31 May", alert:"S-BHUME", sof:"",        base:"",       topic:"",             d9923:"P-SIT T-NIN M-WAT",   csqdn:"N-SAK, N-NAN, N-DOL, N-PONG",rmk:"",           type:"sunday"},
];

// ── Constants ──────────────────────────────────────────────────────────────────
const PC = {HIGH:"#ef4444",MED:"#f59e0b",LOW:"#22c55e"};
const PL = {HIGH:"วิกฤต",MED:"ปานกลาง",LOW:"ทั่วไป"};
const SB = {FMC:{bg:"#14532d",c:"#86efac"},PMC:{bg:"#713f12",c:"#fde68a"},NMC:{bg:"#7f1d1d",c:"#fca5a5"},INSP:{bg:"#1e3a5f",c:"#93c5fd"}};
const BC = {"ทอ.":"#3b82f6","ทบ.":"#22c55e","ทร.":"#f59e0b"};

// ── Utility Components ─────────────────────────────────────────────────────────
function Clock() {
  const [now,setNow] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); },[]);
  const p=n=>String(n).padStart(2,"0");
  const days=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
  const mo=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return <div style={{textAlign:"right"}}>
    <div style={{fontSize:24,fontWeight:800,color:"#38bdf8",fontFamily:"monospace"}}>{p(now.getHours())}:{p(now.getMinutes())}:{p(now.getSeconds())} Z</div>
    <div style={{fontSize:11,color:"#94a3b8"}}>วัน{days[now.getDay()]}ที่ {now.getDate()} {mo[now.getMonth()]} {now.getFullYear()+543}</div>
  </div>;
}

function Card({label,value,sub,color}) {
  return <div style={{background:"rgba(30,41,59,0.8)",border:`1px solid ${color}33`,borderRadius:10,padding:"12px 16px",minWidth:110}}>
    <div style={{fontSize:11,color:"#94a3b8"}}>{label}</div>
    <div style={{fontSize:28,fontWeight:900,color,fontFamily:"monospace"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:"#64748b"}}>{sub}</div>}
  </div>;
}

function Sec({title,icon,children}) {
  return <div style={{background:"rgba(15,23,42,0.85)",border:"1px solid #1e3a5f",borderRadius:12,padding:"16px 18px",marginBottom:16}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span>{icon}</span>
      <span style={{fontWeight:700,color:"#e2e8f0",fontSize:13,letterSpacing:1}}>{title}</span>
      <div style={{flex:1,height:1,background:"linear-gradient(to right,#1e3a5f,transparent)",marginLeft:8}}/>
    </div>
    {children}
  </div>;
}

// ── NOTAM Tab ──────────────────────────────────────────────────────────────────
// ── NOTAM parser (Base Ops RTAF format) ────────────────────────────────────────
function parseNotamText(text) {
  // normalize
  const norm = text
    .replace(/\r\n/g,"\n").replace(/\r/g,"\n")
    // เพิ่ม newline หน้า field labels ถ้าอยู่บรรทัดเดียวกัน
    // เช่น "A) VTBD B) 260... C) 260..." → split ออก
    .replace(/\s+(B\))\s+(\d)/g,"\n$1 $2")
    .replace(/\s+(C\))\s+(\d|PERM)/g,"\n$1 $2")
    .replace(/\s+(D\))\s+/g,"\nD) ")
    .replace(/\s+(E\))\s+/g,"\nE) ")
    .replace(/\s+(F\))\s+/g,"\nF) ")
    .replace(/\s+(G\))\s+/g,"\nG) ");

  const lines = norm.split("\n");
  const blocks = [];
  let cur = [];

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    // NOTAM block เริ่มด้วย ( + series letter + 4 digits / 2 digits + NOTAM
    const isStart = /^\(\s*[A-Z]\d{4}\/\d{2}\s+NOTAM[NRC]/.test(t);

    if (isStart) {
      if (cur.length > 0) flush(cur, blocks);
      cur = [t];
    } else if (cur.length > 0) {
      cur.push(t);
      // จบ block เมื่อบรรทัดลงท้าย ) และบรรทัดถัดไปขึ้น block ใหม่หรือหัวข้อภาษาไทย
      const endsP = t.endsWith(")") && t.length > 1;
      const next  = (lines[i+1]||"").trim();
      const nextStart  = /^\(\s*[A-Z]\d{4}\/\d{2}\s+NOTAM[NRC]/.test(next);
      const nextHeader = (/^\d+[\.\s]/.test(next) && /[ก-๙]/.test(next))
                      || /^UPDATED ON/i.test(next)
                      || (next === "" && (/^\(\s*[A-Z]\d{4}\/\d{2}/.test((lines[i+2]||"").trim())));
      if (endsP && (nextStart || nextHeader || i === lines.length-1)) {
        flush(cur, blocks); cur = [];
      }
    }
  }
  if (cur.length > 0) flush(cur, blocks);
  return blocks;
}

function flush(cur, blocks) {
  const raw = cur.join("\n").trim();
  if (!raw.includes("Q)") || !raw.includes("E)")) return;
  const id    = (raw.match(/([A-Z]\d{4}\/\d{2})/)||["?"])[0];
  const aM    = raw.match(/A\)\s*([A-Z]{4}(?:\s+[A-Z]{4})*)/);
  const icaos = aM ? aM[1].trim().split(/\s+/) : [];
  const qM    = raw.match(/Q\)\s*\S+\/Q([A-Z]{2,4})\/[^\n]+\/([A-Z ]+)\//);
  const qCode = qM ? qM[1] : "";
  const pur   = qM ? qM[2].trim() : "";
  blocks.push({ id, icaos, p: classifyP(qCode,pur), t: classifyT(qCode), raw });
}

// ── NOTAM Validator ─────────────────────────────────────────────────────────────
function validateNotam(block) {
  const errors = [];
  const warnings = [];
  const raw = block.raw;

  // ── Header: (XNNNN/YY NOTAM[N/R/C]) ──
  const headerM = raw.match(/^\(\s*([A-Z])(\d{4})\/(\d{2})\s+(NOTAM[NRC])/);
  if (!headerM) errors.push("Header ไม่ถูกต้อง — ต้องขึ้นต้นด้วย (XNNNN/YY NOTAM[N/R/C])");

  // ── Q) line ──
  const qM = raw.match(/Q\)\s*([A-Z]{4})\/Q([A-Z]{4,6})\/([A-Z]+)\/([A-Z ]+)\/([A-Z ]+)\/(\d{3})\/(\d{3})\/(\d{4}[NS]\d{5}[EW]\d{3})/);
  if (!qM) {
    errors.push("Q) line ไม่ครบหรือผิดรูปแบบ");
  } else {
    const [,fir,qcode,traffic,purpose,scope,lower,upper,coord] = qM;
    if (!/^VT[A-Z]{2}$/.test(fir) && fir !== "ZZZZ") warnings.push(`FIR "${fir}" อาจไม่ใช่ Bangkok FIR (VTBB)`);
    if (parseInt(lower) > parseInt(upper)) errors.push(`Q) lower (${lower}) > upper (${upper})`);
    if (!/^(IV|IFR|VFR|K|S|M)/.test(traffic.trim())) warnings.push(`Traffic code "${traffic.trim()}" ผิดปกติ`);
  }

  // ── A) ICAO location ──
  const aM = raw.match(/A\)\s*([A-Z]{4}(?:\s+[A-Z]{4})*)/);
  if (!aM) {
    errors.push("A) ไม่พบ ICAO location");
  } else {
    const icaos = aM[1].trim().split(/\s+/);
    for (const ic of icaos) {
      if (!/^[A-Z]{4}$/.test(ic)) errors.push(`A) ICAO "${ic}" ไม่ถูกรูปแบบ (ต้องเป็นอักษร 4 ตัว)`);
    }
  }

  // ── B) Start validity YYMMDDHHMM ──
  const bM = raw.match(/B\)\s*(\d{10})/);
  if (!bM) {
    errors.push("B) ไม่พบหรือผิดรูปแบบ (ต้องเป็น 10 หลัก YYMMDDHHMM)");
  } else {
    const b = bM[1];
    const mm = parseInt(b.slice(2,4)), dd = parseInt(b.slice(4,6));
    const hh = parseInt(b.slice(6,8)), mi = parseInt(b.slice(8,10));
    if (mm<1||mm>12) errors.push(`B) เดือนไม่ถูกต้อง: ${mm}`);
    if (dd<1||dd>31) errors.push(`B) วันไม่ถูกต้อง: ${dd}`);
    if (hh>23)       errors.push(`B) ชั่วโมงไม่ถูกต้อง: ${hh}`);
    if (mi>59)       errors.push(`B) นาทีไม่ถูกต้อง: ${mi}`);
  }

  // ── C) End validity ──
  const cM = raw.match(/C\)\s*(\d{10}|PERM|EST)/i);
  if (!cM) {
    errors.push("C) ไม่พบหรือผิดรูปแบบ (ต้องเป็น YYMMDDHHMM, PERM หรือ EST)");
  } else if (/^\d{10}$/.test(cM[1]) && bM) {
    // B < C check
    if (parseInt(cM[1]) < parseInt(bM[1])) errors.push("C) วันสิ้นสุดก่อนวันเริ่มต้น (B)");
    const cm = parseInt(cM[1].slice(2,4));
    const cd = parseInt(cM[1].slice(4,6));
    if (cm<1||cm>12) errors.push(`C) เดือนไม่ถูกต้อง: ${cm}`);
    if (cd<1||cd>31) errors.push(`C) วันไม่ถูกต้อง: ${cd}`);
  }

  // ── E) text ──
  const eM = raw.match(/E\)\s*([\s\S]+?)(?=\nF\)|\nG\)|\)$)/);
  if (!eM || eM[1].trim().length < 5) {
    errors.push("E) ไม่มีข้อความหรือสั้นเกินไป");
  }

  // ── F/G optional — ถ้ามี F ต้องมี G ด้วย ──
  const hasF = /\nF\)/.test(raw);
  const hasG = /\nG\)/.test(raw);
  if (hasF && !hasG) warnings.push("มี F) แต่ไม่มี G) — ควรระบุ upper limit ด้วย");
  if (!hasF && hasG) warnings.push("มี G) แต่ไม่มี F) — ควรระบุ lower limit ด้วย");

  return { errors, warnings, valid: errors.length === 0 };
}

// ── Validation Modal ─────────────────────────────────────────────────────────────
function ValidationModal({ blocks, onConfirm, onCancel }) {
  // ── validate ทุก block ──
  const results = blocks.map(b => ({ ...b, ...validateNotam(b) }));

  // ── จัดกลุ่มตาม ICAO (primary location จาก A) field) ──
  const byAirport = {};
  for (const r of results) {
    const primary = r.icaos[0] || "UNKNOWN";
    if (!byAirport[primary]) byAirport[primary] = [];
    byAirport[primary].push(r);
  }
  const airports = Object.keys(byAirport).sort();

  // สถิติรวม
  const totalValid   = results.filter(r => r.valid).length;
  const totalInvalid = results.filter(r => !r.valid).length;
  const totalWarn    = results.filter(r => r.valid && r.warnings.length > 0).length;

  // state
  const [selAp,    setSelAp]    = useState(airports[0] || null);  // สนามบินที่กำลังดู
  const [expanded, setExpanded] = useState(null);
  const [filter,   setFilter]   = useState("all"); // all | error | warn | ok

  const apResults = selAp ? byAirport[selAp] : [];
  const apValid   = apResults.filter(r => r.valid).length;
  const apInvalid = apResults.filter(r => !r.valid).length;
  const apWarn    = apResults.filter(r => r.valid && r.warnings.length > 0).length;

  const shown = apResults.filter(r => {
    if (filter === "error") return !r.valid;
    if (filter === "warn")  return r.valid && r.warnings.length > 0;
    if (filter === "ok")    return r.valid && r.warnings.length === 0;
    return true;
  });

  // สีสถานะสนามบิน
  const apStatus = (icao) => {
    const rs = byAirport[icao] || [];
    if (rs.some(r => !r.valid))                       return { dot:"#ef4444", bg:"rgba(239,68,68,0.1)",   bd:"#ef444444" };
    if (rs.some(r => r.warnings.length > 0))          return { dot:"#f59e0b", bg:"rgba(245,158,11,0.1)",  bd:"#f59e0b44" };
    return                                                    { dot:"#22c55e", bg:"rgba(34,197,94,0.08)",  bd:"#22c55e44" };
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:1000,
      display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px",overflowY:"auto"}}>
      <div style={{background:"#0a1120",border:"1px solid #1e3a5f",borderRadius:14,
        width:"100%",maxWidth:980,boxShadow:"0 12px 48px #000c",display:"flex",flexDirection:"column"}}>

        {/* ── Modal Header ── */}
        <div style={{padding:"16px 22px",borderBottom:"1px solid #1e3a5f",display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:15,fontWeight:800,color:"#e2e8f0",letterSpacing:1}}>🔍 ตรวจสอบ NOTAM ก่อน Import</span>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:8,fontSize:12}}>
            <span style={{background:"#14532d",color:"#86efac",padding:"3px 12px",borderRadius:20,fontWeight:700}}>✓ {totalValid}</span>
            {totalInvalid>0 && <span style={{background:"#7f1d1d",color:"#fca5a5",padding:"3px 12px",borderRadius:20,fontWeight:700}}>✗ {totalInvalid}</span>}
            {totalWarn>0    && <span style={{background:"#713f12",color:"#fde68a",padding:"3px 12px",borderRadius:20,fontWeight:700}}>⚠ {totalWarn}</span>}
            <span style={{color:"#475569",fontSize:11,alignSelf:"center"}}>{results.length} รายการ · {airports.length} สนามบิน</span>
          </div>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div style={{display:"flex",flex:1,minHeight:0}}>

          {/* Sidebar — รายชื่อสนามบิน */}
          <div style={{width:180,flexShrink:0,borderRight:"1px solid #1e293b",overflowY:"auto",
            maxHeight:"65vh",padding:"10px 8px"}}>
            <div style={{fontSize:10,color:"#475569",letterSpacing:1,padding:"4px 8px 8px",fontWeight:700}}>สนามบิน</div>
            {airports.map(icao => {
              const st  = apStatus(icao);
              const rs  = byAirport[icao];
              const cnt = rs.length;
              const err = rs.filter(r=>!r.valid).length;
              const ok  = rs.filter(r=>r.valid).length;
              const isSel = selAp === icao;
              return (
                <button key={icao} onClick={()=>{ setSelAp(icao); setExpanded(null); setFilter("all"); }}
                  style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,border:`1px solid ${isSel?st.dot+"88":"transparent"}`,
                    background:isSel?st.bg:"transparent",cursor:"pointer",marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:st.dot,flexShrink:0,
                    boxShadow:isSel?`0 0 6px ${st.dot}`:""}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:isSel?st.dot:"#94a3b8"}}>{icao}</div>
                    <div style={{fontSize:10,color:"#475569"}}>
                      {err>0?<span style={{color:"#ef4444"}}>✗{err} </span>:null}
                      <span style={{color:"#22c55e"}}>✓{ok}</span>
                    </div>
                  </div>
                  <span style={{fontSize:10,color:"#334155",fontFamily:"monospace"}}>{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* Main panel */}
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

            {/* Airport header */}
            {selAp && (
              <div style={{padding:"12px 18px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontFamily:"monospace",fontSize:16,fontWeight:900,color:"#38bdf8"}}>{selAp}</span>
                <span style={{fontSize:11,color:"#64748b"}}>{apResults.length} NOTAM</span>
                <div style={{display:"flex",gap:4,marginLeft:8}}>
                  {[
                    {k:"all",  l:`ทั้งหมด (${apResults.length})`},
                    {k:"error",l:`Error (${apInvalid})`,  c:"#ef4444"},
                    {k:"warn", l:`Warning (${apWarn})`,   c:"#f59e0b"},
                    {k:"ok",   l:`ผ่าน (${apValid})`,     c:"#22c55e"},
                  ].map(({k,l,c})=>(
                    <button key={k} onClick={()=>setFilter(k)}
                      style={{padding:"3px 10px",fontSize:11,borderRadius:5,border:`1px solid ${filter===k?(c||"#38bdf8"):"#1e293b"}`,
                        background:filter===k?(c||"#38bdf8")+"22":"transparent",
                        color:filter===k?(c||"#38bdf8"):"#64748b",cursor:"pointer",fontWeight:600}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NOTAM list */}
            <div style={{flex:1,overflowY:"auto",maxHeight:"55vh",padding:"10px 16px"}}>
              {shown.length === 0 && (
                <div style={{textAlign:"center",padding:"30px",color:"#475569",fontSize:13}}>
                  {selAp ? "ไม่มี NOTAM ที่ตรงเงื่อนไข" : "เลือกสนามบินทางซ้าย"}
                </div>
              )}
              {shown.map((r,i) => {
                const hasErr = r.errors.length > 0;
                const hasWrn = r.warnings.length > 0;
                const color  = hasErr?"#ef4444":hasWrn?"#f59e0b":"#22c55e";
                const icon   = hasErr?"✗":hasWrn?"⚠":"✓";
                const isExp  = expanded === r.id+i;
                return (
                  <div key={r.id+i} style={{border:`1px solid ${color}33`,borderRadius:8,marginBottom:6,
                    background:`${color}06`,borderLeft:`3px solid ${color}`}}>
                    {/* Row */}
                    <div onClick={()=>setExpanded(isExp?null:r.id+i)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:800,color,minWidth:14}}>{icon}</span>
                      <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#38bdf8"}}>{r.id}</span>
                      <span style={{fontSize:11,padding:"1px 7px",borderRadius:10,background:color+"22",color,fontWeight:700}}>{r.p}</span>
                      <span style={{fontSize:10,color:"#64748b"}}>{r.t}</span>
                      {r.icaos.length>1 && <span style={{fontSize:10,color:"#475569"}}>→ {r.icaos.slice(1).join(", ")}</span>}
                      {hasErr && <span style={{fontSize:10,color:"#fca5a5",marginLeft:4}}>
                        {r.errors.length} error{r.errors.length>1?"s":""}</span>}
                      {!hasErr&&hasWrn && <span style={{fontSize:10,color:"#fde68a",marginLeft:4}}>
                        {r.warnings.length} warning{r.warnings.length>1?"s":""}</span>}
                      <div style={{flex:1}}/>
                      <span style={{color:"#334155",fontSize:11}}>{isExp?"▲":"▼"}</span>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div style={{borderTop:`1px solid ${color}22`,padding:"10px 12px 12px"}}>
                        {/* Pattern check */}
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:11,color:"#60a5fa",fontWeight:700,marginBottom:6,letterSpacing:1}}>PATTERN CHECK</div>
                          {[
                            { field:"Header", ok:!!r.raw.match(/^\(\s*[A-Z]\d{4}\/\d{2}\s+NOTAM[NRC]/),       req:true  },
                            { field:"Q) FIR/QCODE/TRAFFIC/PURPOSE/SCOPE/LOWER/UPPER/COORD", ok:!!r.raw.match(/Q\)\s*[A-Z]{4}\/Q[A-Z]{4,6}\/[A-Z]+\/[A-Z ]+\/[A-Z ]+\/\d{3}\/\d{3}\/\d{4}[NS]\d{5}[EW]\d{3}/), req:true },
                            { field:"A) ICAO",  ok:!!r.raw.match(/A\)\s*[A-Z]{4}/),                             req:true  },
                            { field:"B) YYMMDDHHMM", ok:!!r.raw.match(/B\)\s*\d{10}/),                          req:true  },
                            { field:"C) END",   ok:!!r.raw.match(/C\)\s*(\d{10}|PERM|EST)/i),                   req:true  },
                            { field:"E) Text",  ok:!!r.raw.match(/E\)\s*\S{3,}/),                               req:true  },
                            { field:"D) Schedule", ok:!!r.raw.match(/D\)\s*\S/),                                req:false },
                            { field:"F) Lower limit", ok:!!r.raw.match(/F\)\s*\S/),                             req:false },
                            { field:"G) Upper limit", ok:!!r.raw.match(/G\)\s*\S/),                             req:false },
                          ].map(({field,ok,req})=>(
                            <div key={field} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0",
                              borderBottom:"1px solid #0f172a",fontSize:11}}>
                              <span style={{color:ok?"#22c55e":req?"#ef4444":"#475569",minWidth:14,flexShrink:0}}>
                                {ok?"✓":req?"✗":"○"}
                              </span>
                              <span style={{color:"#475569",minWidth:200}}>{field}</span>
                              <span style={{fontSize:10,color:req?"#64748b":"#334155"}}>
                                {req?"required":"optional"}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Errors & Warnings */}
                        {r.errors.map((e,j)=>(
                          <div key={"e"+j} style={{display:"flex",gap:6,padding:"4px 0",fontSize:11,color:"#fca5a5"}}>
                            <span>✗</span><span>{e}</span>
                          </div>
                        ))}
                        {r.warnings.map((w,j)=>(
                          <div key={"w"+j} style={{display:"flex",gap:6,padding:"4px 0",fontSize:11,color:"#fde68a"}}>
                            <span>⚠</span><span>{w}</span>
                          </div>
                        ))}
                        {/* Raw */}
                        <div style={{fontSize:10,color:"#334155",marginTop:8,marginBottom:4,fontWeight:700}}>RAW TEXT</div>
                        <pre style={{margin:0,fontFamily:"monospace",fontSize:11,color:"#64748b",
                          whiteSpace:"pre-wrap",background:"#020817",padding:"10px",borderRadius:6,lineHeight:1.75}}>
                          {r.raw}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{padding:"14px 22px",borderTop:"1px solid #1e293b",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontSize:12}}>
            {totalInvalid>0
              ? <span style={{color:"#fca5a5"}}>⚠️ {totalInvalid} NOTAM ไม่ผ่าน — จะ import เฉพาะ {totalValid} รายการที่ผ่าน</span>
              : <span style={{color:"#86efac"}}>✅ ทั้งหมด {totalValid} รายการผ่านการตรวจสอบ พร้อม import</span>
            }
          </div>
          <button onClick={onCancel}
            style={{padding:"7px 18px",fontSize:12,borderRadius:7,border:"1px solid #334155",
              background:"transparent",color:"#94a3b8",cursor:"pointer"}}>
            ยกเลิก
          </button>
          <button onClick={()=>onConfirm(results.filter(r=>r.valid))} disabled={totalValid===0}
            style={{padding:"7px 22px",fontSize:12,borderRadius:7,border:"none",fontWeight:700,
              background:totalValid>0?"#1d4ed8":"#1e293b",
              color:totalValid>0?"#fff":"#475569",
              cursor:totalValid>0?"pointer":"not-allowed"}}>
            Import {totalValid} NOTAM →
          </button>
        </div>
      </div>
    </div>
  );
}
function classifyP(q,pur) {
  if(["RT","RR","RD","RW"].some(c=>q.startsWith(c))&&pur.includes("B")) return "HIGH";
  if(["MR","MK","MN","IL","IG","NV","NT","NB","NN","CA","CS","LP","LA"].some(c=>q.startsWith(c))) return "MED";
  if(q.startsWith("OB")&&pur.includes("B")) return "MED";
  return "LOW";
}
function classifyT(q) {
  const m={RT:"AIRSPACE",RR:"AIRSPACE",RD:"AIRSPACE",RW:"AIRSPACE",MR:"RWY",MK:"RWY",MN:"APRON",IL:"NAV AID",IG:"NAV AID",NV:"NAV AID",NT:"NAV AID",NB:"NAV AID",NN:"NAV AID",LP:"LIGHTING",LA:"LIGHTING",OB:"OBSTACLE",WM:"GUN FIRING",WP:"PJE",WE:"MIL EXER",CA:"COMM",CS:"RADAR"};
  for(const [k,v] of Object.entries(m)) if(q.startsWith(k)) return v;
  return "GEN";
}

// ── Notam Tab ───────────────────────────────────────────────────────────────────
function NotamTab() {
  const [sel,setSel]       = useState(["VTBD"]);
  const [prio,setPrio]     = useState("ALL");
  const [region,setRegion] = useState("ทั้งหมด");
  const [branch,setBranch] = useState("ทั้งหมด");
  const [search,setSearch] = useState("");
  const [exp,setExp]       = useState(null);
  const [view,setView]     = useState("list");

  // uploaded NOTAM data: { [icao]: [{id,p,t,raw}] }
  const [uploadedNotams, setUploaded] = useState({});
  const [fileName,  setFileName]  = useState(null);
  const [fileDate,  setFileDate]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parseErr,  setParseErr]  = useState(null);

  // รวม NOTAM: uploaded ถ้ามี ไม่งั้นใช้ static
  const activeNotams = Object.keys(uploadedNotams).length > 0 ? uploadedNotams : NOTAMS;

  // โหลด JSZip ตอน component mount
  useEffect(()=>{
    if (window.JSZip) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    document.head.appendChild(s);
  }, []);

  // อ่าน .docx ด้วย JSZip — extract text จาก word/document.xml
  const readDocx = async (file) => {
    let tries = 0;
    while (!window.JSZip && tries++ < 50) await new Promise(r=>setTimeout(r,100));
    if (!window.JSZip) throw new Error("โหลด JSZip ไม่สำเร็จ — ลองใช้ไฟล์ .txt แทน");
    const arr = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arr);
    const xml = await zip.file("word/document.xml").async("string");

    // แปลง XML → plain text โดย:
    // 1. แทน paragraph <w:p> ด้วย newline
    // 2. แทน line break <w:br> ด้วย newline
    // 3. รวม run text <w:t> ใน paragraph เดียวกันให้ต่อกัน
    // 4. strip tags ที่เหลือ
    const lines = [];
    // split ที่ paragraph
    const paras = xml.split(/<w:p[ />]/);
    for (const para of paras) {
      // รวม text จาก <w:t> ทั้งหมดใน paragraph นี้
      const texts = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m=>m[1]);
      const line = texts.join("").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&#xD;/g,"");
      lines.push(line);
    }
    return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
  };

  const [pendingBlocks, setPending]  = useState(null); // blocks รอ validate
  const [debugText,     setDebugText] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setParseErr(null); setDebugText(null);
    try {
      let text = "";
      if (file.name.endsWith(".docx")) {
        text = await readDocx(file);
      } else {
        text = await file.text();
      }

      // Debug: แสดง 500 chars แรกเพื่อตรวจ format
      setDebugText(text.slice(0, 600));

      const parsed = parseNotamText(text);
      if (parsed.length === 0) { setParseErr("ไม่พบ NOTAM blocks — ตรวจสอบรูปแบบไฟล์"); setUploading(false); return; }

      // แสดง validation modal ก่อน import
      setPending(parsed);
      setFileName(file.name);
    } catch(err) {
      setParseErr("เกิดข้อผิดพลาด: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  };

  const clearUpload = () => { setUploaded({}); setFileName(null); setFileDate(null); setSel(["VTBD"]); };

  const filtAp = AIRPORTS.filter(a=>
    (region==="ทั้งหมด"||a.region===region)&&
    (branch==="ทั้งหมด"||a.branch===branch)
  );

  const allNtms = sel.flatMap(icao=>{
    const ap=AIRPORTS.find(a=>a.icao===icao);
    return (activeNotams[icao]||[]).map(n=>({...n,icao,apName:ap?.name||icao,branch:ap?.branch}));
  }).filter(n=>{
    if(prio!=="ALL"&&n.p!==prio) return false;
    if(search&&!n.raw.toUpperCase().includes(search.toUpperCase())&&!n.icao.includes(search.toUpperCase())) return false;
    return true;
  }).sort((a,b)=>({HIGH:0,MED:1,LOW:2}[a.p]-{HIGH:0,MED:1,LOW:2}[b.p]));

  const totalHigh = Object.values(activeNotams).flat().filter(n=>n.p==="HIGH").length;
  const isUploaded = Object.keys(uploadedNotams).length > 0;

  const handleConfirmImport = (validBlocks) => {
    const byAirport = {};
    const ord = {HIGH:0,MED:1,LOW:2};
    for (const n of validBlocks) {
      for (const icao of n.icaos) {
        if (!byAirport[icao]) byAirport[icao] = [];
        if (!byAirport[icao].some(x=>x.id===n.id)) byAirport[icao].push(n);
      }
    }
    for (const k of Object.keys(byAirport)) byAirport[k].sort((a,b)=>ord[a.p]-ord[b.p]);
    setUploaded(byAirport);
    setFileDate(new Date().toLocaleString("th-TH"));
    setSel(Object.keys(byAirport));
    setPending(null);
  };

  return <div>
    {/* Validation modal */}
    {pendingBlocks && (
      <ValidationModal
        blocks={pendingBlocks}
        onConfirm={handleConfirmImport}
        onCancel={()=>{ setPending(null); setFileName(null); }}
      />
    )}
    {/* ── Upload bar ── */}
    <div style={{background:"rgba(15,23,42,0.95)",border:"1px solid #1e3a5f",borderRadius:12,padding:"14px 18px",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontWeight:700,color:"#60a5fa",fontSize:13}}>📡 NOTAM CENTER</span>
        <div style={{flex:1}}/>

        {/* source badge */}
        {isUploaded
          ? <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,background:"#14532d",color:"#86efac",padding:"3px 10px",borderRadius:20,fontWeight:700}}>
                📄 {fileName}
              </span>
              <span style={{fontSize:11,color:"#475569"}}>{fileDate}</span>
              <button onClick={clearUpload} style={{fontSize:11,padding:"3px 10px",borderRadius:5,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>✕ ล้าง</button>
            </div>
          : <span style={{fontSize:11,color:"#475569"}}>ใช้ข้อมูลตัวอย่าง (อัปโหลดไฟล์จริงด้านล่าง)</span>
        }

        {/* Upload button */}
        <label style={{background:isUploaded?"#1e3a5f":"#1d4ed8",border:"none",color:"#fff",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          {uploading ? "⏳ กำลังอ่าน..." : "📂 อัปโหลด NOTAM"}
          <input type="file" accept=".txt,.docx,.ics" onChange={handleFile} style={{display:"none"}} disabled={uploading}/>
        </label>
      </div>

      {/* Debug: extracted text preview */}
      {debugText && (
        <div style={{marginTop:8,background:"#020817",borderRadius:6,padding:"10px 12px"}}>
          <div style={{fontSize:11,color:"#60a5fa",marginBottom:4,fontWeight:700}}>🔍 Debug — text ที่ extract ได้ (600 chars แรก):</div>
          <pre style={{margin:0,fontSize:11,color:"#64748b",whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:1.6,maxHeight:200,overflow:"auto"}}>{debugText}</pre>
        </div>
      )}

      {/* Error */}
      {parseErr && <div style={{marginTop:8,fontSize:12,color:"#fca5a5",background:"rgba(239,68,68,0.1)",borderRadius:6,padding:"6px 10px"}}>⚠️ {parseErr}</div>}

      {/* Upload instructions */}
      {!isUploaded && (
        <div style={{marginTop:10,fontSize:11,color:"#334155",lineHeight:1.8}}>
          รองรับไฟล์: <span style={{color:"#60a5fa"}}>.txt</span> หรือ <span style={{color:"#60a5fa"}}>.docx</span> ที่ได้จาก Base Ops RTAF — parser จะอ่าน NOTAM blocks (Q/A/B/C/E) แล้วจัดกลุ่มตาม ICAO อัตโนมัติ
        </div>
      )}
    </div>

    {/* ── Filter panel ── */}
    <div style={{background:"rgba(15,23,42,0.9)",border:"1px solid #1e3a5f",borderRadius:12,padding:"14px 18px",marginBottom:14}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        <span style={{fontSize:11,color:"#64748b",alignSelf:"center"}}>ภาค:</span>
        {["ทั้งหมด","กลาง","เหนือ","อีสาน","ใต้"].map(r=>(
          <button key={r} onClick={()=>setRegion(r)} style={{padding:"3px 10px",fontSize:11,borderRadius:5,border:`1px solid ${region===r?"#38bdf8":"#1e3a5f"}`,background:region===r?"#0c4a6e":"transparent",color:region===r?"#38bdf8":"#64748b",cursor:"pointer"}}>{r}</button>
        ))}
        <span style={{fontSize:11,color:"#64748b",alignSelf:"center",marginLeft:8}}>เหล่าทัพ:</span>
        {["ทั้งหมด","ทอ.","ทบ.","ทร."].map(b=>(
          <button key={b} onClick={()=>setBranch(b)} style={{padding:"3px 10px",fontSize:11,borderRadius:5,border:`1px solid ${branch===b?(BC[b]||"#38bdf8"):"#1e3a5f"}`,background:branch===b?(BC[b]||"#38bdf8")+"22":"transparent",color:branch===b?(BC[b]||"#38bdf8"):"#64748b",cursor:"pointer"}}>{b}</button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:3}}>
          <button onClick={()=>setView("list")} style={{padding:"3px 10px",fontSize:11,borderRadius:5,border:`1px solid ${view==="list"?"#38bdf8":"#1e3a5f"}`,background:view==="list"?"#0c4a6e":"transparent",color:view==="list"?"#38bdf8":"#64748b",cursor:"pointer"}}>≡ รายการ</button>
          <button onClick={()=>setView("airport")} style={{padding:"3px 10px",fontSize:11,borderRadius:5,border:`1px solid ${view==="airport"?"#38bdf8":"#1e3a5f"}`,background:view==="airport"?"#0c4a6e":"transparent",color:view==="airport"?"#38bdf8":"#64748b",cursor:"pointer"}}>⊞ แยกสนาม</button>
        </div>
      </div>

      {/* Airport selector */}
      <div style={{background:"#020817",borderRadius:8,padding:10,marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:11,color:"#64748b",fontWeight:700}}>เลือกสนามบิน</span>
          <span style={{fontSize:11,color:"#38bdf8",background:"#0c4a6e",padding:"1px 8px",borderRadius:10}}>{sel.length}/{filtAp.length}</span>
          <div style={{flex:1}}/>
          <button onClick={()=>setSel(filtAp.map(a=>a.icao))} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#1e3a5f",border:"none",color:"#60a5fa",cursor:"pointer"}}>ทั้งหมด</button>
          <button onClick={()=>setSel([])} style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#1e3a5f",border:"none",color:"#ef4444",cursor:"pointer"}}>ยกเลิก</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {filtAp.map(ap=>{
            const isS=sel.includes(ap.icao);
            const cnt=(activeNotams[ap.icao]||[]).length;
            const hi=(activeNotams[ap.icao]||[]).filter(n=>n.p==="HIGH").length;
            const bc=BC[ap.branch]||"#64748b";
            return <button key={ap.icao} onClick={()=>setSel(p=>p.includes(ap.icao)?p.filter(x=>x!==ap.icao):[...p,ap.icao])}
              title={ap.name} style={{padding:"5px 8px",borderRadius:6,border:`1px solid ${isS?bc:"#1e293b"}`,background:isS?bc+"22":"#0f172a",cursor:"pointer",position:"relative",minWidth:62}}>
              <div style={{fontSize:12,fontWeight:800,color:isS?bc:"#475569",fontFamily:"monospace"}}>{ap.icao}</div>
              <div style={{fontSize:9,color:isS?"#94a3b8":"#334155"}}>{ap.branch}</div>
              {cnt>0&&<span style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:hi>0?"#ef4444":"#f59e0b",fontSize:9,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{cnt}</span>}
            </button>;
          })}
        </div>
      </div>

      {/* Priority + Search */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {["ALL","HIGH","MED","LOW"].map(p=>(
          <button key={p} onClick={()=>setPrio(p)} style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:`1px solid ${prio===p?(PC[p]||"#38bdf8"):"#1e3a5f"}`,background:prio===p?(PC[p]||"#38bdf8")+"22":"transparent",color:prio===p?(PC[p]||"#38bdf8"):"#64748b",cursor:"pointer",fontWeight:700}}>
            {p==="ALL"?"ทุกระดับ":PL[p]}
          </button>
        ))}
        <div style={{flex:1,minWidth:120}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ค้นหา NOTAM, ICAO..."
            style={{width:"100%",background:"#020817",border:"1px solid #1e3a5f",borderRadius:6,padding:"4px 10px",color:"#e2e8f0",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <span style={{fontSize:11,color:"#38bdf8"}}>พบ {allNtms.length} รายการ</span>
        {totalHigh>0&&<span style={{fontSize:11,color:"#ef4444",fontWeight:700}}>⚠ HIGH: {totalHigh}</span>}
      </div>
    </div>

    {sel.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#475569"}}>กรุณาเลือกสนามบิน</div>}
    {sel.length>0&&allNtms.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#475569"}}>✅ ไม่พบ NOTAM ที่ตรงเงื่อนไข</div>}

    {/* LIST VIEW */}
    {view==="list" && allNtms.map(n=>(
      <div key={n.id+n.icao} onClick={()=>setExp(exp===n.id+n.icao?null:n.id+n.icao)}
        style={{border:`1px solid ${PC[n.p]}44`,borderRadius:10,marginBottom:8,background:`${PC[n.p]}06`,cursor:"pointer",borderLeft:`3px solid ${PC[n.p]}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",flexWrap:"wrap"}}>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:PC[n.p]+"30",color:PC[n.p],fontWeight:800,minWidth:42,textAlign:"center"}}>{n.p}</span>
          <span style={{fontFamily:"monospace",fontWeight:900,color:"#38bdf8",fontSize:13}}>{n.id}</span>
          <span style={{fontSize:11,padding:"1px 7px",borderRadius:4,background:(BC[n.branch]||"#64748b")+"22",color:BC[n.branch]||"#64748b",fontWeight:700}}>{n.icao}</span>
          <span style={{fontSize:10,color:"#475569"}}>{n.apName}</span>
          <span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#a78bfa22",color:"#a78bfa"}}>{n.t}</span>
          <div style={{flex:1}}/>
          <span style={{color:"#334155",fontSize:12}}>{exp===n.id+n.icao?"▲":"▼"}</span>
        </div>
        <div style={{borderTop:`1px solid ${PC[n.p]}22`,padding:"10px 14px 12px"}}>
          <pre style={{margin:0,fontFamily:"'Courier New',monospace",fontSize:12,color:"#94a3b8",whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:1.75}}>{n.raw}</pre>
        </div>
      </div>
    ))}

    {/* AIRPORT VIEW */}
    {view==="airport" && (
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {sel.filter(icao=>(activeNotams[icao]||[]).length>0).map(icao=>{
          const ap=AIRPORTS.find(a=>a.icao===icao);
          const bc=BC[ap?.branch]||"#64748b";
          const ntms=(activeNotams[icao]||[]).filter(n=>{
            if(prio!=="ALL"&&n.p!==prio) return false;
            if(search&&!n.raw.toUpperCase().includes(search.toUpperCase())) return false;
            return true;
          });
          if(ntms.length===0) return null;
          return <div key={icao} style={{background:"#0a1120",border:`1px solid ${bc}44`,borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:`1px solid ${bc}33`,background:bc+"10",borderRadius:"10px 10px 0 0"}}>
              <span style={{fontFamily:"monospace",fontWeight:900,fontSize:16,color:bc}}>{icao}</span>
              <span style={{fontSize:11,color:"#94a3b8",flex:1}}>{ap?.name}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:bc+"22",color:bc,fontWeight:700}}>{ap?.branch}</span>
              <span style={{fontSize:10,color:"#334155"}}>{ntms.length} NOTAM</span>
            </div>
            {ntms.map((n,i)=>(
              <div key={n.id} style={{padding:"12px 16px",borderBottom:i<ntms.length-1?"1px solid #0f172a":"none",borderLeft:`3px solid ${PC[n.p]}`}}>
                <div style={{display:"flex",gap:8,marginBottom:6}}>
                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:4,background:PC[n.p]+"30",color:PC[n.p],fontWeight:800}}>{n.p}</span>
                  <span style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"#a78bfa22",color:"#a78bfa"}}>{n.t}</span>
                </div>
                <pre style={{margin:0,fontFamily:"'Courier New',monospace",fontSize:12,color:"#94a3b8",whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:1.75}}>{n.raw}</pre>
              </div>
            ))}
          </div>;
        })}
      </div>
    )}
  </div>;
}

// ── Flight Tab ──────────────────────────────────────────────────────────────────
const EMPTY_FLIGHT = {day:"FRI",date:"",mission:"",ac:"",cs:"",pilot:"",coPilot:"",takeoff:"",land:"",route:"",remark:"",sq:""};
const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const DC   = {MON:"#3b82f6",TUE:"#3b82f6",WED:"#22c55e",THU:"#f97316",FRI:"#3b82f6",SAT:"#a855f7",SUN:"#ef4444"};
const COLS = [{k:"day",l:"DAY",w:70},{k:"date",l:"DATE",w:80},{k:"mission",l:"MISSION",w:150},{k:"ac",l:"A/C",w:60},{k:"cs",l:"C/S",w:90},{k:"pilot",l:"Pilot",w:80},{k:"coPilot",l:"CO-PILOT",w:90},{k:"takeoff",l:"T/O",w:70},{k:"land",l:"L/D",w:70},{k:"route",l:"AREA/ROUTE",w:150},{k:"remark",l:"REMARK",w:160},{k:"sq",l:"SQ.",w:60}];

function FlightForm({init, onSave, onCancel}) {
  const [f, setF] = useState(init || EMPTY_FLIGHT);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:5,padding:"5px 8px",fontSize:12,width:"100%",boxSizing:"border-box"};
  return (
    <div style={{background:"#0f2040",border:"1px solid #2563eb",borderRadius:10,padding:18,marginBottom:14}}>
      <div style={{fontWeight:700,color:"#60a5fa",fontSize:13,marginBottom:12}}>
        {init?"✏️ แก้ไขข้อมูลการบิน":"➕ เพิ่มการบินใหม่"}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8,marginBottom:12}}>
        <div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>DAY</div>
          <select value={f.day} onChange={e=>set("day",e.target.value)} style={inp}>
            {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {[
          {k:"date",l:"DATE (เช่น 29 May)"},
          {k:"mission",l:"MISSION"},
          {k:"ac",l:"A/C"},
          {k:"cs",l:"C/S"},
          {k:"pilot",l:"Pilot"},
          {k:"coPilot",l:"CO-PILOT"},
          {k:"takeoff",l:"T/O (HH:MM)"},
          {k:"land",l:"L/D (HH:MM)"},
          {k:"route",l:"AREA/ROUTE"},
          {k:"remark",l:"REMARK"},
          {k:"sq",l:"SQ."},
        ].map(({k,l})=>(
          <div key={k}>
            <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>{l}</div>
            <input value={f[k]} onChange={e=>set(k,e.target.value)} style={inp} placeholder={l}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"6px 16px",fontSize:12,borderRadius:6,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
        <button onClick={()=>onSave(f)} style={{padding:"6px 18px",fontSize:12,borderRadius:6,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",fontWeight:700}}>บันทึก ✓</button>
      </div>
    </div>
  );
}

function FlightTab() {
  const [flights,  setFlights]  = useState(FLIGHTS);
  const [mode,     setMode]     = useState(null);   // null | "add" | number(edit index)
  const [delIdx,   setDelIdx]   = useState(null);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, color="#22c55e") => {
    setToast({msg, color});
    setTimeout(()=>setToast(null), 2500);
  };

  const handleSave = (f) => {
    if (mode === "add") {
      setFlights(p=>[...p, f]);
      showToast("เพิ่มการบินสำเร็จ ✓");
    } else {
      setFlights(p=>p.map((row,i)=>i===mode?f:row));
      showToast("แก้ไขข้อมูลสำเร็จ ✓");
    }
    setMode(null);
  };

  const handleDelete = (idx) => {
    setFlights(p=>p.filter((_,i)=>i!==idx));
    setDelIdx(null);
    showToast("ลบข้อมูลสำเร็จ","#ef4444");
  };

  const empty = Math.max(0, 6 - flights.length);

  return (
    <div>
      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#4b5563,#374151)",borderRadius:"10px 10px 0 0",padding:"14px 20px",display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:44,height:44,background:"#6b7280",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#d1d5db",fontWeight:700,flexShrink:0}}>WING 2</div>
        <div style={{flex:1,textAlign:"center"}}>
          <span style={{fontSize:22,fontWeight:900,color:"#fff",fontStyle:"italic",letterSpacing:2}}>WING 2 FLIGHT SCHEDULE</span>
        </div>
        <button onClick={()=>setMode("add")} style={{background:"#16a34a",border:"none",color:"#fff",borderRadius:7,padding:"7px 16px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          ＋ เพิ่มการบิน
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:20,right:24,zIndex:999,background:toast.color,color:"#fff",padding:"10px 20px",borderRadius:8,fontWeight:700,fontSize:13,boxShadow:"0 4px 12px #0004"}}>
          {toast.msg}
        </div>
      )}

      {/* Form — Add / Edit */}
      {mode !== null && (
        <div style={{padding:"12px 0 0"}}>
          <FlightForm
            init={mode === "add" ? null : flights[mode]}
            onSave={handleSave}
            onCancel={()=>setMode(null)}
          />
        </div>
      )}

      {/* Confirm Delete */}
      {delIdx !== null && (
        <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid #ef4444",borderRadius:8,padding:"12px 16px",margin:"10px 0",display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#fca5a5",fontSize:13,flex:1}}>
            ⚠️ ยืนยันลบ <b>{flights[delIdx]?.cs || flights[delIdx]?.mission}</b> ?
          </span>
          <button onClick={()=>setDelIdx(null)} style={{padding:"5px 14px",borderRadius:6,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:12}}>ยกเลิก</button>
          <button onClick={()=>handleDelete(delIdx)} style={{padding:"5px 14px",borderRadius:6,border:"none",background:"#ef4444",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>ลบ</button>
        </div>
      )}

      {/* Table */}
      <div style={{background:"#fff",borderRadius: mode!==null?"0":"0 0 10px 10px",overflow:"hidden",border:"1px solid #e2e8f0"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:1100}}>
            <thead>
              <tr style={{background:"#7c3aed"}}>
                {COLS.map(c=>(
                  <th key={c.k} style={{padding:"10px 8px",color:"#fff",fontWeight:800,fontSize:12,textAlign:"center",minWidth:c.w,borderRight:"1px solid #6d28d9"}}>{c.l}</th>
                ))}
                <th style={{padding:"10px 8px",color:"#fff",fontWeight:800,fontSize:12,textAlign:"center",minWidth:80,background:"#6d28d9"}}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f,i)=>{
                const dc = DC[f.day] || "#3b82f6";
                const isEditing = mode === i;
                return (
                  <tr key={i} style={{borderBottom:"1px solid #e2e8f0",background:isEditing?"#eff6ff":i%2===0?"#fff":"#f9fafb"}}>
                    <td style={{padding:"10px 8px",textAlign:"center"}}>
                      <span style={{background:dc,color:"#fff",fontWeight:800,fontSize:11,padding:"3px 8px",borderRadius:4}}>{f.day}</span>
                    </td>
                    <td style={{padding:"10px 8px",textAlign:"center",color:"#374151",fontWeight:600}}>{f.date}</td>
                    <td style={{padding:"10px 8px",color:"#1e293b"}}>{f.mission}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",color:"#1e293b",fontWeight:600}}>{f.ac}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",color:"#1e293b"}}>{f.cs}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",fontWeight:600,color:"#1e293b"}}>{f.pilot}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",color:"#1e293b"}}>{f.coPilot}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,color:"#1e293b"}}>{f.takeoff}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,color:"#1e293b"}}>{f.land}</td>
                    <td style={{padding:"10px 8px",color:"#374151",fontFamily:"monospace",fontSize:12}}>{f.route}</td>
                    <td style={{padding:"10px 8px",color:"#374151",fontSize:12}}>{f.remark}</td>
                    <td style={{padding:"10px 8px",textAlign:"center",fontWeight:600,color:"#374151"}}>{f.sq}</td>
                    <td style={{padding:"8px",textAlign:"center"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                        <button onClick={()=>setMode(mode===i?null:i)}
                          style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:"1px solid #3b82f6",background:isEditing?"#3b82f6":"transparent",color:isEditing?"#fff":"#3b82f6",cursor:"pointer",fontWeight:600}}>
                          {isEditing?"✕":"✏️"}
                        </button>
                        <button onClick={()=>setDelIdx(i)}
                          style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer",fontWeight:600}}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {Array.from({length:empty}).map((_,i)=>(
                <tr key={"e"+i} style={{borderBottom:"1px solid #e2e8f0",background:(flights.length+i)%2===0?"#fff":"#f9fafb"}}>
                  {COLS.map(c=><td key={c.k} style={{padding:"12px 8px",height:44}}>&nbsp;</td>)}
                  <td style={{padding:"12px 8px"}}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{textAlign:"center",padding:"6px 0 12px",fontSize:72,fontWeight:900,color:"#e2e8f0",userSelect:"none",lineHeight:1}}>201</div>
      </div>

      {/* Summary */}
      <div style={{marginTop:10,fontSize:11,color:"#475569",textAlign:"right"}}>
        รวม {flights.length} sortie · ข้อมูลเก็บในหน่วยความจำ (refresh = reset)
      </div>
    </div>
  );
}

// ── Duty Tab ────────────────────────────────────────────────────────────────────
function DutyTab() {
  const [view,setView]=useState("daily");
  const sq=DUTY_TODAY.sqdn201;
  const hdr=(bg="#2563eb")=>({background:bg,color:"#fff",padding:"8px 14px",fontWeight:800,fontSize:12,letterSpacing:1,textAlign:"center"});
  const rowBg=t=>t==="saturday"?"#ede9fe":t==="sunday"||t==="holiday"?"#fce7f3":"#fff";
  const dayC =t=>t==="saturday"?"#7c3aed":t==="sunday"||t==="holiday"?"#dc2626":"#1e293b";

  return <div style={{background:"#f8fafc",minHeight:"80vh"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px 0"}}>
      <div style={{display:"flex",background:"#e2e8f0",borderRadius:8,padding:3,gap:2}}>
        {["daily","monthly"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"6px 16px",borderRadius:6,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:view===v?"#fff":"transparent",color:view===v?"#1e293b":"#64748b",boxShadow:view===v?"0 1px 4px #0002":"none"}}>
            {v==="daily"?"📋 รายวัน":"📅 ประจำเดือน"}
          </button>
        ))}
      </div>
      <div style={{textAlign:"center",flex:1}}>
        <div style={{display:"inline-block",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",borderRadius:10,padding:"10px 48px"}}>
          <span style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:2}}>PILOTS ON DUTY</span>
        </div>
      </div>
      <div style={{background:"#374151",color:"#fff",fontWeight:800,fontSize:12,padding:"8px 18px",borderRadius:6}}>MAIN PAGE</div>
    </div>

    {/* DAILY */}
    {view==="daily"&&<div style={{padding:"14px 24px"}}>
      <div style={{textAlign:"center",margin:"10px 0 18px"}}>
        <span style={{fontSize:24,fontWeight:900,color:"#1e293b"}}>TODAY</span>
        <span style={{fontSize:18,color:"#64748b",marginLeft:14}}>{DUTY_TODAY.date}</span>
      </div>
      <div style={{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"}}>
        {/* 201 SQ */}
        <div style={{flex:"0 0 330px"}}>
          <div style={{textAlign:"center",marginBottom:10}}><span style={{background:"#2563eb",color:"#fff",fontWeight:900,fontSize:15,padding:"6px 22px",borderRadius:6}}>201 SQUADRON</span></div>
          <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #cbd5e1"}}>
            {[["ALERT 1","TEL."],[sq.alert1.name,sq.alert1.tel],["SOF ▾","TEL."],[sq.sof.name,sq.sof.tel],["EMERGENCY ▾","TOPIC"],[sq.emergency.name||"\u00A0",sq.emergency.topic||"\u00A0"],["BASE OPS. ▾","Tel.BaseOps"],[sq.baseOps.name,sq.baseOps.tel]].map(([a,b],i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",...(i%2===0?{background:"#2563eb"}:{borderBottom:"1px solid #e2e8f0"})}}>
                {i%2===0?<><div style={hdr()}>{a}</div><div style={hdr()}>{b}</div></>:<><div style={{padding:"12px 14px",fontSize:14,fontWeight:600,color:"#1e293b",textAlign:"center"}}>{a}</div><div style={{padding:"12px 14px",fontSize:14,color:"#1e293b",textAlign:"center",fontFamily:"monospace"}}>{b}</div></>}
              </div>
            ))}
            <div style={{background:"#334155",padding:"8px 14px",textAlign:"center"}}><span style={{color:"#fff",fontWeight:800,fontSize:12}}>REMARK ▾</span></div>
            <div style={{padding:"12px 14px",minHeight:40,fontSize:14,color:"#94a3b8"}}>{sq.remark||"\u00A0"}</div>
          </div>
        </div>
        {/* Right */}
        <div style={{flex:1,minWidth:240}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[{label:"9923 DETACHMENT",color:"#f97316",list:DUTY_TODAY.det9923},{label:"C SQUADRON",color:"#eab308",list:DUTY_TODAY.cSqdn}].map(g=>(
              <div key={g.label}>
                <div style={{textAlign:"center",marginBottom:8}}><span style={{background:g.color,color:"#fff",fontWeight:900,fontSize:14,padding:"5px 16px",borderRadius:6}}>{g.label}</span></div>
                {g.list.map((n,i)=><div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"12px",textAlign:"center",fontSize:15,fontWeight:600,color:"#1e293b",marginBottom:7}}>{n}</div>)}
              </div>
            ))}
          </div>
          {/* Tomorrow */}
          <div style={{marginTop:20}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
              <span style={{fontSize:20,fontWeight:900,color:"#1e293b",border:"2px solid #94a3b8",borderRadius:8,padding:"3px 16px"}}>TOMORROW</span>
              <span style={{fontSize:16,color:"#64748b"}}>{DUTY_TMR.date}</span>
            </div>
            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #cbd5e1"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#374151"}}>
                {["ALERT 1 ▾","SOF","EMERGENCY BRIEF"].map(h=><div key={h} style={{padding:"8px",color:"#fff",fontWeight:800,fontSize:11,textAlign:"center"}}>{h}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                <div style={{padding:"12px",fontSize:14,fontWeight:600,color:"#1e293b",textAlign:"center"}}>{DUTY_TMR.alert1}</div>
                <div style={{padding:"12px",fontSize:14,color:"#94a3b8",textAlign:"center"}}>{DUTY_TMR.sof}</div>
                <div style={{padding:"12px",fontSize:14,color:"#94a3b8",textAlign:"center"}}>{DUTY_TMR.brief}</div>
              </div>
            </div>
            <div onClick={()=>setView("monthly")} style={{marginTop:10,background:"#e2e8f0",borderRadius:8,padding:"12px",textAlign:"center",cursor:"pointer",border:"1px solid #cbd5e1"}}>
              <span style={{fontWeight:800,color:"#1e293b",fontSize:13,textDecoration:"underline"}}>Pilots on duty monthly schedule CLICK !!!</span>
            </div>
          </div>
        </div>
      </div>
    </div>}

    {/* MONTHLY */}
    {view==="monthly"&&<div style={{padding:"12px 24px"}}>
      <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
            <thead><tr style={{background:"#4f46e5"}}>
              {["DAY","DATE","ALERT","SOF","BASE OPS.","อบรมวิชาการ","9923","C SQDN","REMARK"].map(h=><th key={h} style={{padding:"9px 10px",color:"#fff",fontWeight:800,fontSize:11,textAlign:"center",borderRight:"1px solid #4338ca"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {MONTHLY.map((r,i)=>{
                const isToday=r.date==="29 May";
                return <tr key={i} style={{borderBottom:"1px solid #e2e8f0",background:isToday?"#dbeafe":rowBg(r.type),outline:isToday?"2px solid #3b82f6":"none"}}>
                  <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:dayC(r.type),whiteSpace:"nowrap"}}>{r.day}{isToday&&<span style={{marginLeft:4,fontSize:9,background:"#3b82f6",color:"#fff",borderRadius:3,padding:"1px 4px"}}>TODAY</span>}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",fontWeight:600,color:dayC(r.type),whiteSpace:"nowrap"}}>{r.date}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",fontWeight:600,color:"#1e293b"}}>{r.alert}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",color:"#374151"}}>{r.sof}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",color:"#374151"}}>{r.base}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",fontSize:11,color:"#374151"}}>{r.topic}</td>
                  <td style={{padding:"8px 10px",fontSize:11,color:"#374151"}}>{r.d9923}</td>
                  <td style={{padding:"8px 10px",fontSize:11,color:"#374151"}}>{r.csqdn}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",color:r.rmk?"#dc2626":"#94a3b8",fontWeight:r.rmk?700:400,fontSize:11}}>{r.rmk}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>}
  </div>;
}

// ── Aircraft Tab ────────────────────────────────────────────────────────────────
const STATUSES = ["FMC","PMC","NMC","INSP"];

function AcForm({init, isGroupA, onSave, onCancel}) {
  const [f,setF] = useState(JSON.parse(JSON.stringify(init)));
  const setC = (k,v) => setF(p=>({...p, cols:{...p.cols,[k]:v}}));
  const set  = (k,v) => setF(p=>({...p,[k]:v}));
  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:5,padding:"5px 8px",fontSize:12,width:"100%",boxSizing:"border-box"};
  const lbl = (t) => <div style={{fontSize:11,color:"#64748b",marginBottom:3}}>{t}</div>;
  const hrs = isGroupA
    ? [{k:"h50",l:"50 Hr."},{k:"h375",l:"375 Hr."},{k:"h750",l:"750 Hr."},{k:"h1500",l:"1500 Hr."}]
    : [{k:"h40",l:"40 Hr."},{k:"h120",l:"120 Hr."},{k:"h480",l:"480 Hr."},{k:"h960",l:"960 Hr."}];
  const inspKey = isGroupA ? "insp30" : "insp90";
  const inspLbl = isGroupA ? "30 DAYS" : "90 DAYS";

  return (
    <div style={{background:"#0f2040",border:"1px solid #2563eb",borderRadius:10,padding:18,marginBottom:14}}>
      <div style={{fontWeight:700,color:"#60a5fa",fontSize:13,marginBottom:12}}>✏️ แก้ไขสถานะอากาศยาน</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8,marginBottom:12}}>
        {/* ID */}
        <div>{lbl("หมายเลข A/C")}<input value={f.id} onChange={e=>set("id",e.target.value)} style={inp} placeholder="เช่น 920129"/></div>
        {/* STATUS */}
        <div>{lbl("สถานะ")}
          <select value={f.status} onChange={e=>set("status",e.target.value)} style={inp}>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {/* ชั่วโมง */}
        {hrs.map(({k,l})=>(
          <div key={k}>{lbl(l)}<input value={f.cols[k]} onChange={e=>setC(k,e.target.value)} style={inp} placeholder="0"/></div>
        ))}
        {/* Trouble */}
        <div style={{gridColumn:"span 2"}}>{lbl("Trouble / Remarks")}<input value={f.trouble} onChange={e=>set("trouble",e.target.value)} style={inp}/></div>
        {/* Inspection dates */}
        <div>{lbl(inspLbl+" (วันที่ตรวจ)")}<input value={f[inspKey]} onChange={e=>set(inspKey,e.target.value)} style={inp} placeholder="เช่น 19 Jun 2026"/></div>
        <div>{lbl("12 MONTH")}<input value={f.insp12} onChange={e=>set("insp12",e.target.value)} style={inp} placeholder="เช่น 30 Nov 2025"/></div>
        {/* Remark */}
        <div style={{gridColumn:"span 2"}}>{lbl("Remark")}<input value={f.remark} onChange={e=>set("remark",e.target.value)} style={inp}/></div>
        {/* System checks */}
        <div style={{gridColumn:"span 4"}}>
          {lbl("ระบบ (เช็ก = พร้อม)")}
          <div style={{display:"flex",gap:16}}>
            {["com","nav","radar","emer"].map(k=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#e2e8f0",cursor:"pointer"}}>
                <input type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked?1:0)} style={{width:15,height:15}}/>
                {k.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"6px 16px",fontSize:12,borderRadius:6,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
        <button onClick={()=>onSave(f)} style={{padding:"6px 18px",fontSize:12,borderRadius:6,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",fontWeight:700}}>บันทึก ✓</button>
      </div>
    </div>
  );
}

function AcTable({title, list, setList, cols, colKeys, inspLabel, inspKey, isGroupA}) {
  const [mode,  setMode]  = useState(null);  // null | index
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),2500); };

  const handleSave = (f) => {
    setList(p=>p.map((r,i)=>i===mode?f:r));
    showToast("แก้ไขข้อมูลสำเร็จ ✓");
    setMode(null);
  };

  return (
    <div style={{background:"rgba(15,23,42,0.92)",border:"1px solid #1e3a5f",borderRadius:12,overflow:"hidden",marginBottom:14}}>
      {/* Toast */}
      {toast && <div style={{position:"fixed",top:20,right:24,zIndex:999,background:"#22c55e",color:"#fff",padding:"10px 20px",borderRadius:8,fontWeight:700,fontSize:13,boxShadow:"0 4px 12px #0004"}}>{toast}</div>}

      {/* Group header */}
      <div style={{background:"linear-gradient(90deg,#1e293b,#0f172a)",padding:"10px 16px"}}>
        <span style={{fontSize:13,fontWeight:800,color:"#e2e8f0",letterSpacing:1}}>🛩 {title}</span>
      </div>

      {/* Edit Form */}
      {mode !== null && (
        <div style={{padding:"12px 14px 0"}}>
          <AcForm init={list[mode]} isGroupA={isGroupA} onSave={handleSave} onCancel={()=>setMode(null)}/>
        </div>
      )}

      {/* Table */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#2563eb"}}>
              <th style={{padding:"8px",color:"#fff",fontWeight:800,textAlign:"center",minWidth:120}}>STATUS / ID</th>
              {cols.map(c=><th key={c} style={{padding:"8px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:65}}>{c}</th>)}
              <th style={{padding:"8px",color:"#fff",fontWeight:700,textAlign:"left",minWidth:140}}>Trouble</th>
              {["COM","NAV","RADAR","EMER"].map(h=><th key={h} style={{padding:"8px 5px",color:"#60a5fa",fontWeight:700,textAlign:"center",minWidth:44}}>{h}</th>)}
              <th style={{padding:"8px",color:"#60a5fa",fontWeight:700,textAlign:"left",minWidth:120}}>Remark</th>
              <th style={{padding:"8px",color:"#60a5fa",fontWeight:700,textAlign:"center",minWidth:60}}>แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {list.map((ac,i)=>{
              const s=SB[ac.status]||SB.FMC;
              const isNMC=ac.status==="NMC";
              const bg=isNMC?"rgba(220,38,38,0.08)":i%2===0?"rgba(30,41,59,0.4)":"rgba(15,23,42,0.6)";
              const pi=ac[inspKey]; const p12=ac.insp12;
              const past=p12&&p12!=="null"&&new Date(p12)<new Date();
              const isEditing=mode===i;
              return (
                <tr key={ac.id+i} style={{borderBottom:"1px solid #1e293b",outline:isEditing?"1px solid #3b82f6":"none"}}>
                  <td style={{padding:0,background:bg,verticalAlign:"middle"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 6px",gap:3}}>
                      <span style={{fontSize:15,fontWeight:900,color:"#f1f5f9",fontFamily:"monospace"}}>{ac.id}</span>
                      <span style={{fontSize:11,fontWeight:800,padding:"2px 10px",borderRadius:4,background:s.bg,color:s.c}}>{ac.status}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"center",gap:8,padding:"2px 6px 7px",fontSize:10,color:"#64748b"}}>
                      <span>{inspLabel} <span style={{color:pi==="null"?"#ef4444":"#60a5fa",fontFamily:"monospace"}}>{pi||"-"}</span></span>
                      <span>12M <span style={{color:past?"#ef4444":"#f59e0b",fontFamily:"monospace"}}>{p12||"-"}</span></span>
                    </div>
                  </td>
                  {colKeys.map(k=><td key={k} style={{padding:"10px 8px",textAlign:"center",fontFamily:"monospace",fontWeight:700,fontSize:13,color:isNMC?"#fca5a5":"#e2e8f0",background:bg}}>{ac.cols[k]??"-"}</td>)}
                  <td style={{padding:"10px",fontSize:12,color:isNMC?"#fca5a5":"#94a3b8",background:isNMC?"rgba(220,38,38,0.15)":bg,fontWeight:isNMC?700:400}}>{ac.trouble||"-"}</td>
                  {["com","nav","radar","emer"].map(k=>(
                    <td key={k} style={{padding:"8px 5px",textAlign:"center",background:bg}}>
                      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:4,
                        background:ac[k]?"#15803d":"#7f1d1d",border:ac[k]?"2px solid #22c55e":"2px solid #ef4444",
                        fontSize:13,color:ac[k]?"#86efac":"#fca5a5"}}>
                        {ac[k]?"✓":"✗"}
                      </span>
                    </td>
                  ))}
                  <td style={{padding:"10px",fontSize:12,color:ac.remark?"#f59e0b":"#475569",background:bg}}>{ac.remark||"-"}</td>
                  <td style={{padding:"8px",textAlign:"center",background:bg}}>
                    <button onClick={()=>setMode(isEditing?null:i)}
                      style={{padding:"4px 10px",fontSize:11,borderRadius:5,border:"1px solid #3b82f6",
                        background:isEditing?"#3b82f6":"transparent",color:isEditing?"#fff":"#3b82f6",cursor:"pointer"}}>
                      {isEditing?"✕":"✏️"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AcTab() {
  const [listA, setListA] = useState(AIRCRAFT_A);
  const [listB, setListB] = useState(AIRCRAFT_B);
  const all=[...listA,...listB];
  const counts=Object.fromEntries(Object.keys(SB).map(k=>[k,all.filter(a=>a.status===k).length]));

  return <div>
    {/* Summary badges */}
    <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      {Object.entries(SB).map(([k,v])=>(
        <div key={k} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(30,41,59,0.7)",border:`1px solid ${v.c}33`,borderRadius:8,padding:"6px 12px"}}>
          <span style={{fontSize:12,padding:"2px 8px",borderRadius:4,background:v.bg,color:v.c,fontWeight:800}}>{k}</span>
          <span style={{fontSize:14,fontWeight:800,color:v.c,fontFamily:"monospace"}}>{counts[k]}</span>
          <span style={{fontSize:11,color:"#64748b"}}>ลำ</span>
        </div>
      ))}
      <div style={{marginLeft:"auto",fontSize:11,color:"#475569"}}>
        รวม {all.length} ลำ · DATE: <span style={{color:"#38bdf8",fontFamily:"monospace"}}>29 May 2026</span>
      </div>
    </div>

    <AcTable
      title="ฮ.ชนิดที่ 1 (920 Series)"
      list={listA} setList={setListA} isGroupA={true}
      cols={["50 Hr.","375 Hr.","750 Hr.","1500 Hr."]}
      colKeys={["h50","h375","h750","h1500"]}
      inspLabel="30 DAYS" inspKey="insp30"
    />
    <AcTable
      title="ฮ.ชนิดที่ 2 (704 Series)"
      list={listB} setList={setListB} isGroupA={false}
      cols={["40 Hr.","120 Hr.","480 Hr.","960 Hr."]}
      colKeys={["h40","h120","h480","h960"]}
      inspLabel="90 DAYS" inspKey="insp90"
    />
  </div>;
}

// ── App ─────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("dashboard");
  const allAc=[...AIRCRAFT_A,...AIRCRAFT_B];
  const fmc=allAc.filter(a=>a.status==="FMC").length;
  const allN=Object.values(NOTAMS).flat();
  const hiN=allN.filter(n=>n.p==="HIGH").length;
  const TABS=[{id:"dashboard",l:"🏠 Dashboard"},{id:"notam",l:"📡 NOTAM"},{id:"flight",l:"✈️ ตารางบิน"},{id:"duty",l:"📋 ตารางเวร"},{id:"aircraft",l:"🛩️ สถานะเครื่องบิน"}];

  return <div style={{background:"#020817",minHeight:"100vh",fontFamily:"'Sarabun','IBM Plex Sans Thai',sans-serif",color:"#e2e8f0"}}>
    {/* Header */}
    <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)",borderBottom:"2px solid #1d4ed8",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:44,height:44,background:"linear-gradient(135deg,#1d4ed8,#0ea5e9)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>✈</div>
        <div>
          <div style={{fontWeight:900,fontSize:16,color:"#f1f5f9",letterSpacing:1}}>ระบบบริหารจัดการฝูงบิน</div>
          <div style={{fontSize:11,color:"#60a5fa",letterSpacing:2}}>SQUADRON MANAGEMENT SYSTEM · PROTOTYPE</div>
        </div>
      </div>
      <Clock/>
    </div>
    {/* Nav */}
    <div style={{background:"#0f172a",borderBottom:"1px solid #1e293b",padding:"0 24px",display:"flex",gap:2,overflowX:"auto"}}>
      {TABS.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 16px",fontSize:12,fontWeight:600,background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap",color:tab===t.id?"#38bdf8":"#64748b",borderBottom:tab===t.id?"2px solid #38bdf8":"2px solid transparent"}}>
          {t.l}
        </button>
      ))}
    </div>
    <div style={{padding:"20px 24px"}}>
      {/* Dashboard */}
      {tab==="dashboard"&&<div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
          <Card label="อากาศยาน FMC" value={`${fmc}/${allAc.length}`} sub="พร้อมปฏิบัติการ" color="#22c55e"/>
          <Card label="ตารางบินวันนี้" value={FLIGHTS.length} sub="sortie" color="#38bdf8"/>
          <Card label="NOTAM HIGH" value={hiN} sub={`ทั้งหมด ${allN.length} รายการ`} color="#ef4444"/>
          <Card label="สนามบินทหาร" value={AIRPORTS.length} sub="แห่งทั่วประเทศ" color="#a78bfa"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Sec title="NOTAM HIGH วันนี้" icon="🚨">
            {allN.filter(n=>n.p==="HIGH").map((n,i)=>(
              <div key={i} style={{padding:"7px 0 7px 10px",borderBottom:"1px solid #1e293b",borderLeft:"2px solid #ef4444"}}>
                <div style={{fontFamily:"monospace",fontSize:11,fontWeight:800,color:"#38bdf8"}}>{n.raw.split("\n")[0]}</div>
                <div style={{fontFamily:"monospace",fontSize:10,color:"#94a3b8",marginTop:2}}>{(n.raw.split("\n").find(l=>l.trim().startsWith("E)"))||"").trim()}</div>
              </div>
            ))}
          </Sec>
          <Sec title="สถานะอากาศยาน" icon="🛩️">
            {allAc.map(ac=>{
              const s=SB[ac.status];
              return <div key={ac.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid #1e293b"}}>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:s.bg,color:s.c,fontWeight:800,minWidth:36,textAlign:"center"}}>{ac.status}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{ac.id}</div>
                  {ac.remark&&<div style={{fontSize:10,color:"#f59e0b"}}>{ac.remark}</div>}
                  {!ac.remark&&ac.status==="NMC"&&<div style={{fontSize:10,color:"#fca5a5"}}>{ac.trouble}</div>}
                </div>
                <div style={{fontSize:10,color:"#475569"}}>{ac.insp30||ac.insp90||"-"}</div>
              </div>;
            })}
          </Sec>
          <Sec title="ตารางบินวันนี้" icon="✈️">
            {FLIGHTS.map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #1e293b"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#3b82f6",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{f.cs} · {f.mission}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{f.pilot} / {f.coPilot} · {f.route}</div>
                </div>
                <div style={{fontSize:11,color:"#94a3b8",fontFamily:"monospace"}}>{f.takeoff}–{f.land}</div>
              </div>
            ))}
          </Sec>
        </div>
      </div>}
      {tab==="notam"   &&<NotamTab/>}
      {tab==="flight"  &&<FlightTab/>}
      {tab==="duty"    &&<DutyTab/>}
      {tab==="aircraft"&&<AcTab/>}
      <div style={{textAlign:"center",color:"#1e3a5f",fontSize:11,marginTop:10,letterSpacing:1}}>SQUADRON MANAGEMENT SYSTEM · PROTOTYPE</div>
    </div>
  </div>;
}
