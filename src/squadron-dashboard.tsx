import { useState, useEffect, useRef } from "react";

// ── Google Sheets Sync ────────────────────────────────────────────────────────
const GAS_URL = "https://script.google.com/macros/s/AKfycbxZEZnOBoCrRutNrHzvzLbJIuQv_8jbWvHXLJ4O-tjSrabjpXualOZgv8sld3EH8HA5/exec";

async function saveToSheet(sheetName: string, rows: any[][]) {
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ sheet: sheetName, data: rows }),
    });
    console.log("saveToSheet", sheetName, await res.text());
  } catch (e) {
    console.error("Save failed", e);
  }
}

async function loadFromSheet(sheetName: string): Promise<any[][]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // timeout 8 วินาที
    const res = await fetch(`${GAS_URL}?sheet=${encodeURIComponent(sheetName)}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = "";
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell);
        result.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    result.push(row);
  }
  return result;
}

async function loadNotamFromCSV(): Promise<any[][]> {
  try {
    const spreadsheetId = "1T3Hn14YVKHtJBFzaX2R_8bAQI1iPZ4OFVmLRSd2Z1TI";
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=NOTAM`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const csvText = await res.text();
    return parseCSV(csvText);
  } catch (e) {
    console.error("Failed to load NOTAM CSV", e);
    return [];
  }
}

function cleanRawText(val: string): string {
  if (!val) return "";
  let clean = val.trim();
  
  // 1. Remove trailing divider and signature
  clean = clean.replace(/\n*-+\s*UPDATED ON[\s\S]*$/i, "");
  
  let prev;
  do {
    prev = clean;
    // 2. Remove trailing airport headings like "13. สนามบินปัตตานี (VTSK)"
    clean = clean.replace(/\n+\d+\.\s*สนามบิน[ก-๙a-zA-Z\s\-\(\)]+(?:\([A-Z]{4}\))?\s*(\n+\s*\()?$/g, "");
    
    // 3. Remove other trailing section headers
    clean = clean.replace(/\n+(?:UNMANNED AIRCRAFT|AERIAL PHOTO|AREA|UPDATE AIP THAILAND|FLIGHT PLANNING\s*:\s*ROUTE)\s*(\n+\s*\()?$/gi, "");
    
    // 4. Remove dangling parentheses
    clean = clean.replace(/\n+\s*\($/, "");
    
    clean = clean.trim();
  } while (clean !== prev);
  
  return clean;
}

import DatePicker from "./components/DatePicker";
import HeloImg from "./components/HeloImg";

const isMobile = typeof window !== "undefined" && window.screen.width < 768;

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDriveUrl(url: string): string {
  if (!url) return "";
  let fileId = "";
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];
  else if (m2) fileId = m2[1];
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
}

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

const HELO_IMG: Record<string,string> = {
  "920131": `data:image/png;base64,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`,
  "920129": `data:image/png;base64,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`,
  "920133": `data:image/png;base64,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`,
  "920286": `data:image/png;base64,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`,
  "920298": `data:image/png;base64,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`,
  "704040": `data:image/png;base64,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`,
  "704103": `data:image/png;base64,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`,
  "704104": `data:image/png;base64,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`,
  "704056": `data:image/png;base64,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`,
  "704060": `data:image/png;base64,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`,
};


const PC = {HIGH:"#ef4444",MED:"#f59e0b",LOW:"#22c55e"};
const PL = {HIGH:"วิกฤต",MED:"ปานกลาง",LOW:"ทั่วไป"};
const SB = {FMC:{bg:"#14532d",c:"#86efac"},PMC:{bg:"#713f12",c:"#fde68a"},NMC:{bg:"#7f1d1d",c:"#fca5a5"},INSP:{bg:"#1e3a5f",c:"#93c5fd"}};
const BC = {"ทอ.":"#3b82f6","ทบ.":"#22c55e","ทร.":"#f59e0b"};

import { Clock, Card, Sec } from "./components/CommonUI";

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
      display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"25px",overflowY:"auto"}}>
      <div style={{background:"#0a1120",border:"1px solid #1e3a5f",borderRadius:18,
        width:"100%",maxWidth:980,boxShadow:"0 12px 48px #000c",display:"flex",flexDirection:"column"}}>

        {/* ── Modal Header ── */}
        <div style={{padding:"20px 28px",borderBottom:"1px solid #1e3a5f",display:"flex",alignItems:"center",gap:15}}>
          <span style={{fontSize:19,fontWeight:800,color:"#e2e8f0",letterSpacing:1}}>🔍 ตรวจสอบ NOTAM ก่อน Import</span>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:10,fontSize:15}}>
            <span style={{background:"#14532d",color:"#86efac",padding:"3px 15px",borderRadius:25,fontWeight:700}}>✓ {totalValid}</span>
            {totalInvalid>0 && <span style={{background:"#7f1d1d",color:"#fca5a5",padding:"3px 15px",borderRadius:25,fontWeight:700}}>✗ {totalInvalid}</span>}
            {totalWarn>0    && <span style={{background:"#713f12",color:"#fde68a",padding:"3px 15px",borderRadius:25,fontWeight:700}}>⚠ {totalWarn}</span>}
            <span style={{color:"var(--text-secondary)",fontSize:14,alignSelf:"center"}}>{results.length} รายการ · {airports.length} สนามบิน</span>
          </div>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div style={{display:"flex",flex:1,minHeight:0}}>

          {/* Sidebar — รายชื่อสนามบิน */}
          <div style={{width:225,flexShrink:0,borderRight:"1px solid #1e293b",overflowY:"auto",
            maxHeight:"65vh",padding:"12px 10px"}}>
            <div style={{fontSize:12,color:"var(--text-secondary)",letterSpacing:1,padding:"5px 10px 10px",fontWeight:700}}>สนามบิน</div>
            {airports.map(icao => {
              const st  = apStatus(icao);
              const rs  = byAirport[icao];
              const cnt = rs.length;
              const err = rs.filter(r=>!r.valid).length;
              const ok  = rs.filter(r=>r.valid).length;
              const isSel = selAp === icao;
              return (
                <button key={icao} onClick={()=>{ setSelAp(icao); setExpanded(null); setFilter("all"); }}
                  style={{width:"100%",textAlign:"left",padding:"10px 12px",borderRadius:10,border:`1px solid ${isSel?st.dot+"88":"transparent"}`,
                    background:isSel?st.bg:"transparent",cursor:"pointer",marginBottom:5,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:st.dot,flexShrink:0,
                    boxShadow:isSel?`0 0 6px ${st.dot}`:""}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:isSel?st.dot:"#94a3b8"}}>{icao}</div>
                    <div style={{fontSize:12,color:"var(--text-secondary)"}}>
                      {err>0?<span style={{color:"#ef4444"}}>✗{err} </span>:null}
                      <span style={{color:"#22c55e"}}>✓{ok}</span>
                    </div>
                  </div>
                  <span style={{fontSize:12,color:"#334155",fontFamily:"monospace"}}>{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* Main panel */}
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

            {/* Airport header */}
            {selAp && (
              <div style={{padding:"15px 22px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontFamily:"monospace",fontSize:20,fontWeight:900,color:"#38bdf8"}}>{selAp}</span>
                <span style={{fontSize:14,color:"var(--text-secondary)"}}>{apResults.length} NOTAM</span>
                <div style={{display:"flex",gap:5,marginLeft:10}}>
                  {[
                    {k:"all",  l:`ทั้งหมด (${apResults.length})`},
                    {k:"error",l:`Error (${apInvalid})`,  c:"#ef4444"},
                    {k:"warn", l:`Warning (${apWarn})`,   c:"#f59e0b"},
                    {k:"ok",   l:`ผ่าน (${apValid})`,     c:"#22c55e"},
                  ].map(({k,l,c})=>(
                    <button key={k} onClick={()=>setFilter(k)}
                      style={{padding:"3px 12px",fontSize:14,borderRadius:6,border:`1px solid ${filter===k?(c||"#38bdf8"):"#1e293b"}`,
                        background:filter===k?(c||"#38bdf8")+"22":"transparent",
                        color:filter===k?(c||"#38bdf8"):"var(--text-secondary)",cursor:"pointer",fontWeight:600}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* NOTAM list */}
            <div style={{flex:1,overflowY:"auto",maxHeight:"55vh",padding:"12px 20px"}}>
              {shown.length === 0 && (
                <div style={{textAlign:"center",padding:"38px",color:"var(--text-secondary)",fontSize:16}}>
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
                  <div key={r.id+i} style={{border:`1px solid ${color}33`,borderRadius:10,marginBottom:8,
                    background:`${color}06`,borderLeft:`3px solid ${color}`}}>
                    {/* Row */}
                    <div onClick={()=>setExpanded(isExp?null:r.id+i)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 15px",cursor:"pointer",flexWrap:"wrap"}}>
                      <span style={{fontSize:15,fontWeight:800,color,minWidth:18}}>{icon}</span>
                      <span style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:"#38bdf8"}}>{r.id}</span>
                      <span style={{fontSize:14,padding:"1px 9px",borderRadius:12,background:color+"22",color,fontWeight:700}}>{r.p}</span>
                      <span style={{fontSize:12,color:"var(--text-secondary)"}}>{r.t}</span>
                      {r.icaos.length>1 && <span style={{fontSize:12,color:"var(--text-secondary)"}}>→ {r.icaos.slice(1).join(", ")}</span>}
                      {hasErr && <span style={{fontSize:12,color:"#fca5a5",marginLeft:5}}>
                        {r.errors.length} error{r.errors.length>1?"s":""}</span>}
                      {!hasErr&&hasWrn && <span style={{fontSize:12,color:"#fde68a",marginLeft:5}}>
                        {r.warnings.length} warning{r.warnings.length>1?"s":""}</span>}
                      <div style={{flex:1}}/>
                      <span style={{color:"#334155",fontSize:14}}>{isExp?"▲":"▼"}</span>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div style={{borderTop:`1px solid ${color}22`,padding:"12px 15px 15px"}}>
                        {/* Pattern check */}
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:14,color:"#60a5fa",fontWeight:700,marginBottom:8,letterSpacing:1}}>PATTERN CHECK</div>
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
                            <div key={field} style={{display:"flex",alignItems:"center",gap:10,padding:"3px 0",
                              borderBottom:"1px solid #0f172a",fontSize:14}}>
                              <span style={{color:ok?"#22c55e":req?"#ef4444":"var(--text-secondary)",minWidth:18,flexShrink:0}}>
                                {ok?"✓":req?"✗":"○"}
                              </span>
                              <span style={{color:"var(--text-secondary)",minWidth:250}}>{field}</span>
                              <span style={{fontSize:12,color:req?"var(--text-secondary)":"#334155"}}>
                                {req?"required":"optional"}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Errors & Warnings */}
                        {r.errors.map((e,j)=>(
                          <div key={"e"+j} style={{display:"flex",gap:8,padding:"4px 0",fontSize:14,color:"#fca5a5"}}>
                            <span>✗</span><span>{e}</span>
                          </div>
                        ))}
                        {r.warnings.map((w,j)=>(
                          <div key={"w"+j} style={{display:"flex",gap:8,padding:"4px 0",fontSize:14,color:"#fde68a"}}>
                            <span>⚠</span><span>{w}</span>
                          </div>
                        ))}
                        {/* Raw */}
                        <div style={{fontSize:12,color:"#334155",marginTop:10,marginBottom:5,fontWeight:700}}>RAW TEXT</div>
                        <pre style={{margin:0,fontFamily:"monospace",fontSize:14,color:"var(--text-secondary)",
                          whiteSpace:"pre-wrap",background:"#020817",padding:"12px",borderRadius:8,lineHeight:2}}>
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
        <div style={{padding:"18px 28px",borderTop:"1px solid #1e293b",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontSize:15}}>
            {totalInvalid>0
              ? <span style={{color:"#fca5a5"}}>⚠️ {totalInvalid} NOTAM ไม่ผ่าน — จะ import เฉพาะ {totalValid} รายการที่ผ่าน</span>
              : <span style={{color:"#86efac"}}>✅ ทั้งหมด {totalValid} รายการผ่านการตรวจสอบ พร้อม import</span>
            }
          </div>
          <button onClick={onCancel}
            style={{padding:"9px 22px",fontSize:15,borderRadius:9,border:"1px solid #334155",
              background:"transparent",color:"#94a3b8",cursor:"pointer"}}>
            ยกเลิก
          </button>
          <button onClick={()=>onConfirm(results.filter(r=>r.valid))} disabled={totalValid===0}
            style={{padding:"9px 28px",fontSize:15,borderRadius:9,border:"none",fontWeight:700,
              background:totalValid>0?"#1d4ed8":"#1e293b",
              color:totalValid>0?"#fff":"var(--text-secondary)",
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

  // ดึงข้อมูล NOTAM จาก Google Sheets อัตโนมัติเมื่อแถบนี้ถูกโหลดขึ้นมา
  useEffect(() => {
    setUploading(true);
    loadNotamFromCSV().then(rows => {
      if (rows.length > 1) {
        // แถวที่ 0 คือ Header: [ID, ICAO, Type, Start_Time, End_Time, Description, Status, Update_Time, Raw_Text]
        // คัดกรองข้อมูลคอลัมน์ดัชนี 8 (Raw_Text) หรือดัชนี 5 (Description) ของแต่ละแถว และนำมารวมกันเป็นข้อความก้อนใหญ่
        const rawTexts = rows.slice(1).map(r => {
          let val = r[8] || r[5];
          val = cleanRawText(val);
          if (val && !val.trim().startsWith("(")) {
            val = "(" + val.trim() + ")";
          }
          return val;
        }).filter(Boolean).join("\n\n");
        const parsed = parseNotamText(rawTexts);
        
        if (parsed.length > 0) {
          const byAirport = {};
          const ord = { HIGH: 0, MED: 1, LOW: 2 };
          for (const n of parsed) {
            for (const icao of n.icaos) {
              if (!byAirport[icao]) byAirport[icao] = [];
              if (!byAirport[icao].some(x => x.id === n.id)) byAirport[icao].push(n);
            }
          }
          for (const k of Object.keys(byAirport)) {
            byAirport[k].sort((a, b) => ord[a.p] - ord[b.p]);
          }
          setUploaded(byAirport);
          setFileName("Google Sheets (ดึงอัตโนมัติ)");
          setFileDate(new Date().toLocaleDateString("th-TH") + " (ปรับตามชีตล่าสุด)");
          setSel(Object.keys(byAirport));
        }
      }
      setUploading(false);
    }).catch(err => {
      console.error("เกิดข้อผิดพลาดในการโหลด NOTAM จาก Google Sheets:", err);
      setUploading(false);
    });
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
    <div style={{background:"rgba(15,23,42,0.95)",border:"1px solid #1e3a5f",borderRadius:15,padding:"18px 22px",marginBottom:15}}>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontWeight:700,color:"#60a5fa",fontSize:16}}>📡 NOTAM CENTER</span>
        <div style={{flex:1}}/>

        {/* source badge */}
        {isUploaded
          ? <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:14,background:"#14532d",color:"#86efac",padding:"3px 12px",borderRadius:25,fontWeight:700}}>
                📄 {fileName}
              </span>
              <span style={{fontSize:14,color:"var(--text-secondary)"}}>{fileDate}</span>
              <button onClick={clearUpload} style={{fontSize:14,padding:"3px 12px",borderRadius:6,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>✕ ล้าง</button>
            </div>
          : <span style={{fontSize:14,color:"var(--text-secondary)"}}>ใช้ข้อมูลตัวอย่าง (อัปโหลดไฟล์จริงด้านล่าง)</span>
        }

        {/* Upload button */}
        <label style={{background:isUploaded?"#1e3a5f":"#1d4ed8",border:"none",color:"#fff",borderRadius:9,padding:"9px 20px",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          {uploading ? "⏳ กำลังอ่าน..." : "📂 อัปโหลด NOTAM"}
          <input type="file" accept=".txt,.docx,.ics" onChange={handleFile} style={{display:"none"}} disabled={uploading}/>
        </label>
      </div>

      {/* Debug: extracted text preview */}
      {debugText && (
        <div style={{marginTop:10,background:"#020817",borderRadius:8,padding:"12px 15px"}}>
          <div style={{fontSize:14,color:"#60a5fa",marginBottom:5,fontWeight:700}}>🔍 Debug — text ที่ extract ได้ (600 chars แรก):</div>
          <pre style={{margin:0,fontSize:14,color:"var(--text-secondary)",whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:2,maxHeight:250,overflow:"auto"}}>{debugText}</pre>
        </div>
      )}

      {/* Error */}
      {parseErr && <div style={{marginTop:10,fontSize:15,color:"#fca5a5",background:"rgba(239,68,68,0.1)",borderRadius:8,padding:"8px 12px"}}>⚠️ {parseErr}</div>}

      {/* Upload instructions */}
      {!isUploaded && (
        <div style={{marginTop:12,fontSize:14,color:"#334155",lineHeight:2}}>
          รองรับไฟล์: <span style={{color:"#60a5fa"}}>.txt</span> หรือ <span style={{color:"#60a5fa"}}>.docx</span> ที่ได้จาก Base Ops RTAF — parser จะอ่าน NOTAM blocks (Q/A/B/C/E) แล้วจัดกลุ่มตาม ICAO อัตโนมัติ
        </div>
      )}
    </div>

    {/* ── Filter panel ── */}
    <div style={{background:"rgba(15,23,42,0.9)",border:"1px solid #1e3a5f",borderRadius:15,padding:"18px 22px",marginBottom:18}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        <span style={{fontSize:14,color:"var(--text-secondary)",alignSelf:"center"}}>ภาค:</span>
        {["ทั้งหมด","กลาง","เหนือ","อีสาน","ใต้"].map(r=>(
          <button key={r} onClick={()=>setRegion(r)} style={{padding:"3px 12px",fontSize:14,borderRadius:6,border:`1px solid ${region===r?"#38bdf8":"#1e3a5f"}`,background:region===r?"#0c4a6e":"transparent",color:region===r?"#38bdf8":"var(--text-secondary)",cursor:"pointer"}}>{r}</button>
        ))}
        <span style={{fontSize:14,color:"var(--text-secondary)",alignSelf:"center",marginLeft:10}}>เหล่าทัพ:</span>
        {["ทั้งหมด","ทอ.","ทบ.","ทร."].map(b=>(
          <button key={b} onClick={()=>setBranch(b)} style={{padding:"3px 12px",fontSize:14,borderRadius:6,border:`1px solid ${branch===b?(BC[b]||"#38bdf8"):"#1e3a5f"}`,background:branch===b?(BC[b]||"#38bdf8")+"22":"transparent",color:branch===b?(BC[b]||"#38bdf8"):"var(--text-secondary)",cursor:"pointer"}}>{b}</button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:3}}>
          <button onClick={()=>setView("list")} style={{padding:"3px 12px",fontSize:14,borderRadius:6,border:`1px solid ${view==="list"?"#38bdf8":"#1e3a5f"}`,background:view==="list"?"#0c4a6e":"transparent",color:view==="list"?"#38bdf8":"var(--text-secondary)",cursor:"pointer"}}>≡ รายการ</button>
          <button onClick={()=>setView("airport")} style={{padding:"3px 12px",fontSize:14,borderRadius:6,border:`1px solid ${view==="airport"?"#38bdf8":"#1e3a5f"}`,background:view==="airport"?"#0c4a6e":"transparent",color:view==="airport"?"#38bdf8":"var(--text-secondary)",cursor:"pointer"}}>⊞ แยกสนาม</button>
        </div>
      </div>

      {/* Airport selector */}
      <div style={{background:"#020817",borderRadius:10,padding:10,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:14,color:"var(--text-secondary)",fontWeight:700}}>เลือกสนามบิน</span>
          <span style={{fontSize:14,color:"#38bdf8",background:"#0c4a6e",padding:"1px 10px",borderRadius:12}}>{sel.length}/{filtAp.length}</span>
          <div style={{flex:1}}/>
          <button onClick={()=>setSel(filtAp.map(a=>a.icao))} style={{fontSize:12,padding:"2px 10px",borderRadius:5,background:"#1e3a5f",border:"none",color:"#60a5fa",cursor:"pointer"}}>ทั้งหมด</button>
          <button onClick={()=>setSel([])} style={{fontSize:12,padding:"2px 10px",borderRadius:5,background:"#1e3a5f",border:"none",color:"#ef4444",cursor:"pointer"}}>ยกเลิก</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {filtAp.map(ap=>{
            const isS=sel.includes(ap.icao);
            const cnt=(activeNotams[ap.icao]||[]).length;
            const hi=(activeNotams[ap.icao]||[]).filter(n=>n.p==="HIGH").length;
            const bc=BC[ap.branch]||"var(--text-secondary)";
            return <button key={ap.icao} onClick={()=>setSel(p=>p.includes(ap.icao)?p.filter(x=>x!==ap.icao):[...p,ap.icao])}
              title={ap.name} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${isS?bc:"#1e293b"}`,background:isS?bc+"22":"#0f172a",cursor:"pointer",position:"relative",minWidth:78}}>
              <div style={{fontSize:15,fontWeight:800,color:isS?bc:"var(--text-secondary)",fontFamily:"monospace"}}>{ap.icao}</div>
              <div style={{fontSize:11,color:isS?"#94a3b8":"#334155"}}>{ap.branch}</div>
              {cnt>0&&<span style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:"50%",background:hi>0?"#ef4444":"#f59e0b",fontSize:11,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{cnt}</span>}
            </button>;
          })}
        </div>
      </div>

      {/* Priority + Search */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {["ALL","HIGH","MED","LOW"].map(p=>(
          <button key={p} onClick={()=>setPrio(p)} style={{padding:"5px 12px",fontSize:14,borderRadius:6,border:`1px solid ${prio===p?(PC[p]||"#38bdf8"):"#1e3a5f"}`,background:prio===p?(PC[p]||"#38bdf8")+"22":"transparent",color:prio===p?(PC[p]||"#38bdf8"):"var(--text-secondary)",cursor:"pointer",fontWeight:700}}>
            {p==="ALL"?"ทุกระดับ":PL[p]}
          </button>
        ))}
        <div style={{flex:1,minWidth:150}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ค้นหา NOTAM, ICAO..."
            style={{width:"100%",background:"#020817",border:"1px solid #1e3a5f",borderRadius:8,padding:"5px 12px",color:"#e2e8f0",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <span style={{fontSize:14,color:"#38bdf8"}}>พบ {allNtms.length} รายการ</span>
        {totalHigh>0&&<span style={{fontSize:14,color:"#ef4444",fontWeight:700}}>⚠ HIGH: {totalHigh}</span>}
      </div>
    </div>

    {sel.length===0&&<div style={{textAlign:"center",padding:"50px",color:"var(--text-secondary)"}}>กรุณาเลือกสนามบิน</div>}
    {sel.length>0&&allNtms.length===0&&<div style={{textAlign:"center",padding:"50px",color:"var(--text-secondary)"}}>✅ ไม่พบ NOTAM ที่ตรงเงื่อนไข</div>}

    {/* LIST VIEW */}
    {view==="list" && allNtms.map(n=>(
      <div key={n.id+n.icao} onClick={()=>setExp(exp===n.id+n.icao?null:n.id+n.icao)}
        style={{border:`1px solid ${PC[n.p]}44`,borderRadius:12,marginBottom:10,background:`${PC[n.p]}06`,cursor:"pointer",borderLeft:`3px solid ${PC[n.p]}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",flexWrap:"wrap"}}>
          <span style={{fontSize:12,padding:"2px 10px",borderRadius:5,background:PC[n.p]+"30",color:PC[n.p],fontWeight:800,minWidth:52,textAlign:"center"}}>{n.p}</span>
          <span style={{fontFamily:"monospace",fontWeight:900,color:"#38bdf8",fontSize:16}}>{n.id}</span>
          <span style={{fontSize:14,padding:"1px 9px",borderRadius:5,background:(BC[n.branch]||"var(--text-secondary)")+"22",color:BC[n.branch]||"var(--text-secondary)",fontWeight:700}}>{n.icao}</span>
          <span style={{fontSize:12,color:"var(--text-secondary)"}}>{n.apName}</span>
          <span style={{fontSize:12,padding:"1px 8px",borderRadius:3,background:"#a78bfa22",color:"#a78bfa"}}>{n.t}</span>
          <div style={{flex:1}}/>
          <span style={{color:"#334155",fontSize:15}}>{exp===n.id+n.icao?"▲":"▼"}</span>
        </div>
        <div style={{borderTop:`1px solid ${PC[n.p]}22`,padding:"12px 18px 15px"}}>
          <pre style={{margin:0,fontFamily:"'Courier New',monospace",fontSize:15,color:"var(--text-primary)",whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:2}}>{n.raw}</pre>
        </div>
      </div>
    ))}

    {/* AIRPORT VIEW */}
    {view==="airport" && (
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {sel.filter(icao=>(activeNotams[icao]||[]).length>0).map(icao=>{
          const ap=AIRPORTS.find(a=>a.icao===icao);
          const bc=BC[ap?.branch]||"var(--text-secondary)";
          const ntms=(activeNotams[icao]||[]).filter(n=>{
            if(prio!=="ALL"&&n.p!==prio) return false;
            if(search&&!n.raw.toUpperCase().includes(search.toUpperCase())) return false;
            return true;
          });
          if(ntms.length===0) return null;
          return <div key={icao} style={{background:"#0a1120",border:`1px solid ${bc}44`,borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${bc}33`,background:bc+"10",borderRadius:"10px 10px 0 0"}}>
              <span style={{fontFamily:"monospace",fontWeight:900,fontSize:20,color:bc}}>{icao}</span>
              <span style={{fontSize:14,color:"var(--text-secondary)",flex:1}}>{ap?.name}</span>
              <span style={{fontSize:12,padding:"2px 10px",borderRadius:5,background:bc+"22",color:bc,fontWeight:700}}>{ap?.branch}</span>
              <span style={{fontSize:12,color:"#334155"}}>{ntms.length} NOTAM</span>
            </div>
            {ntms.map((n,i)=>(
              <div key={n.id} style={{padding:"15px 20px",borderBottom:i<ntms.length-1?"1px solid #0f172a":"none",borderLeft:`3px solid ${PC[n.p]}`}}>
                <div style={{display:"flex",gap:10,marginBottom:8}}>
                  <span style={{fontSize:12,padding:"1px 9px",borderRadius:5,background:PC[n.p]+"30",color:PC[n.p],fontWeight:800}}>{n.p}</span>
                  <span style={{fontSize:12,padding:"1px 8px",borderRadius:3,background:"#a78bfa22",color:"#a78bfa"}}>{n.t}</span>
                </div>
                <pre style={{margin:0,fontFamily:"'Courier New',monospace",fontSize:15,color:"var(--text-primary)",whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:2}}>{n.raw}</pre>
              </div>
            ))}
          </div>;
        })}
      </div>
    )}
  </div>;
}

// ── Flight Tab ──────────────────────────────────────────────────────────────────
const EMPTY_FLIGHT = {day:"FRI",date:"",acTypeF:"S-70i",mission:"",ac:"",cs:"",pilot:"",coPilot:"",takeoff:"",land:"",route:"",remark:"",sq:""};
const AC_NUMBERS = {"S-92A":["129","131","133","286","298"],"S-70i":["040","056","060","103","104"]};
const DAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const DC   = {MON:"#3b82f6",TUE:"#3b82f6",WED:"#22c55e",THU:"#f97316",FRI:"#3b82f6",SAT:"#a855f7",SUN:"#ef4444"};
const COLS = [{k:"day",l:"DAY",w:48},{k:"date",l:"DATE",w:58},{k:"acTypeF",l:"TYPE",w:55},{k:"mission",l:"MISSION",w:105},{k:"ac",l:"A/C",w:40},{k:"cs",l:"Callsign",w:80},{k:"pilot",l:"Pilot",w:62},{k:"coPilot",l:"CO-PILOT",w:68},{k:"takeoff",l:"T/O",w:48},{k:"land",l:"L/D",w:48},{k:"route",l:"ROUTE",w:90},{k:"remark",l:"REMARK",w:90},{k:"sq",l:"SQ.",w:42},];

function sortFlights(list: any[]) {
  const parseTime = (t: any) => {
    if (!t || typeof t !== "string") return 9999;
    return parseInt(t.replace(":","").trim()) || 9999;
  };
  return [...list].sort((a,b) => {
    const aIs92 = (a.acTypeF||"")==="S-92A";
    const bIs92 = (b.acTypeF||"")==="S-92A";
    if (aIs92 && !bIs92) return -1;
    if (!aIs92 && bIs92) return 1;
    return parseTime(a.takeoff) - parseTime(b.takeoff);
  });
}

// ── Pilot data ────────────────────────────────────────────────────────────────
const RANK_ORDER = ["พล.อ.อ.","พล.อ.ท.","พล.อ.ต.","น.อ.","น.ท.","น.ต.","ร.อ.","ร.ท.","ร.ต."];
const PILOT_RANKS = RANK_ORDER;
const PILOT_AC_TYPES = ["S-70i","S-92A"];

// ── PilotComboBox ─────────────────────────────────────────────────────────────
function PilotComboBox({ value, onChange, pilots, placeholder, dark=true }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value||"");
  const ref = useRef(null);

  useEffect(() => { setQuery(value||""); }, [value]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = pilots.filter(p => {
    const search = query.toLowerCase();
    return (
      (p.callsign||"").toLowerCase().includes(search) ||
      (p.name||"").toLowerCase().includes(search) ||
      (p.initial||"").toLowerCase().includes(search)
    ) && query.length > 0;
  }).slice(0, 8);

  const bg  = dark ? "#0f172a" : "#fff";
  const brd = dark ? "#334155" : "#cbd5e1";
  const txt = dark ? "#e2e8f0" : "#1e293b";

  const select = (p) => {
    const label = p.callsign || p.name;
    setQuery(label);
    onChange(label);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{position:"relative",width:"100%"}}>
      <input
        value={query}
        onChange={e=>{ setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        placeholder={placeholder||"พิมพ์หรือเลือก..."}
        style={{background:bg,border:`1px solid ${brd}`,color:txt,borderRadius:6,padding:"6px 10px",fontSize:15,width:"100%",boxSizing:"border-box" as any}}
      />
      {open && filtered.length > 0 && (
        <div style={{position:"absolute",zIndex:999,top:"calc(100% + 2px)",left:0,width:"100%",background:bg,border:`1px solid ${brd}`,borderRadius:8,boxShadow:"0 4px 16px #0006",maxHeight:250,overflowY:"auto"}}>
          {filtered.map((p,i) => (
            <div key={i} onMouseDown={()=>select(p)}
              style={{padding:"9px 12px",cursor:"pointer",borderBottom:`1px solid ${brd}`,display:"flex",alignItems:"center",gap:10,background:"transparent"}}
              onMouseEnter={e=>(e.currentTarget.style.background=dark?"#1e293b":"#f1f5f9")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
              <span style={{fontSize:14,color:"#94a3b8",minWidth:62}}>{p.rank||""}</span>
              <span style={{fontSize:15,color:txt,fontWeight:600,flex:1}}>{p.name||""}</span>
              <span style={{fontSize:14,color:"#0f766e",fontFamily:"monospace",minWidth:69}}>{p.initial||""}</span>
              <span style={{fontSize:14,color:"#60a5fa",fontFamily:"monospace",fontWeight:700,minWidth:62}}>{p.callsign||""}</span>
              <span style={{fontSize:12,color:"var(--text-secondary)"}}>{p.qual||""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pilot Tab ─────────────────────────────────────────────────────────────────
const EMPTY_PILOT = { rank:"น.ท.", name:"", initial:"", callsign:"", tel:"", acType:"S-70i", classNum:"" };

function PilotTab() {
  const [pilots,   setPilots]  = useState([]);
  const [pilotLoaded, setPilotLoaded] = useState(false);
  const [mode,     setMode]    = useState(null);
  const [form,     setForm]    = useState(EMPTY_PILOT);
  const [delIdx,   setDelIdx]  = useState(null);
  const [toast,    setToast]   = useState(null);
  const [syncing,  setSyncing] = useState(false);
  const [search,   setSearch]  = useState("");
  const [dragIdx,  setDragIdx] = useState(null);
  const [dragOver, setDragOver]= useState(null);
  const [manualOrder, setManualOrder] = useState(false);

  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:15,width:"100%",boxSizing:"border-box" as any};

  // โหลดจาก Sheet แยกตาม acType
  useEffect(() => {
    Promise.all([
      loadFromSheet("PILOTS S-92A"),
      loadFromSheet("PILOTS S-70i"),
    ]).then(([rowsA, rowsB]) => {
      const parse = (rows) => rows.length > 1
        ? rows.slice(1).map(r=>({rank:r[0]||"",name:r[1]||"",initial:r[2]||"",callsign:r[3]||"",tel:r[4]||"",acType:r[5]||"S-70i",classNum:r[6]||""}))
        : [];
      const combined = [...parse(rowsA), ...parse(rowsB)];
      if (combined.length > 0) setPilots(combined);
      setPilotLoaded(true);
    }).catch(()=>setPilotLoaded(true));
  }, []);

  // บันทึกแยกตาม acType — เรียกใช้โดยตรงเมื่อมีการเปลี่ยนแปลง
  const savePilotsToSheet = (updatedPilots) => {
    setSyncing(true);
    const header = ["rank","name","initial","callsign","tel","acType","classNum"];
    const pilotsA = updatedPilots.filter(p=>p.acType==="S-92A");
    const pilotsB = updatedPilots.filter(p=>p.acType!=="S-92A");
    const rowsA = [header, ...pilotsA.map(p=>[p.rank,p.name,p.initial,p.callsign,p.tel,p.acType||"",p.classNum||""])];
    const rowsB = [header, ...pilotsB.map(p=>[p.rank,p.name,p.initial,p.callsign,p.tel,p.acType||"",p.classNum||""])];
    Promise.all([
      saveToSheet("PILOTS S-92A", rowsA),
      saveToSheet("PILOTS S-70i", rowsB),
    ]).finally(()=>setSyncing(false));
  };

  const showToast = (msg,color="#22c55e") => { setToast({msg,color}); setTimeout(()=>setToast(null),2500); };
  const openAdd  = () => { setForm(EMPTY_PILOT); setMode("add"); };
  const openEdit = (i) => { setForm({...pilots[i]}); setMode(i); };
  const cancel   = () => { setMode(null); };

  const save = () => {
    if (!form.callsign && !form.name) return showToast("กรุณากรอก Callsign หรือชื่อ","#ef4444");
    const sortByClass = (list) => [...list].sort((a,b) => (parseInt(a.classNum)||9999)-(parseInt(b.classNum)||9999));
    let next;
    if (mode==="add") {
      next = sortByClass([...pilots, form]);
      showToast("เพิ่ม Pilot สำเร็จ ✓");
    } else {
      next = sortByClass(pilots.map((r,i)=>i===mode?form:r));
      showToast("แก้ไขสำเร็จ ✓");
    }
    setPilots(next);
    savePilotsToSheet(next);
    setMode(null);
  };

  const del = (i) => {
    const next = pilots.filter((_,idx)=>idx!==i);
    setPilots(next);
    savePilotsToSheet(next);
    setDelIdx(null);
    showToast("ลบสำเร็จ","#ef4444");
  };

  // Drag handlers
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver  = (e,i) => { e.preventDefault(); setDragOver(i); };
  const onDrop      = (i) => {
    if (dragIdx===null || dragIdx===i) { setDragIdx(null); setDragOver(null); return; }
    const arr = [...pilots];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(i, 0, moved);
    setPilots(arr);
    savePilotsToSheet(arr);
    setManualOrder(true);
    setDragIdx(null); setDragOver(null);
    showToast("เปลี่ยนลำดับแล้ว ✓");
  };
  const onDragEnd = () => { setDragIdx(null); setDragOver(null); };

  const shown = pilots.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.rank||"").toLowerCase().includes(q) ||
      (p.name||"").toLowerCase().includes(q) ||
      (p.initial||"").toLowerCase().includes(q) ||
      (p.callsign||"").toLowerCase().includes(q) ||
      (p.classNum||"").toLowerCase().includes(q) ||
      (p.acType||"").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {toast && <div style={{position:"fixed",top:20,right:24,zIndex:999,background:toast.color,color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16,boxShadow:"0 4px 12px #0004"}}>{toast.msg}</div>}

      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#1e3a5f,#0f2040)",borderRadius:"10px 10px 0 0",padding:"18px 25px",display:"flex",alignItems:"center",gap:15,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:1}}>👨‍✈️ รายชื่อนักบิน</div>
          <div style={{fontSize:14,color:"#60a5fa"}}>
            เรียงตามรุ่น ชนอ. จากน้อยไปมาก · {manualOrder ? <span style={{color:"#fbbf24"}}>⇅ ลำดับ manual</span> : <span style={{color:"#86efac"}}>↑ อัตโนมัติ</span>}
            {syncing ? <span style={{marginLeft:10,color:"#86efac"}}>⟳ sync...</span> : <span style={{marginLeft:10,color:"#22c55e"}}>● Sheet</span>}
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ค้นหา ยศ / ชื่อ / ชื่อย่อ / Callsign / รุ่น ชนอ."
          style={{background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:8,padding:"8px 15px",fontSize:15,width:350}}/>
        <button onClick={openAdd}
          style={{background:"#16a34a",border:"none",color:"#fff",borderRadius:9,padding:"9px 20px",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0}}>
          ＋ เพิ่ม Pilot
        </button>
      </div>

      {/* Form */}
      {mode !== null && (
        <div style={{background:"#0f2040",border:"1px solid #2563eb",borderRadius:10,padding:16,marginTop:10,marginBottom:10}}>
          <div style={{fontWeight:700,color:"#60a5fa",fontSize:16,marginBottom:15}}>
            {mode==="add"?"➕ เพิ่ม Pilot ใหม่":"✏️ แก้ไขข้อมูล Pilot"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10,marginBottom:15}}>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>ยศ</div>
              <select value={form.rank} onChange={e=>setForm(p=>({...p,rank:e.target.value}))} style={inp}>
                {PILOT_RANKS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>ชื่อ-นามสกุล</div>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={inp} placeholder="เช่น สมชาย ใจดี"/>
            </div>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>ชื่อย่อ (อังกฤษ)</div>
              <input value={form.initial} onChange={e=>setForm(p=>({...p,initial:e.target.value}))} style={inp} placeholder="เช่น S-CHAI"/>
            </div>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Callsign</div>
              <input value={form.callsign} onChange={e=>setForm(p=>({...p,callsign:e.target.value}))} style={inp} placeholder="เช่น N-RA"/>
            </div>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>รุ่น ชนอ.</div>
              <input value={form.classNum||""} onChange={e=>setForm(p=>({...p,classNum:e.target.value}))} style={inp} placeholder="เช่น 25"/>
            </div>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>เบอร์โทรศัพท์</div>
              <input value={form.tel} onChange={e=>setForm(p=>({...p,tel:e.target.value}))} style={inp} placeholder="เช่น 081-234-5678"/>
            </div>
            <div>
              <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Type of Aircraft</div>
              <select value={form.acType||"S-70i"} onChange={e=>setForm(p=>({...p,acType:e.target.value}))} style={inp}>
                {PILOT_AC_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={cancel} style={{padding:"8px 20px",fontSize:15,borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
            <button onClick={save}   style={{padding:"8px 22px",fontSize:15,borderRadius:8,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",fontWeight:700}}>บันทึก ✓</button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {delIdx!==null && (
        <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid #ef4444",borderRadius:10,padding:"15px 20px",margin:"8px 0",display:"flex",alignItems:"center",gap:15}}>
          <span style={{color:"#fca5a5",fontSize:16,flex:1}}>⚠️ ยืนยันลบ <b>{pilots[delIdx]?.callsign}</b> ?</span>
          <button onClick={()=>setDelIdx(null)} style={{padding:"6px 18px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:15}}>ยกเลิก</button>
          <button onClick={()=>del(delIdx)} style={{padding:"6px 18px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",cursor:"pointer",fontSize:15,fontWeight:700}}>ลบ</button>
        </div>
      )}

      {/* 3-Tab Table */}
      {(()=>{
        const [acFilter, setAcFilter] = useState<"all"|"S-70i"|"S-92A">("all");
        const filtered2 = acFilter==="all" ? shown : shown.filter(p=>p.acType===acFilter);
        const tabBtn = (id,label,count) => (
          <button key={id} onClick={()=>setAcFilter(id as any)}
            style={{padding:"9px 22px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:15,
              background:acFilter===id?"#1e3a5f":"transparent",
              color:acFilter===id?"#fff":"var(--text-secondary)",
              borderBottom:acFilter===id?"2px solid #38bdf8":"2px solid transparent"}}>
            {label} <span style={{fontSize:12,background:acFilter===id?"#38bdf8":"#e2e8f0",color:acFilter===id?"#fff":"var(--text-secondary)",borderRadius:12,padding:"1px 8px",marginLeft:5}}>{count}</span>
          </button>
        );
        return (
          <div style={{background:"#fff",borderRadius:"0 0 10px 10px",overflow:"hidden",border:"1px solid #e2e8f0"}}>
            {/* Tab bar */}
            <div style={{display:"flex",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",padding:"0 8px",gap:2}}>
              {tabBtn("all","รายชื่อนักบินทั้งหมด", shown.length)}
              {tabBtn("S-70i","นักบิน S-70i", shown.filter(p=>p.acType==="S-70i").length)}
              {tabBtn("S-92A","นักบิน S-92A", shown.filter(p=>p.acType==="S-92A").length)}
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:16}}>
              <thead>
                <tr style={{background:"#1e3a5f"}}>
                  {["","#","ยศ","ชื่อ-นามสกุล","ชื่อย่อ","Callsign","รุ่น ชนอ.","เบอร์โทร","Type A/C","จัดการ"].map(h=>(
                    <th key={h} style={{padding:"12px 15px",color:"#fff",fontWeight:800,fontSize:15,textAlign:"center",borderRight:"1px solid #1e40af"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered2.length===0 && (
                  <tr><td colSpan={10} style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontSize:16}}>
                    {search ? "ไม่พบชื่อที่ค้นหา" : acFilter==="all" ? "ยังไม่มีรายชื่อ กด '+ เพิ่ม Pilot' เพื่อเริ่มต้น" : `ยังไม่มีรายชื่อนักบิน ${acFilter}`}
                  </td></tr>
                )}
                {filtered2.map((p,fi)=>{
                  const realIdx = pilots.indexOf(p);
                  const isDragging = dragIdx===realIdx;
                  const isOver = dragOver===realIdx;
                  return (
                    <tr key={fi}
                      draggable
                      onDragStart={()=>onDragStart(realIdx)}
                      onDragOver={e=>onDragOver(e,realIdx)}
                      onDrop={()=>onDrop(realIdx)}
                      onDragEnd={onDragEnd}
                      style={{borderBottom:"1px solid #e2e8f0",background:isDragging?"#dbeafe":isOver?"#eff6ff":fi%2===0?"#fff":"#f9fafb",opacity:isDragging?0.5:1,borderTop:isOver?"2px solid #3b82f6":"",cursor:"grab"}}>
                      <td style={{padding:"7px 4px",textAlign:"center",color:"#cbd5e1",fontSize:20,userSelect:"none"}}>⠿</td>
                      <td style={{padding:"12px 15px",textAlign:"center",color:"#94a3b8",fontSize:14}}>{realIdx+1}</td>
                      <td style={{padding:"12px 15px",textAlign:"center",fontWeight:700,color:"#374151",fontSize:15}}>{p.rank}</td>
                      <td style={{padding:"12px 15px",fontWeight:600,color:"#1e293b"}}>{p.name}</td>
                      <td style={{padding:"12px 15px",textAlign:"center",color:"#0f766e",fontFamily:"monospace",fontWeight:700,fontSize:15}}>{p.initial||"—"}</td>
                      <td style={{padding:"12px 15px",textAlign:"center",fontWeight:800,color:"#1d4ed8",fontFamily:"monospace",fontSize:16}}>{p.callsign||"—"}</td>
                      <td style={{padding:"12px 15px",textAlign:"center",fontWeight:800,color:"#7c3aed",fontFamily:"monospace",fontSize:16}}>{p.classNum||"—"}</td>
                      <td style={{padding:"12px 15px",textAlign:"center",fontSize:15,fontFamily:"monospace"}}>
                        {p.tel
                          ? <a href={`tel:${p.tel.replace(/[-\s]/g,"")}`} style={{color:"#2563eb",fontWeight:700,textDecoration:"none"}}
                              title={`โทร ${p.tel}`}>📞 {p.tel}</a>
                          : <span style={{color:"#94a3b8"}}>—</span>}
                      </td>
                      <td style={{padding:"12px 15px",textAlign:"center"}}>
                        <span style={{background:p.acType==="S-92A"?"#d1fae5":"#e0f2fe",color:p.acType==="S-92A"?"#065f46":"#0369a1",fontWeight:700,fontSize:14,padding:"2px 10px",borderRadius:5}}>{p.acType||"—"}</span>
                      </td>
                      <td style={{padding:"10px",textAlign:"center"}}>
                        <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                          <button onClick={()=>openEdit(realIdx)} style={{padding:"5px 12px",fontSize:14,borderRadius:6,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",cursor:"pointer"}}>✏️</button>
                          <button onClick={()=>setDelIdx(realIdx)} style={{padding:"5px 12px",fontSize:14,borderRadius:6,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{padding:"10px 20px",fontSize:14,color:"#94a3b8",borderTop:"1px solid #e2e8f0"}}>
              รวม {pilots.length} คน · แสดง {filtered2.length} คน
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Callsign ComboBox ─────────────────────────────────────────────────────────
function getCallsignOptions(ac: string): string[] {
  if (!ac) return [];
  const special = { "056": "Alpha 1", "060": "Alpha 2" };
  const primary = special[ac] || `SPD ${ac}`;
  return [primary, "SPD BLUE"];
}

function CallsignComboBox({ value, onChange, ac, dark=true, inp }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState(value||"");
  const ref = useRef(null);
  const options = getCallsignOptions(ac);

  useEffect(() => { setQuery(value||""); }, [value]);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = (v) => { setQuery(v); onChange(v); setOpen(false); };

  return (
    <div ref={ref} style={{position:"relative",width:"100%"}}>
      <input
        value={query}
        onChange={e=>{ setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        placeholder="เลือกหรือพิมพ์ Callsign..."
        style={inp}
      />
      {open && options.length > 0 && (
        <div style={{position:"absolute",zIndex:999,top:"calc(100% + 2px)",left:0,width:"100%",
          background:dark?"#0f172a":"#fff",border:`1px solid ${dark?"#334155":"#cbd5e1"}`,
          borderRadius:8,boxShadow:"0 4px 16px #0006"}}>
          {options.map((opt,i)=>(
            <div key={i} onMouseDown={()=>select(opt)}
              style={{padding:"10px 15px",cursor:"pointer",fontSize:15,fontWeight:700,
                color:dark?"#e2e8f0":"#1e293b",borderBottom:i<options.length-1?`1px solid ${dark?"#1e293b":"#f1f5f9"}`:"none"}}
              onMouseEnter={e=>(e.currentTarget.style.background=dark?"#1e3a5f":"#eff6ff")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlightForm({init, onSave, onCancel, onDateChange=null}) {
  const [f, setF] = useState(init || EMPTY_FLIGHT);
  const [pilots, setPilots] = useState([]);

  // โหลดรายชื่อ pilot
  useEffect(() => {
    Promise.all([
      loadFromSheet("PILOTS S-92A"),
      loadFromSheet("PILOTS S-70i"),
    ]).then(([rowsA, rowsB]) => {
      const parse = (rows) => rows.length > 1
        ? rows.slice(1).map(r=>({rank:r[0]||"",name:r[1]||"",initial:r[2]||"",callsign:r[3]||"",tel:r[4]||"",acType:r[5]||"",classNum:r[6]||""}))
        : [];
      setPilots([...parse(rowsA), ...parse(rowsB)]);
    });
  }, []);

  const set = (k,v) => {
    if (k==="date") {
      const parts = v.trim().split(" ");
      if (parts.length >= 2) {
        const d = parseInt(parts[0]);
        const mIdx = MONTH_EN.findIndex(m=>m.toLowerCase()===parts[1].toLowerCase());
        if (!isNaN(d) && mIdx >= 0) {
          const dow = new Date(new Date().getFullYear(), mIdx, d).getDay();
          const dayMap = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
          setF(p=>({...p, date:v, day:dayMap[dow]}));
          if (onDateChange) onDateChange(v);
          return;
        }
      }
    }
    setF(p=>({...p,[k]:v}));
  };
  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:15,width:"100%",boxSizing:"border-box"};
  return (
    <div style={{background:"#0f2040",border:"1px solid #2563eb",borderRadius:12,padding:18,marginBottom:18}}>
      <div style={{fontWeight:700,color:"#60a5fa",fontSize:16,marginBottom:15}}>
        {init?"✏️ แก้ไขข้อมูลการบิน":"➕ เพิ่มการบินใหม่"}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:15}}>
        <div>
          <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>DATE</div>
          <DatePicker value={f.date} onChange={v=>set("date",v)} dark={true}/>
        </div>
        <div>
          <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>TYPE A/C</div>
          <select value={f.acTypeF||"S-70i"} onChange={e=>{ setF(p=>({...p,acTypeF:e.target.value,ac:"",cs:""})); }} style={inp}>
            <option value="S-70i">S-70i</option>
            <option value="S-92A">S-92A</option>
          </select>
        </div>
        {[
          {k:"mission",l:"MISSION"},
        ].map(({k,l})=>(
          <div key={k}>
            <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>{l}</div>
            <input value={f[k]} onChange={e=>set(k,e.target.value)} style={inp} placeholder={l}/>
          </div>
        ))}
        <div>
          <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>A/C</div>
          <select value={f.ac} onChange={e=>{
            const ac = e.target.value;
            const opts = getCallsignOptions(ac);
            setF(p=>({...p, ac, cs: opts[0]||"" }));
          }} style={inp}>
            <option value="">— เลือก —</option>
            {(AC_NUMBERS[f.acTypeF||"S-70i"]||[]).map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Callsign</div>
          <CallsignComboBox value={f.cs} onChange={v=>set("cs",v)} ac={f.ac} dark={true} inp={inp}/>
        </div>
        <div>
          <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Pilot</div>
          <PilotComboBox value={f.pilot} onChange={v=>set("pilot",v)} pilots={pilots} placeholder="Callsign หรือชื่อ..." dark={true}/>
        </div>
        <div>
          <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>CO-PILOT</div>
          <PilotComboBox value={f.coPilot} onChange={v=>set("coPilot",v)} pilots={pilots} placeholder="Callsign หรือชื่อ..." dark={true}/>
        </div>
        {[
          {k:"takeoff",l:"T/O (HH:MM)"},
          {k:"land",l:"L/D (HH:MM)"},
          {k:"route",l:"AREA/ROUTE"},
          {k:"remark",l:"REMARK"},
          {k:"sq",l:"SQ."},
        ].map(({k,l})=>(
          <div key={k}>
            <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>{l}</div>
            <input value={f[k]} onChange={e=>set(k,e.target.value)} style={inp} placeholder={l}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"8px 20px",fontSize:15,borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
        <button onClick={()=>onSave(f)} style={{padding:"8px 22px",fontSize:15,borderRadius:8,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",fontWeight:700}}>บันทึก ✓</button>
      </div>
    </div>
  );
}

function FlightTab({onOpenSafety}:{onOpenSafety?:(type:"risk"|"hazard",data:any)=>void}) {
  const [flights,  setFlights]  = useState([]);
  const [ready,    setReady]    = useState(false); // พร้อมแสดงผล
  const [mode,     setMode]     = useState(null);
  const [delIdx,   setDelIdx]   = useState(null);
  const [toast,    setToast]    = useState(null);
  const [syncing,  setSyncing]  = useState(false);
  const [expandedRow, setExpandedRow] = useState<number|null>(null);

  // โหลดข้อมูลจาก Sheet เมื่อเปิด
  useEffect(() => {
    loadFromSheet("FLIGHT SCHEDULE").then(rows => {
      if (rows.length > 1) {
        const [, ...data] = rows;
        const loadedData = data.map(r => ({
          day:r[0]||"",date:r[1]||"",acTypeF:r[2]||"",mission:r[3]||"",ac:r[4]||"",
          cs:r[5]||"",pilot:r[6]||"",coPilot:r[7]||"",takeoff:r[8]||"",
          land:r[9]||"",route:r[10]||"",remark:r[11]||"",sq:r[12]||""
        }));
        setFlights(loadedData.length > 0 ? loadedData : []);
      }
    }).catch(()=>{
    }).finally(()=>{
      setReady(true);
    });
  }, []);

  const saveFlightsToSheet = (updatedFlights) => {
    setSyncing(true);
    const rows = [
      ["day","date","acTypeF","mission","ac","cs","pilot","coPilot","takeoff","land","route","remark","sq"],
      ...updatedFlights.map(f=>[f.day,f.date,f.acTypeF||"",f.mission,f.ac,f.cs,f.pilot,f.coPilot,f.takeoff,f.land,f.route,f.remark,f.sq])
    ];
    saveToSheet("FLIGHT SCHEDULE", rows).finally(()=>setSyncing(false));
  };

  const showToast = (msg, color="#22c55e") => {
    setToast({msg, color});
    setTimeout(()=>setToast(null), 2500);
  };

  const handleSave = (f) => {
    let next;
    if (mode === "add") {
      next = [...flights, f];
      showToast("เพิ่มการบินสำเร็จ ✓ บันทึกลง Sheet แล้ว");
    } else {
      next = flights.map((row,i)=>i===mode?f:row);
      showToast("แก้ไขข้อมูลสำเร็จ ✓ บันทึกลง Sheet แล้ว");
    }
    setFlights(next);
    saveFlightsToSheet(next);
    setMode(null);
    setFocusDay(null);
  };

  const handleDelete = (idx) => {
    const next = flights.filter((_,i)=>i!==idx);
    setFlights(next);
    saveFlightsToSheet(next);
    setDelIdx(null);
    showToast("ลบข้อมูลสำเร็จ","#ef4444");
  };

  // ── view state ──────────────────────────────────────────────────────────────
  const today = new Date();
  const [view,      setView]     = useState<"daily"|"weekly">("daily");
  const [selDate,   setSelDate]  = useState<Date>(today);
  const [weekBase,  setWeekBase] = useState<Date>(today);
  const [focusDay,  setFocusDay] = useState<Date|null>(null); // วันที่ focus ใน weekly

  // helpers
  const fmtDate2 = (d:Date) => `${d.getDate()} ${MONTH_EN[d.getMonth()]}`;
  const parseDateStr = (s:string):Date|null => {
    if (!s) return null;
    const p = s.trim().split(" ");
    if (p.length < 2) return null;
    const d = parseInt(p[0]);
    const m = MONTH_EN.findIndex(x=>x.toLowerCase()===p[1].toLowerCase());
    if (isNaN(d)||m<0) return null;
    return new Date(new Date().getFullYear(), m, d);
  };
  const sameDay = (a:Date|null,b:Date|null) => a&&b&&a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear();
  const getWeekMon = (base:Date) => { const d=new Date(base); const dow=d.getDay(); d.setDate(d.getDate()-(dow===0?6:dow-1)); return d; };
  const wMon = getWeekMon(weekBase);
  const wSun = new Date(wMon); wSun.setDate(wMon.getDate()+6);
  const inWeek = (dateStr:string) => { const d=parseDateStr(dateStr); if(!d) return false; return d>=wMon&&d<=wSun; };

  // filter + sort
  const dailyF  = sortFlights(flights.filter(f=>sameDay(parseDateStr(f.date),selDate)));
  const weeklyF = sortFlights(flights.filter(f=>inWeek(f.date)));
  const shown   = view==="daily"?dailyF:weeklyF;

  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(wMon); d.setDate(wMon.getDate()+i); return d; });
  const weekDaysToShow = focusDay
    ? weekDays.filter(wd => !!sameDay(wd, focusDay))
    : weekDays;

  const tabBtn = (id:string,label:string) => (
    <button key={id} onClick={()=>setView(id as any)}
      style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:15,
        background:view===id?"#7c3aed":"transparent",color:view===id?"#fff":"var(--text-secondary)",
        boxShadow:view===id?"0 1px 4px #0003":"none",transition:"all 0.15s"}}>
      {label}
    </button>
  );

  const renderFlightRow = (f,realIdx,rowIdx) => {
    const dc=DC[f.day]||"#3b82f6";
    const isEditing=mode===realIdx;
    const isExpanded=expandedRow===realIdx;
    const colSpan=COLS.length+1; // +1 for expand col
    const sf="'Sarabun','IBM Plex Sans Thai',sans-serif";
    return (
      <>
        <tr key={rowIdx}
          onClick={()=>setExpandedRow(isExpanded?null:realIdx)}
          style={{borderBottom:isExpanded?"none":"1px solid #e2e8f0",background:isExpanded?"#f0f4ff":isEditing?"#eff6ff":rowIdx%2===0?"#fff":"#f9fafb",cursor:"pointer",transition:"background 0.15s",fontFamily:sf,fontWeight:400}}>
          <td style={{padding:0,width:0,border:"none"}}></td>
          <td style={{padding:"12px 10px",textAlign:"center"}}><span style={{background:dc,color:"#fff",fontWeight:800,fontSize:14,padding:"3px 10px",borderRadius:5}}>{f.day}</span></td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.date}</td>
          <td style={{padding:"12px 10px",textAlign:"center"}}>
            <span style={{background:f.acTypeF==="S-92A"?"#d1fae5":"#e0f2fe",color:f.acTypeF==="S-92A"?"#065f46":"#0369a1",fontWeight:700,fontSize:14,padding:"2px 9px",borderRadius:5}}>{f.acTypeF||"—"}</span>
          </td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.mission}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.ac}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.cs}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.pilot}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.coPilot}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.takeoff}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.land}</td>
          <td style={{padding:"12px 10px",textAlign:"center",fontSize:15,color:"#111"}}>{f.route}</td>
          <td style={{padding:"12px 10px",textAlign:"center",fontSize:15,color:"#111"}}>{f.remark}</td>
          <td style={{padding:"12px 10px",textAlign:"center",color:"#111"}}>{f.sq}</td>
        </tr>
        {isExpanded&&(
          <tr style={{background:"#eef2ff",borderBottom:"2px solid #7c3aed"}}>
            <td colSpan={colSpan} style={{padding:"12px 20px"}}>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:700,color:"#6d28d9",marginRight:5}}>🛡️ SAFETY</span>
                {onOpenSafety&&<>
                  <button onClick={e=>{e.stopPropagation();onOpenSafety("risk",f);}}
                    style={{padding:"6px 15px",fontSize:14,borderRadius:8,border:"1px solid #f97316",background:"#fff7ed",color:"#c2410c",cursor:"pointer",fontWeight:700}}>
                    ⚠️ Risk
                  </button>
                  <button onClick={e=>{e.stopPropagation();onOpenSafety("hazard",f);}}
                    style={{padding:"6px 15px",fontSize:14,borderRadius:8,border:"1px solid #dc2626",background:"#fef2f2",color:"#b91c1c",cursor:"pointer",fontWeight:700}}>
                    🚨 Hazard
                  </button>
                </>}
                <span style={{fontSize:14,fontWeight:700,color:"#374151",margin:"0 4px"}}>|</span>
                <span style={{fontSize:14,fontWeight:700,color:"#374151",marginRight:5}}>จัดการ</span>
                <button onClick={e=>{e.stopPropagation();setMode(mode===realIdx?null:realIdx);setExpandedRow(null);}}
                  style={{padding:"6px 15px",fontSize:14,borderRadius:8,border:"1px solid #3b82f6",background:isEditing?"#3b82f6":"#eff6ff",color:isEditing?"#fff":"#2563eb",cursor:"pointer",fontWeight:700}}>
                  {isEditing?"✕ ยกเลิก":"✏️ แก้ไข"}
                </button>
                <button onClick={e=>{e.stopPropagation();setDelIdx(realIdx);setExpandedRow(null);}}
                  style={{padding:"6px 15px",fontSize:14,borderRadius:8,border:"1px solid #ef4444",background:"#fef2f2",color:"#dc2626",cursor:"pointer",fontWeight:700}}>
                  🗑 ลบ
                </button>
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  if (!ready) return (
    <div style={{textAlign:"center",padding:"60px 0",color:"#94a3b8",fontSize:18}}>
      <div style={{fontSize:40,marginBottom:15,animation:"spin 1s linear infinite"}}>⟳</div>
      <div>กำลังโหลดข้อมูลจาก Google Sheets...</div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#4b5563,#374151)",borderRadius:"10px 10px 0 0",padding:"18px 25px",display:"flex",alignItems:"center",gap:15,flexWrap:"wrap"}}>
        <div style={{width:55,height:55,background:"#6b7280",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#d1d5db",fontWeight:700,flexShrink:0}}>WING 2</div>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:25,fontWeight:900,color:"#fff",fontStyle:"italic",letterSpacing:2}}>WING 2 FLIGHT SCHEDULE</div>
          {syncing?<span style={{fontSize:12,color:"#86efac"}}>⟳ sync...</span>:<span style={{fontSize:12,color:"#22c55e"}}>● Sheet</span>}
        </div>
        {/* View tabs */}
        <div style={{display:"flex",background:"rgba(0,0,0,0.3)",borderRadius:10,padding:3,gap:2}}>
          {tabBtn("daily","📋 รายวัน")}
          {tabBtn("weekly","📅 รายสัปดาห์")}
        </div>
        <button onClick={()=>setMode("add")} style={{background:"#16a34a",border:"none",color:"#fff",borderRadius:9,padding:"9px 20px",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0}}>
          ＋ เพิ่มการบิน
        </button>
      </div>

      {/* Daily controls */}
      {view==="daily"&&(
        <div style={{background:"#f1f5f9",padding:"10px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e2e8f0",flexWrap:"wrap"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#374151"}}>📋 วันที่:</span>
          <div style={{width:138}}>
            <DatePicker value={fmtDate2(selDate)} onChange={v=>{const d=parseDateStr(v);if(d)setSelDate(d);}} dark={false}/>
          </div>
          <button onClick={()=>{const d=new Date(selDate);d.setDate(d.getDate()-1);setSelDate(d);}}
            style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>‹</button>
          <button onClick={()=>{const d=new Date(selDate);d.setDate(d.getDate()+1);setSelDate(d);}}
            style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>›</button>
          <button onClick={()=>setSelDate(new Date())}
            style={{fontSize:14,padding:"3px 12px",borderRadius:6,border:"1px solid #7c3aed",background:"transparent",color:"#7c3aed",cursor:"pointer",fontWeight:700}}>วันนี้</button>
        </div>
      )}

      {/* Weekly controls */}
      {view==="weekly"&&(
        <div style={{background:"#f1f5f9",padding:"10px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e2e8f0",flexWrap:"wrap"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#374151"}}>📅 สัปดาห์:</span>
          <button onClick={()=>{const d=new Date(weekBase);d.setDate(d.getDate()-7);setWeekBase(d);}}
            style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>‹</button>
          <span style={{fontSize:15,fontWeight:700,color:"#1e293b",padding:"3px 12px",background:"#fff",borderRadius:8,border:"1px solid #cbd5e1"}}>
            {fmtDate2(wMon)} – {fmtDate2(wSun)}
          </span>
          <button onClick={()=>{const d=new Date(weekBase);d.setDate(d.getDate()+7);setWeekBase(d);}}
            style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>›</button>
        </div>
      )}

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:20,right:24,zIndex:999,background:toast.color,color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16,boxShadow:"0 4px 12px #0004"}}>{toast.msg}</div>}

      {/* Form */}
      {mode!==null&&(
        <div style={{padding:"12px 0 0"}}>
          <FlightForm
            init={mode==="add"?null:flights[mode]}
            onSave={handleSave}
            onCancel={()=>{ setMode(null); setFocusDay(null); }}
            onDateChange={(dateStr)=>{
              if (view==="weekly") {
                const d = parseDateStr(dateStr);
                if (d) setFocusDay(d); else setFocusDay(null);
              }
            }}
          />
        </div>
      )}

      {/* Confirm Delete */}
      {delIdx!==null&&(
        <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid #ef4444",borderRadius:10,padding:"15px 20px",margin:"10px 0",display:"flex",alignItems:"center",gap:15}}>
          <span style={{color:"#fca5a5",fontSize:16,flex:1}}>⚠️ ยืนยันลบ <b>{flights[delIdx]?.cs||flights[delIdx]?.mission}</b> ?</span>
          <button onClick={()=>setDelIdx(null)} style={{padding:"6px 18px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:15}}>ยกเลิก</button>
          <button onClick={()=>handleDelete(delIdx)} style={{padding:"6px 18px",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",cursor:"pointer",fontSize:15,fontWeight:700}}>ลบ</button>
        </div>
      )}

      {/* Weekly grouped view */}
      {view==="weekly"&&(
        <div style={{background:"#fff",borderRadius:"0 0 10px 10px",border:"1px solid #e2e8f0",overflow:"hidden"}}>
          {weekDaysToShow.map((wd,wi)=>{
            const isToday2 = !!sameDay(wd,today);
            const dow=wd.getDay();
            const DAY_COLORS = {0:"#ef4444",1:"#eab308",2:"#ec4899",3:"#22c55e",4:"#f97316",5:"#38bdf8",6:"#7c3aed"};
            const headerBg = DAY_COLORS[dow];
            const rowBg=dow===0?"#fff5f5":dow===1?"#fefce8":dow===2?"#fdf2f8":dow===3?"#f0fdf4":dow===4?"#fff7ed":dow===5?"#f0f9ff":"#f9f7ff";
            const borderColor=dow===0?"#fca5a5":dow===1?"#fde047":dow===2?"#f9a8d4":dow===3?"#86efac":dow===4?"#fdba74":dow===5?"#7dd3fc":"#c4b5fd";
            const dayFlights=sortFlights(flights.filter(f=>sameDay(parseDateStr(f.date),wd)));
            return (
              <div key={wi} style={{borderBottom:`1px solid ${borderColor}`,background:rowBg}}>
                <div style={{padding:"10px 20px",display:"flex",alignItems:"center",gap:12,background:headerBg,borderBottom:dayFlights.length?`1px solid ${borderColor}`:"none"}}>
                  <span style={{fontWeight:800,fontSize:16,color:"#fff",minWidth:50,textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>{DAY_EN_SHORT[dow]}</span>
                  <span style={{fontSize:15,color:"rgba(255,255,255,0.9)",fontWeight:600,textShadow:"0 1px 2px rgba(0,0,0,0.2)"}}>{fmtDate2(wd)}</span>
                  {isToday2&&<span style={{fontSize:12,background:"rgba(0,0,0,0.25)",color:"#fff",borderRadius:5,padding:"1px 8px",fontWeight:700}}>TODAY</span>}
                </div>
                {dayFlights.length>0&&(
                  isMobile ? (
                    <div style={{display:"flex",flexDirection:"column",gap:10,padding:12}}>
                      {dayFlights.map((f,fi)=>{
                        const realIdx=flights.indexOf(f);
                        const dc=DC[f.day]||"#3b82f6";
                        return (
                          <div key={fi} style={{background:"rgba(255, 255, 255, 0.75)",border:`1px solid ${borderColor}`,borderRadius:10,padding:12,display:"flex",flexDirection:"column",gap:8,boxShadow:"0 2px 4px rgba(0,0,0,0.03)"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{background:dc,color:"#fff",fontWeight:800,fontSize:11,padding:"1px 6px",borderRadius:3}}>{f.day}</span>
                                <span style={{background:f.acTypeF==="S-92A"?"#d1fae5":"#e0f2fe",color:f.acTypeF==="S-92A"?"#065f46":"#0369a1",fontWeight:700,fontSize:11,padding:"1px 5px",borderRadius:3}}>{f.acTypeF||"—"}</span>
                              </div>
                              <div style={{display:"flex",gap:6}}>
                                <button onClick={()=>setMode(realIdx)} style={{padding:"3px 8px",fontSize:12,borderRadius:5,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",cursor:"pointer"}}>✏️</button>
                                <button onClick={()=>setDelIdx(realIdx)} style={{padding:"3px 8px",fontSize:12,borderRadius:5,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
                              </div>
                            </div>
                            
                            <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{f.mission}</div>
                            
                            <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:6,fontSize:13}}>
                              <div><span style={{color:"var(--text-secondary)"}}>เครื่อง:</span> <strong style={{fontWeight:700}}>{f.ac}</strong></div>
                              <div><span style={{color:"var(--text-secondary)"}}>Callsign:</span> <strong>{f.cs}</strong></div>
                              <div><span style={{color:"var(--text-secondary)"}}>Pilot:</span> <strong>{f.pilot}</strong></div>
                              <div><span style={{color:"var(--text-secondary)"}}>Co-Pilot:</span> <strong>{f.coPilot}</strong></div>
                            </div>
                            
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,background:"rgba(0,0,0,0.02)",padding:"4px 8px",borderRadius:6}}>
                              <div>
                                <span style={{color:"var(--text-secondary)"}}>เวลา:</span> <span style={{fontFamily:"monospace",fontWeight:700,color:"#0f766e"}}>{f.takeoff}</span> - <span style={{fontFamily:"monospace",fontWeight:700,color:"#9333ea"}}>{f.land}</span>
                              </div>
                              <div style={{fontSize:12,color:"var(--text-secondary)"}}>{f.route}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:15,minWidth:900}}>
                        <tbody>
                          {dayFlights.map((f,fi)=>{
                            const realIdx=flights.indexOf(f);
                            const dc=DC[f.day]||"#3b82f6";
                            return (
                              <tr key={fi} style={{borderTop:`1px solid ${borderColor}`,background:fi%2===0?rowBg:"rgba(255,255,255,0.6)"}}>
                              <td style={{padding:"10px 12px",width:75,textAlign:"center"}}><span style={{background:dc,color:"#fff",fontWeight:800,fontSize:12,padding:"2px 8px",borderRadius:3}}>{f.day}</span></td>
                              <td style={{padding:"7px 4px",textAlign:"center"}}>
                                <span style={{background:f.acTypeF==="S-92A"?"#d1fae5":"#e0f2fe",color:f.acTypeF==="S-92A"?"#065f46":"#0369a1",fontWeight:700,fontSize:12,padding:"1px 6px",borderRadius:3}}>{f.acTypeF||"—"}</span>
                              </td>
                              <td style={{padding:"10px 12px",fontWeight:600,color:"#1e293b",minWidth:162}}>{f.mission}</td>
                              <td style={{padding:"10px 10px",textAlign:"center",minWidth:56,fontWeight:700}}>{f.ac}</td>
                              <td style={{padding:"10px 10px",textAlign:"center",minWidth:100}}>{f.cs}</td>
                              <td style={{padding:"10px 10px",textAlign:"center",fontWeight:600,minWidth:100}}>{f.pilot}</td>
                              <td style={{padding:"10px 10px",textAlign:"center",minWidth:100}}>{f.coPilot}</td>
                              <td style={{padding:"10px 10px",textAlign:"center",fontFamily:"monospace",fontWeight:700,color:"#0f766e",minWidth:69}}>{f.takeoff}</td>
                              <td style={{padding:"10px 10px",textAlign:"center",fontFamily:"monospace",fontWeight:700,color:"#9333ea",minWidth:69}}>{f.land}</td>
                              <td style={{padding:"10px 10px",fontSize:14,color:"var(--text-secondary)"}}>{f.route}</td>
                              <td style={{padding:"10px",textAlign:"center"}}>
                                <div style={{display:"flex",gap:5}}>
                                  <button onClick={()=>setMode(realIdx)} style={{padding:"3px 10px",fontSize:12,borderRadius:5,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",cursor:"pointer"}}>✏️</button>
                                  <button onClick={()=>setDelIdx(realIdx)} style={{padding:"3px 10px",fontSize:12,borderRadius:5,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
                {dayFlights.length===0&&<div style={{padding:"8px 20px 12px",fontSize:14,color:"#94a3b8"}}>— ไม่มีการบิน</div>}
              </div>
            );
          })}
          <div style={{textAlign:"center",padding:"6px 0 12px",fontSize:90,fontWeight:900,color:"#e2e8f0",userSelect:"none",lineHeight:1}}>201</div>
        </div>
      )}

      {/* Daily table */}
      {view==="daily"&&(
        <div style={{background:"#fff",borderRadius:"0 0 10px 10px",overflow:"hidden",border:"1px solid #e2e8f0"}}>
          <div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,tableLayout:"fixed"}}>
              <thead>
                <tr style={{background:"#7c3aed"}}>
                  <th style={{padding:0,width:0,border:"none"}}></th>
                  {COLS.map(c=><th key={c.k} style={{padding:"8px 4px",color:"#fff",fontWeight:800,fontSize:12,textAlign:"center",width:c.w,borderRight:"1px solid #6d28d9",overflow:"hidden"}}>{c.l}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.length===0&&(
                  <tr><td colSpan={COLS.length+1} style={{padding:"40px",textAlign:"center",color:"#94a3b8",fontSize:16}}>
                    {view==="daily"?`ไม่มีการบินในวันที่ ${fmtDate2(selDate)}`:"ยังไม่มีข้อมูล"}
                  </td></tr>
                )}
                {shown.map((f,i)=>renderFlightRow(f, flights.indexOf(f), i))}
              </tbody>
            </table>
          </div>
          <div style={{textAlign:"center",padding:"6px 0 12px",fontSize:90,fontWeight:900,color:"#e2e8f0",userSelect:"none",lineHeight:1}}>201</div>
        </div>
      )}

      <div style={{marginTop:12,fontSize:14,color:"var(--text-secondary)",textAlign:"right"}}>
        รวม {flights.length} sortie ทั้งหมด · แสดง {shown.length} sortie
      </div>
    </div>
  );
}

// ── Duty Tab ────────────────────────────────────────────────────────────────────
const MONTH_NAME_TH2 = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const DAY_EN_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_EN_SHORT = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function generateMonthRows(year, month) {
  // month = 0-indexed JS month
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const rows = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay(); // 0=Sun
    const dayFull = DAY_EN_FULL[dow];
    const daySh   = DAY_EN_SHORT[dow];
    const dateStr = `${d} ${MONTH_EN[month]}`;
    const type = dow===0?"sunday":dow===6?"saturday":"weekday";
    rows.push({ day:dayFull, daySh, date:dateStr, alert:"", sof:"", base:"", topic:"", d9923:"", csqdn:"", rmk:"", type });
  }
  return rows;
}

function NewMonthModal({ onClose, onCreate }) {
  const now = new Date();
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  // สำหรับกรอกทีละแถว
  const [rows, setRows] = useState(() => generateMonthRows(now.getFullYear(), now.getMonth()));
  const [bulkMode, setBulkMode] = useState(false); // false=รายวัน, true=ทั้งเดือน
  // bulk fields
  const [bulk, setBulk] = useState({alert:"",sof:"",base:"",d9923:"",csqdn:""});

  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:5,padding:"5px 9px",fontSize:15,width:"100%",boxSizing:"border-box" as any};
  const inpSm = {...inp, fontSize:14, padding:"3px 8px"};

  const changeMonth = (yr, mo) => {
    setSelYear(yr); setSelMonth(mo);
    setRows(generateMonthRows(yr, mo));
  };
  const setRow = (i,k,v) => setRows(p=>p.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const applyBulk = () => {
    setRows(p=>p.map(r=>({
      ...r,
      alert: bulk.alert||r.alert,
      sof:   r.type==="weekday"?(bulk.sof||r.sof):r.sof,
      base:  bulk.base||r.base,
      d9923: bulk.d9923||r.d9923,
      csqdn: bulk.csqdn||r.csqdn,
    })));
  };

  const rowBg = t => t==="saturday"?"rgba(168,85,247,0.08)":t==="sunday"?"rgba(239,68,68,0.08)":"transparent";
  const dayColor = t => t==="saturday"?"#a855f7":t==="sunday"?"#ef4444":"#e2e8f0";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"20px 0"}}>
      <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:18,width:"95%",maxWidth:1100,padding:24,position:"relative"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:15,marginBottom:25}}>
          <span style={{fontSize:25}}>📅</span>
          <div>
            <div style={{fontWeight:900,fontSize:20,color:"#f1f5f9"}}>สร้างตารางเวรประจำเดือนใหม่</div>
            <div style={{fontSize:14,color:"var(--text-secondary)"}}>เลือกเดือน จากนั้นกรอกข้อมูลรายวัน หรือกรอกทั้งเดือนในครั้งเดียว</div>
          </div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",color:"var(--text-secondary)",fontSize:28,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>

        {/* เลือกเดือน/ปี */}
        <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20,background:"#1e293b",borderRadius:10,padding:"12px 18px"}}>
          <span style={{fontSize:15,color:"#94a3b8",fontWeight:700}}>เลือกเดือน:</span>
          <select value={selMonth} onChange={e=>changeMonth(selYear,Number(e.target.value))}
            style={{...inp,width:"auto",minWidth:162}}>
            {MONTH_NAME_TH2.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e=>changeMonth(Number(e.target.value),selMonth)}
            style={{...inp,width:"auto",minWidth:112}}>
            {[2025,2026,2027,2028].map(y=><option key={y} value={y}>{y+543} ({y})</option>)}
          </select>
          <span style={{fontSize:15,color:"#38bdf8",fontWeight:700,marginLeft:10}}>
            {MONTH_NAME_TH2[selMonth]} {selYear+543} · {rows.length} วัน
          </span>
        </div>



        {/* ตารางรายวัน */}
        <div style={{overflowX:"auto",maxHeight:"45vh",overflowY:"auto",borderRadius:10,border:"1px solid #1e3a5f"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>
            <thead style={{position:"sticky",top:0,zIndex:2}}>
              <tr style={{background:"#4f46e5"}}>
                {["DAY","DATE","ALERT","SOF","BASE OPS.","อบรม","9923","C SQDN","REMARK"].map(h=>(
                  <th key={h} style={{padding:"9px 10px",color:"#fff",fontWeight:800,textAlign:"center",whiteSpace:"nowrap",borderRight:"1px solid #4338ca"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{background:rowBg(r.type),borderBottom:"1px solid #1e293b"}}>
                  <td style={{padding:"5px 10px",textAlign:"center",fontWeight:700,color:dayColor(r.type),whiteSpace:"nowrap"}}>{r.daySh||r.day.slice(0,3).toUpperCase()}</td>
                  <td style={{padding:"5px 8px",minWidth:138}}>
                    <DatePicker value={r.date} onChange={v=>setRow(i,"date",v)} dark={true}/>
                  </td>
                  {["alert","sof","base","topic","d9923","csqdn","rmk"].map(k=>(
                    <td key={k} style={{padding:"3px 6px",minWidth:100}}>
                      <input value={r[k]||""} onChange={e=>setRow(i,k,e.target.value)} style={inpSm}/>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{display:"flex",gap:12,justifyContent:"flex-end",marginTop:20}}>
          <button onClick={onClose}
            style={{padding:"10px 25px",fontSize:16,borderRadius:9,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>
            ยกเลิก
          </button>
          <button onClick={()=>onCreate(rows, selYear, selMonth)}
            style={{padding:"10px 30px",fontSize:16,borderRadius:9,border:"none",background:"#4f46e5",color:"#fff",cursor:"pointer",fontWeight:800}}>
            ✓ สร้างตารางเวร {MONTH_NAME_TH2[selMonth]} {selYear+543}
          </button>
        </div>
      </div>
    </div>
  );
}

function DutyTab() {
  const [view,setView]=useState("daily");
  const [monthly, setMonthly] = useState(MONTHLY);
  const [dutyLoaded, setDutyLoaded] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [toast,   setToast]   = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [monthLabel, setMonthLabel] = useState("พฤษภาคม 2569");
  const [syncing, setSyncing] = useState(false);

  const sq=DUTY_TODAY.sqdn201;
  const hdr=(bg="#2563eb")=>({background:bg,color:"#fff",padding:"10px 18px",fontWeight:800,fontSize:15,letterSpacing:1,textAlign:"center"} as any);
  const rowBg=t=>t==="saturday"?"#ede9fe":t==="sunday"||t==="holiday"?"#fce7f3":"#fff";
  const dayC =t=>t==="saturday"?"#7c3aed":t==="sunday"||t==="holiday"?"#dc2626":"#1e293b";

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),3000); };

  // โหลดจาก Sheet
  useEffect(() => {
    loadFromSheet("DUTY").then(rows => {
      if (rows.length > 1) {
        const [header, ...data] = rows;
        const loaded = data.map(r => ({day:r[0]||"",date:r[1]||"",alert:r[2]||"",sof:r[3]||"",base:r[4]||"",topic:r[5]||"",d9923:r[6]||"",csqdn:r[7]||"",rmk:r[8]||"",type:r[9]||"weekday"}));
        if (loaded.length > 0) {
          setMonthly(loaded);
          if (header[10]) setMonthLabel(String(header[10]));
        }
      }
      setDutyLoaded(true);
    }).catch(()=>setDutyLoaded(true));
  }, []);

  // บันทึกแบบระบุการกระทำ — เรียกใช้โดยตรงเมื่อมีการเปลี่ยนแปลง
  const saveDutyToSheet = (updatedMonthly, label = monthLabel) => {
    setSyncing(true);
    const rows = [
      ["day","date","alert","sof","base","topic","d9923","csqdn","rmk","type", label],
      ...updatedMonthly.map(r=>[r.day,r.date,r.alert,r.sof,r.base,r.topic,r.d9923,r.csqdn,r.rmk,r.type])
    ];
    saveToSheet("DUTY", rows).finally(()=>setSyncing(false));
  };

  const startEdit = (i) => { setEditIdx(i); setEditRow({...monthly[i]}); };
  const cancelEdit = () => { setEditIdx(null); setEditRow(null); };
  const saveEdit = () => {
    const next = monthly.map((r,i)=>i===editIdx?editRow:r);
    setMonthly(next);
    saveDutyToSheet(next);
    setEditIdx(null); setEditRow(null);
    showToast("บันทึกข้อมูลเรียบร้อย ✓ sync แล้ว");
  };
  const setField = (k,v) => setEditRow(p=>({...p,[k]:v}));

  const handleCreate = (rows, yr, mo) => {
    const label = `${MONTH_NAME_TH2[mo]} ${yr+543}`;
    setMonthly(rows);
    setMonthLabel(label);
    saveDutyToSheet(rows, label);
    setShowNew(false);
    setView("monthly");
    showToast(`✓ สร้างตารางเวร ${label} สำเร็จ — ${rows.length} วัน`);
  };

  const inpStyle = {background:"#fff",border:"1px solid #cbd5e1",color:"#1e293b",borderRadius:5,padding:"3px 8px",fontSize:14,width:"100%",boxSizing:"border-box" as any};

  return <div style={{background:"#f8fafc",minHeight:"80vh"}}>
    {showNew && <NewMonthModal onClose={()=>setShowNew(false)} onCreate={handleCreate}/>}
    {toast && <div style={{position:"fixed",top:20,right:24,zIndex:999,background:"#22c55e",color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16,boxShadow:"0 4px 12px #0004"}}>{toast}</div>}

    {/* Header */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px 0",flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",background:"#e2e8f0",borderRadius:10,padding:3,gap:2}}>
        {["daily","monthly"].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:15,background:view===v?"#fff":"transparent",color:view===v?"#1e293b":"var(--text-secondary)",boxShadow:view===v?"0 1px 4px #0002":"none"}}>
            {v==="daily"?"📋 รายวัน":"📅 ประจำเดือน"}
          </button>
        ))}
      </div>
      <div style={{textAlign:"center",flex:1}}>
        <div style={{display:"inline-block",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",borderRadius:12,padding:"12px 60px"}}>
          <span style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:2}}>PILOTS ON DUTY</span>
        </div>
      </div>
      <button onClick={()=>setShowNew(true)}
        style={{background:"#4f46e5",border:"none",color:"#fff",borderRadius:9,padding:"10px 20px",fontSize:15,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
        📅 สร้างตารางเดือนใหม่
      </button>
    </div>

    {/* DAILY */}
    {view==="daily"&&<div style={{padding:"18px 30px"}}>
      <div style={{textAlign:"center",margin:"10px 0 18px"}}>
        <span style={{fontSize:30,fontWeight:900,color:"#1e293b"}}>TODAY</span>
        <span style={{fontSize:22,color:"var(--text-secondary)",marginLeft:18}}>{DUTY_TODAY.date}</span>
      </div>
      <div style={{display:"flex",gap:22,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div style={{flex:"0 0 330px"}}>
          <div style={{textAlign:"center",marginBottom:12}}><span style={{background:"#2563eb",color:"#fff",fontWeight:900,fontSize:19,padding:"8px 28px",borderRadius:8}}>201 SQUADRON</span></div>
          <div style={{background:"#fff",borderRadius:12,overflow:"hidden",border:"1px solid #cbd5e1"}}>
            {[["ALERT 1","TEL."],[sq.alert1.name,sq.alert1.tel],["SOF ▾","TEL."],[sq.sof.name,sq.sof.tel],["EMERGENCY ▾","TOPIC"],[sq.emergency.name||"\u00A0",sq.emergency.topic||"\u00A0"],["BASE OPS. ▾","Tel.BaseOps"],[sq.baseOps.name,sq.baseOps.tel]].map(([a,b],i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",...(i%2===0?{background:"#2563eb"}:{borderBottom:"1px solid #e2e8f0"})}}>
                {i%2===0?<><div style={hdr()}>{a}</div><div style={hdr()}>{b}</div></>:<><div style={{padding:"15px 18px",fontSize:18,fontWeight:600,color:"#1e293b",textAlign:"center"}}>{a}</div><div style={{padding:"15px 18px",fontSize:18,color:"#1e293b",textAlign:"center",fontFamily:"monospace"}}>{b}</div></>}
              </div>
            ))}
            <div style={{background:"#334155",padding:"10px 18px",textAlign:"center"}}><span style={{color:"#fff",fontWeight:800,fontSize:15}}>REMARK ▾</span></div>
            <div style={{padding:"15px 18px",minHeight:50,fontSize:18,color:"#94a3b8"}}>{sq.remark||"\u00A0"}</div>
          </div>
        </div>
        <div style={{flex:1,minWidth:300}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            {[{label:"9923 DETACHMENT",color:"#f97316",list:DUTY_TODAY.det9923},{label:"C SQUADRON",color:"#eab308",list:DUTY_TODAY.cSqdn}].map(g=>(
              <div key={g.label}>
                <div style={{textAlign:"center",marginBottom:10}}><span style={{background:g.color,color:"#fff",fontWeight:900,fontSize:18,padding:"6px 20px",borderRadius:8}}>{g.label}</span></div>
                {g.list.map((n,i)=><div key={i} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"15px",textAlign:"center",fontSize:19,fontWeight:600,color:"#1e293b",marginBottom:9}}>{n}</div>)}
              </div>
            ))}
          </div>
          <div style={{marginTop:25}}>
            <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:12}}>
              <span style={{fontSize:25,fontWeight:900,color:"#1e293b",border:"2px solid #94a3b8",borderRadius:10,padding:"3px 20px"}}>TOMORROW</span>
              <span style={{fontSize:20,color:"var(--text-secondary)"}}>{DUTY_TMR.date}</span>
            </div>
            <div style={{background:"#fff",borderRadius:12,overflow:"hidden",border:"1px solid #cbd5e1"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#374151"}}>
                {["ALERT 1 ▾","SOF","EMERGENCY BRIEF"].map(h=><div key={h} style={{padding:"10px",color:"#fff",fontWeight:800,fontSize:14,textAlign:"center"}}>{h}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
                <div style={{padding:"15px",fontSize:18,fontWeight:600,color:"#1e293b",textAlign:"center"}}>{DUTY_TMR.alert1}</div>
                <div style={{padding:"15px",fontSize:18,color:"#94a3b8",textAlign:"center"}}>{DUTY_TMR.sof}</div>
                <div style={{padding:"15px",fontSize:18,color:"#94a3b8",textAlign:"center"}}>{DUTY_TMR.brief}</div>
              </div>
            </div>
            <div onClick={()=>setView("monthly")} style={{marginTop:12,background:"#e2e8f0",borderRadius:10,padding:"15px",textAlign:"center",cursor:"pointer",border:"1px solid #cbd5e1"}}>
              <span style={{fontWeight:800,color:"#1e293b",fontSize:16,textDecoration:"underline"}}>Pilots on duty monthly schedule CLICK !!!</span>
            </div>
          </div>
        </div>
      </div>
    </div>}

    {/* MONTHLY */}
    {view==="monthly"&&<div style={{padding:"15px 30px"}}>
      <div style={{display:"flex",alignItems:"center",gap:15,marginBottom:10}}>
        <span style={{fontSize:18,fontWeight:800,color:"#4f46e5"}}>📅 ตารางเวร {monthLabel}</span>
        <span style={{fontSize:14,color:"var(--text-secondary)"}}>· คลิก ✏️ เพื่อแก้ไข</span>
        <button onClick={()=>setShowNew(true)} style={{marginLeft:"auto",fontSize:14,padding:"5px 15px",borderRadius:8,border:"1px solid #a5b4fc",background:"transparent",color:"#4f46e5",cursor:"pointer",fontWeight:700}}>
          + สร้างเดือนใหม่
        </button>
      </div>
      <div style={{background:"#fff",borderRadius:12,overflow:"hidden",border:"1px solid #e2e8f0"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:15,minWidth:900}}>
            <thead><tr style={{background:"#4f46e5"}}>
              {["DAY","DATE","ALERT","SOF","BASE OPS.","อบรมวิชาการ","9923","C SQDN","REMARK","แก้ไข"].map(h=><th key={h} style={{padding:"11px 12px",color:"#fff",fontWeight:800,fontSize:14,textAlign:"center",borderRight:"1px solid #4338ca"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {monthly.map((r,i)=>{
                const isToday=r.date==="29 May";
                const isEditing=editIdx===i;
                if (isEditing && editRow) {
                  return (
                    <tr key={i} style={{background:"#eff6ff",borderBottom:"2px solid #3b82f6"}}>
                      <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:dayC(editRow.type)}}>{editRow.day}</td>
                      <td style={{padding:"8px 10px",minWidth:162}}>
                        <DatePicker value={editRow.date} onChange={v=>setField("date",v)} dark={false}/>
                      </td>
                      {["alert","sof","base","topic","d9923","csqdn","rmk"].map(k=>(
                        <td key={k} style={{padding:"5px 8px"}}>
                          <input value={editRow[k]||""} onChange={e=>setField(k,e.target.value)} style={inpStyle}/>
                        </td>
                      ))}
                      <td style={{padding:"8px 10px",textAlign:"center",whiteSpace:"nowrap"}}>
                        <button onClick={saveEdit} style={{fontSize:14,padding:"3px 12px",borderRadius:6,border:"none",background:"#22c55e",color:"#fff",cursor:"pointer",fontWeight:700,marginRight:5}}>✓ บันทึก</button>
                        <button onClick={cancelEdit} style={{fontSize:14,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"transparent",color:"var(--text-secondary)",cursor:"pointer"}}>✕</button>
                      </td>
                    </tr>
                  );
                }
                return <tr key={i} style={{borderBottom:"1px solid #e2e8f0",background:isToday?"#dbeafe":rowBg(r.type),outline:isToday?"2px solid #3b82f6":"none"}}>
                  <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:dayC(r.type),whiteSpace:"nowrap"}}>{r.day}{isToday&&<span style={{marginLeft:5,fontSize:11,background:"#3b82f6",color:"#fff",borderRadius:3,padding:"1px 5px"}}>TODAY</span>}</td>
                  <td style={{padding:"10px 12px",textAlign:"center",fontWeight:600,color:dayC(r.type),whiteSpace:"nowrap"}}>{r.date}</td>
                  <td style={{padding:"10px 12px",textAlign:"center",fontWeight:600,color:"#1e293b"}}>{r.alert}</td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:"#374151"}}>{r.sof}</td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:"#374151"}}>{r.base}</td>
                  <td style={{padding:"10px 12px",textAlign:"center",fontSize:14,color:"#374151"}}>{r.topic}</td>
                  <td style={{padding:"10px 12px",fontSize:14,color:"#374151"}}>{r.d9923}</td>
                  <td style={{padding:"10px 12px",fontSize:14,color:"#374151"}}>{r.csqdn}</td>
                  <td style={{padding:"10px 12px",textAlign:"center",color:r.rmk?"#dc2626":"#94a3b8",fontWeight:r.rmk?700:400,fontSize:14}}>{r.rmk}</td>
                  <td style={{padding:"10px",textAlign:"center"}}>
                    <button onClick={()=>startEdit(i)} style={{fontSize:14,padding:"3px 10px",borderRadius:6,border:"1px solid #a5b4fc",background:"transparent",color:"#4f46e5",cursor:"pointer"}}>✏️</button>
                  </td>
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
const STATUSES = ["FMC","PMC","NMC"];

function AcForm({init, isGroupA, onSave, onCancel}) {
  const [f,setF] = useState(JSON.parse(JSON.stringify(init)));
  const setC = (k,v) => setF(p=>({...p, cols:{...p.cols,[k]:v}}));
  const set  = (k,v) => setF(p=>({...p,[k]:v}));
  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:6,padding:"6px 10px",fontSize:15,width:"100%",boxSizing:"border-box" as any};
  const inpDis = {...inp, background:"#1e293b", color:"var(--text-secondary)", cursor:"not-allowed"};
  const lbl = (t) => <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>{t}</div>;
  const hrs = isGroupA
    ? [{k:"h50",l:"50 Hr."},{k:"h375",l:"375 Hr."},{k:"h750",l:"750 Hr."},{k:"h1500",l:"1500 Hr."}]
    : [{k:"h40",l:"40 Hr."},{k:"h120",l:"120 Hr."},{k:"h480",l:"480 Hr."},{k:"h960",l:"960 Hr."}];
  const inspKey = isGroupA ? "insp30" : "insp90";
  const inspLbl = isGroupA ? "30 DAYS" : "90 DAYS";

  return (
    <div style={{background:"#0f2040",border:"1px solid #2563eb",borderRadius:12,padding:18,marginBottom:18}}>
      <div style={{fontWeight:700,color:"#60a5fa",fontSize:16,marginBottom:15}}>✏️ แก้ไขสถานะอากาศยาน</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:15}}>
        {/* ID — block ไม่ให้แก้ */}
        <div>
          {lbl("หมายเลข A/C")}
          <input value={f.id} readOnly disabled style={inpDis}/>
        </div>
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

        {/* System checks */}
        <div style={{gridColumn:"1/-1",borderTop:"1px solid #1e3a5f",paddingTop:12,marginTop:5}}>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {["com","nav","radar","emer"].map(k=>(
              <label key={k} style={{display:"flex",alignItems:"center",gap:6,fontSize:15,color:"#e2e8f0",cursor:"pointer"}}>
                <input type="checkbox" checked={!!f[k]} onChange={e=>set(k,e.target.checked?1:0)} style={{width:19,height:19}}/>
                {k.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Remark */}
        <div style={{gridColumn:"1/-1",borderTop:"1px solid #1e3a5f",paddingTop:12,marginTop:5}}>
          <div>{lbl("Remark")}<input value={f.remark} onChange={e=>set("remark",e.target.value)} style={inp}/></div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{padding:"8px 20px",fontSize:15,borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
        <button onClick={()=>onSave(f)} style={{padding:"8px 22px",fontSize:15,borderRadius:8,border:"none",background:"#2563eb",color:"#fff",cursor:"pointer",fontWeight:700}}>บันทึก ✓</button>
      </div>
    </div>
  );
}

function AcTab() {
  const [listA, setListA] = useState(AIRCRAFT_A);
  const [listB, setListB] = useState(AIRCRAFT_B);
  const [acLoaded, setAcLoaded] = useState({a:false, b:false});
  const [syncing, setSyncing] = useState(false);
  const [editA, setEditA] = useState(null);
  const [editB, setEditB] = useState(null);
  const [toast, setToast] = useState(null);
  const today = new Date();
  const dateStr = `${today.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][today.getMonth()]} ${today.getFullYear()}`;

  const [lastSync, setLastSync] = useState<string>("");

  const loadFromSheets = () => {
    loadFromSheet("AIRCRAFT STATUS S-92A").then(rows => {
      if (rows.length > 1) {
        const [, ...data] = rows;
        const loaded = data.map(r => ({id:r[0]||"",status:r[1]||"FMC",cols:{h50:Number(r[2])||0,h375:Number(r[3])||0,h750:Number(r[4])||0,h1500:Number(r[5])||0},trouble:r[6]||"",insp30:r[7]||"",insp12:r[8]||"",com:r[9]===true||r[9]==="TRUE"||Number(r[9])===1?1:0,nav:r[10]===true||r[10]==="TRUE"||Number(r[10])===1?1:0,radar:r[11]===true||r[11]==="TRUE"||Number(r[11])===1?1:0,emer:r[12]===true||r[12]==="TRUE"||Number(r[12])===1?1:0,remark:r[13]||""}));
        if (loaded.length > 0) setListA(loaded);
      }
      setAcLoaded(p=>({...p,a:true}));
    }).catch(()=>setAcLoaded(p=>({...p,a:true})));
    loadFromSheet("AIRCRAFT STATUS S-70i").then(rows => {
      if (rows.length > 1) {
        const [, ...data] = rows;
        const loaded = data.map(r => ({id:r[0]||"",status:r[1]||"FMC",cols:{h40:Number(r[2])||0,h120:Number(r[3])||0,h480:Number(r[4])||0,h960:Number(r[5])||0},trouble:r[6]||"",insp90:r[7]||"",insp12:r[8]||"",com:r[9]===true||r[9]==="TRUE"||Number(r[9])===1?1:0,nav:r[10]===true||r[10]==="TRUE"||Number(r[10])===1?1:0,radar:r[11]===true||r[11]==="TRUE"||Number(r[11])===1?1:0,emer:r[12]===true||r[12]==="TRUE"||Number(r[12])===1?1:0,remark:r[13]||""}));
        if (loaded.length > 0) setListB(loaded);
      }
      setAcLoaded(p=>({...p,b:true}));
    }).catch(()=>setAcLoaded(p=>({...p,b:true})));
    const now = new Date();
    setLastSync(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`);
  };

  // โหลดครั้งแรก + auto-refresh ทุก 30 วินาที
  useEffect(() => {
    loadFromSheets();
    const t = setInterval(loadFromSheets, 30000);
    return () => clearInterval(t);
  }, []);

  // บันทึกแบบระบุการกระทำ — เรียกใช้โดยตรงเมื่อมีการเปลี่ยนแปลง
  const saveAcToSheet = (updatedList, isA) => {
    setSyncing(true);
    if (isA) {
      const rows = [["id","status","h50","h375","h750","h1500","trouble","insp30","insp12","com","nav","radar","emer","remark"],...updatedList.map(a=>[a.id,a.status,a.cols.h50,a.cols.h375,a.cols.h750,a.cols.h1500,a.trouble,a.insp30,a.insp12,a.com===1,a.nav===1,a.radar===1,a.emer===1,a.remark])];
      saveToSheet("AIRCRAFT STATUS S-92A", rows).finally(()=>setSyncing(false));
    } else {
      const rows = [["id","status","h40","h120","h480","h960","trouble","insp90","insp12","com","nav","radar","emer","remark"],...updatedList.map(a=>[a.id,a.status,a.cols.h40,a.cols.h120,a.cols.h480,a.cols.h960,a.trouble,a.insp90,a.insp12,a.com===1,a.nav===1,a.radar===1,a.emer===1,a.remark])];
      saveToSheet("AIRCRAFT STATUS S-70i", rows).finally(()=>setSyncing(false));
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),2500); };
  const saveA = (f,i) => {
    const next = listA.map((r,idx)=>idx===i?f:r);
    setListA(next);
    saveAcToSheet(next, true);
    setEditA(null);
    showToast("บันทึกสำเร็จ ✓");
  };
  const saveB = (f,i) => {
    const next = listB.map((r,idx)=>idx===i?f:r);
    setListB(next);
    saveAcToSheet(next, false);
    setEditB(null);
    showToast("บันทึกสำเร็จ ✓");
  };

  const statusColor = (s) => s==="FMC"?{bg:"#16a34a",c:"#fff"}:s==="PMC"?{bg:"#d97706",c:"#fff"}:s==="NMC"?{bg:"#dc2626",c:"#fff"}:{bg:"#2563eb",c:"#fff"};
  const chk = (v) => (
    <div style={{width:35,height:35,borderRadius:6,background:v?"#16a34a":"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",fontWeight:900,flexShrink:0}}>
      {v?"✓":"✗"}
    </div>
  );

  const renderTable = (list, setList, isA, editIdx, setEdit, saveFunc) => {
    const cols     = isA ? ["50 Hr.","375 Hr.","750 Hr.","1500 Hr."] : ["40 Hr.","120 Hr.","480 Hr.","960 Hr."];
    const colKeys  = isA ? ["h50","h375","h750","h1500"] : ["h40","h120","h480","h960"];
    const inspKey  = isA ? "insp30" : "insp90";
    const inspLabel= isA ? "30 DAYS" : "90 DAYS";
    const inp = {background:"#fff",border:"1px solid #cbd5e1",color:"#1e293b",borderRadius:6,padding:"6px 10px",fontSize:15,width:"100%",boxSizing:"border-box" as any};

    if (isMobile) {
      return (
        <div style={{display:"flex",flexDirection:"column",gap:15,marginBottom:25}}>
          {list.map((ac,i)=>{
            const sc = statusColor(ac.status);
            const isNMC = ac.status==="NMC";
            const rowBg = isNMC?"#fff0f0":i%2===0?"#fff":"#f8fafc";
            const bdr = "1px solid #cbd5e1";
            const isEditing = editIdx===i;
            const pi = ac[inspKey]; const p12 = ac.insp12;
            const p12Past = p12&&p12!=="null"&&new Date(p12)<new Date();
            const heloImg = HELO_IMG[ac.id];
            return (
              <div key={ac.id} style={{background:rowBg,borderRadius:12,border:isNMC?"2px solid #dc2626":"2px solid #cbd5e1",overflow:"hidden",padding:16,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 4px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontWeight:900,fontSize:22,color:"#1e293b",fontFamily:"monospace"}}>{ac.id}</span>
                    <span style={{fontSize:14,fontWeight:800,padding:"2px 10px",borderRadius:5,background:sc.bg,color:sc.c}}>{ac.status}</span>
                  </div>
                  {heloImg && <HeloImg src={heloImg} alt={ac.id}/>}
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:8,background:"rgba(0,0,0,0.03)",padding:8,borderRadius:8}}>
                  {colKeys.map((k,idx)=>(
                    <div key={k} style={{display:"flex",flexDirection:"column",fontSize:12,color:"var(--text-secondary)"}}>
                      <span>{cols[idx]}</span>
                      <span style={{fontFamily:"monospace",fontWeight:700,fontSize:15,color:isNMC?"#dc2626":"#1e293b"}}>{ac.cols[k]??"-"}</span>
                    </div>
                  ))}
                </div>

                <div style={{fontSize:14,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #e2e8f0",paddingBottom:4}}>
                    <span style={{color:"var(--text-secondary)"}}>Trouble</span>
                    <span style={{fontWeight:isNMC?700:400,color:isNMC?"#dc2626":"#374151"}}>{ac.trouble||"-"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #e2e8f0",paddingBottom:4,alignItems:"center"}}>
                    <span style={{color:"var(--text-secondary)"}}>COM/NAV/RADAR/EMER</span>
                    <div style={{display:"flex",gap:4}}>
                      {["com","nav","radar","emer"].map(k=>chk(ac[k]))}
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #e2e8f0",paddingBottom:4}}>
                    <span style={{color:"var(--text-secondary)"}}>{inspLabel}</span>
                    <span style={{color:!pi||pi==="null"?"#ef4444":"#2563eb",fontFamily:"monospace",fontWeight:700}}>{pi||"—"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid #e2e8f0",paddingBottom:4}}>
                    <span style={{color:"var(--text-secondary)"}}>12 MONTH</span>
                    <span style={{color:p12Past?"#ef4444":"#2563eb",fontFamily:"monospace",fontWeight:700}}>{p12||"—"}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",paddingTop:4}}>
                    <span style={{color:"var(--text-secondary)"}}>Remark</span>
                    <span style={{fontWeight:ac.remark?700:400,color:ac.remark?"#b45309":"#94a3b8"}}>{ac.remark||"-"}</span>
                  </div>
                </div>

                <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}>
                  <button onClick={()=>setEdit(isEditing?null:i)}
                    style={{padding:"6px 16px",fontSize:14,borderRadius:6,border:"1px solid #3b82f6",background:isEditing?"#3b82f6":"transparent",color:isEditing?"#fff":"#3b82f6",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                    {isEditing?"✕ ปิด":"✏️ แก้ไขข้อมูล"}
                  </button>
                </div>

                {isEditing && (
                  <div style={{padding:"15px 12px",background:"#f0f7ff",borderRadius:8,borderLeft:"4px solid #3b82f6",marginTop:8}}>
                    <AcForm init={ac} isGroupA={isA} onSave={f=>saveFunc(f,i)} onCancel={()=>setEdit(null)}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{background:"#fff",borderRadius:12,overflow:"hidden",border:"2px solid #cbd5e1",marginBottom:25}}>
        {/* Column headers */}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:15,border:"2px solid #cbd5e1"}}>
            <thead>
              {/* Column headers only */}
              <tr style={{background:"#2563eb"}}>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:800,textAlign:"center",minWidth:212,border:"1px solid #1d4ed8"}}>A/C</th>
                {cols.map(c=><th key={c} style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:94,border:"1px solid #1d4ed8"}}>{c}</th>)}
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:225,border:"1px solid #1d4ed8"}}>Trouble</th>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:62,border:"1px solid #1d4ed8"}}>COM</th>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:62,border:"1px solid #1d4ed8"}}>NAV</th>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:81,border:"1px solid #1d4ed8"}}>RADAR</th>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:69,border:"1px solid #1d4ed8"}}>EMER</th>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:188,border:"1px solid #1d4ed8"}}>Remark</th>
                <th style={{padding:"12px 10px",color:"#fff",fontWeight:700,textAlign:"center",minWidth:69,border:"1px solid #1d4ed8"}}>แก้ไข</th>
              </tr>
            </thead>
            <tbody>
              {list.map((ac,i)=>{
                const sc = statusColor(ac.status);
                const isNMC = ac.status==="NMC";
                const rowBg = isNMC?"#fff0f0":i%2===0?"#fff":"#f8fafc";
                const bdr = "1px solid #cbd5e1";
                const isEditing = editIdx===i;
                const pi = ac[inspKey]; const p12 = ac.insp12;
                const p12Past = p12&&p12!=="null"&&new Date(p12)<new Date();
                const heloImg = HELO_IMG[ac.id];
                return (
                  <>
                    <tr key={ac.id} style={{background:rowBg}}>
                      {/* A/C: รูป + ID + STATUS */}
                      <td style={{padding:"10px 12px",textAlign:"center",border:bdr,background:rowBg,verticalAlign:"middle"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{flex:1,textAlign:"center"}}>
                            <div style={{fontWeight:900,fontSize:19,color:"#1e293b",fontFamily:"monospace",marginBottom:5}}>{ac.id}</div>
                            <span style={{fontSize:15,fontWeight:800,padding:"3px 12px",borderRadius:5,background:sc.bg,color:sc.c}}>{ac.status}</span>
                          </div>
                          {heloImg && <HeloImg src={heloImg} alt={ac.id}/>}
                        </div>
                      </td>
                      {colKeys.map(k=><td key={k} style={{padding:"12px 10px",textAlign:"center",verticalAlign:"middle",fontFamily:"monospace",fontWeight:700,fontSize:16,color:isNMC?"#dc2626":"#1e293b",background:rowBg,border:bdr}}>{ac.cols[k]??"-"}</td>)}
                      <td style={{padding:"12px",textAlign:"center",verticalAlign:"middle",fontSize:15,color:isNMC?"#dc2626":"#374151",fontWeight:isNMC?700:400,background:isNMC?"#fef2f2":rowBg,border:bdr}}>{ac.trouble||"-"}</td>
                      {["com","nav","radar","emer"].map(k=>(
                        <td key={k} style={{padding:"10px",textAlign:"center",verticalAlign:"middle",background:rowBg,border:bdr}}>
                          {chk(ac[k])}
                        </td>
                      ))}
                      <td style={{padding:"12px",textAlign:"center",verticalAlign:"middle",fontSize:15,color:ac.remark?"#b45309":"#94a3b8",fontWeight:ac.remark?700:400,background:rowBg,border:bdr}}>{ac.remark||"-"}</td>
                      <td style={{padding:"10px",textAlign:"center",verticalAlign:"middle",background:rowBg,border:bdr}}>
                        <button onClick={()=>setEdit(isEditing?null:i)}
                          style={{padding:"5px 12px",fontSize:14,borderRadius:6,border:"1px solid #3b82f6",background:isEditing?"#3b82f6":"transparent",color:isEditing?"#fff":"#3b82f6",cursor:"pointer"}}>
                          {isEditing?"✕":"✏️"}
                        </button>
                      </td>
                    </tr>
                    {/* Inspection dates row */}
                    <tr style={{background:isNMC?"#fff5f5":i%2===0?"#f8fafc":"#f1f5f9"}}>
                      <td colSpan={2} style={{padding:"5px 15px 8px",fontSize:14,border:bdr,textAlign:"center"}}>
                        <span style={{color:"var(--text-secondary)"}}>{inspLabel}: </span>
                        <span style={{color:!pi||pi==="null"?"#ef4444":"#2563eb",fontFamily:"monospace",fontWeight:700}}>{pi||"—"}</span>
                      </td>
                      <td colSpan={cols.length} style={{padding:"5px 15px 8px",fontSize:14,border:bdr,textAlign:"center"}}>
                        <span style={{color:"var(--text-secondary)"}}>12 MONTH: </span>
                        <span style={{color:p12Past?"#ef4444":"#2563eb",fontFamily:"monospace",fontWeight:700}}>{p12||"—"}</span>
                      </td>
                      <td colSpan={6} style={{border:bdr}}/>
                    </tr>
                    {isEditing && (
                      <tr><td colSpan={cols.length+6} style={{padding:0,border:bdr}}>
                        <div style={{padding:"15px 18px",background:"#f0f7ff",borderBottom:"2px solid #3b82f6"}}>
                          <AcForm init={ac} isGroupA={isA} onSave={f=>saveFunc(f,i)} onCancel={()=>setEdit(null)}/>
                        </div>
                      </td></tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {toast && <div style={{position:"fixed",top:20,right:24,zIndex:999,background:"#22c55e",color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16,boxShadow:"0 4px 12px #0004"}}>{toast}</div>}
      {/* Summary แยกตาม ฮ. */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:20,flexWrap:"nowrap"}}>
        <div style={{display:"flex",gap:20,flexWrap:"wrap",flex:1}}>
          {[{label:"S-92A", list:listA},{label:"S-70i", list:listB}].map(({label,list})=>(
            <div key={label} style={{background:"#fff",border:"2px solid #e2e8f0",borderRadius:12,padding:"12px 12px",minWidth:0}}>
              <div style={{fontWeight:800,fontSize:16,color:"#1e293b",marginBottom:10,letterSpacing:1}}>{label}</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {Object.entries(SB).filter(([k])=>k!=="INSP").map(([k,v])=>{
                  const cnt = list.filter(a=>a.status===k).length;
                  const textC = k==="FMC"?"#16a34a":k==="PMC"?"#d97706":"#dc2626";
                  return (
                    <div key={k} style={{display:"flex",alignItems:"center",gap:6,background:v.bg+"22",border:`1px solid ${v.c}55`,borderRadius:8,padding:"5px 12px"}}>
                      <span style={{fontSize:14,padding:"2px 10px",borderRadius:5,background:v.bg,color:v.c,fontWeight:800}}>{k}</span>
                      <span style={{fontSize:20,fontWeight:900,color:textC,fontFamily:"monospace"}}>{cnt}</span>
                      <span style={{fontSize:14,color:"var(--text-secondary)"}}>ลำ</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {syncing&&<span style={{fontSize:14,color:"#22c55e"}}>⟳ sync...</span>}
          {lastSync&&!syncing&&<span style={{fontSize:12,color:"#94a3b8"}}>อัปเดต {lastSync}</span>}
          <button onClick={loadFromSheets}
            style={{fontSize:14,padding:"5px 12px",borderRadius:8,border:"1px solid #38bdf8",background:"transparent",color:"#38bdf8",cursor:"pointer",fontWeight:700}}>
            ⟳ รีเฟรช
          </button>
          <div style={{background:"#1e293b",borderRadius:10,padding:"10px 20px",textAlign:"center"}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700}}>DATE</div>
            <div style={{fontSize:18,color:"#fff",fontWeight:700,fontFamily:"monospace"}}>{dateStr}</div>
          </div>
        </div>
      </div>
      {renderTable(listA, setListA, true,  editA, setEditA, saveA)}
      {renderTable(listB, setListB, false, editB, setEditB, saveB)}
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────
const GCAL_API_KEY = "AIzaSyCtwU-J2LiNDAHpYSw-saa2csymaj6v6Qg";
const GCAL_SOURCES = [
  { id: "spidersqdn@gmail.com", name: "spidersqdn@gmail.com", color: "#3b82f6" },
];

function CalendarTab() {
  const [view,      setView]    = useState<"daily"|"weekly">("daily");
  const [allEvents, setAllEvents] = useState<Record<string,any[]>>({});
  const [enabled,   setEnabled] = useState<Record<string,boolean>>(
    Object.fromEntries(GCAL_SOURCES.map(s=>[s.id,true]))
  );
  const [loading,  setLoading] = useState(true);
  const [errors,   setErrors]  = useState<Record<string,string>>({});
  const [selDate,  setSelDate] = useState(new Date());
  const [weekBase, setWeekBase]= useState(new Date());
  const today = new Date();

  const fmtD     = (d:Date) => `${d.getDate()} ${MONTH_EN[d.getMonth()]} ${d.getFullYear()}`;
  const fmtShort = (d:Date) => `${d.getDate()} ${MONTH_EN[d.getMonth()]}`;
  const getWkMon = (d:Date) => { const x=new Date(d); const dow=x.getDay(); x.setDate(x.getDate()-(dow===0?6:dow-1)); return x; };
  const wMon = getWkMon(weekBase);
  const wSun = new Date(wMon); wSun.setDate(wMon.getDate()+6);

  const fetchAll = async (from:Date, to:Date) => {
    setLoading(true);
    const tMin = from.toISOString();
    const tMax = to.toISOString();
    const newEvents: Record<string,any[]> = {};
    const newErrors: Record<string,string> = {};
    await Promise.all(GCAL_SOURCES.map(async src => {
      try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(src.id)}/events?key=${GCAL_API_KEY}&timeMin=${tMin}&timeMax=${tMax}&singleEvents=true&orderBy=startTime&maxResults=100`;
        const res = await fetch(url, { headers: { "Accept":"application/json" } });
        if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e?.error?.message||`HTTP ${res.status}`); }
        const data = await res.json();
        newEvents[src.id] = data.items||[];
      } catch(e:any) {
        newErrors[src.id] = e.message||"error";
        newEvents[src.id] = [];
      }
    }));
    setAllEvents(newEvents);
    setErrors(newErrors);
    setLoading(false);
  };

  useEffect(() => {
    let from:Date, to:Date;
    if (view==="daily") {
      from=new Date(selDate); from.setHours(0,0,0,0);
      to  =new Date(selDate); to.setHours(23,59,59,999);
    } else {
      from=new Date(wMon); from.setHours(0,0,0,0);
      to  =new Date(wSun); to.setHours(23,59,59,999);
    }
    fetchAll(from, to);
    const t = setInterval(()=>fetchAll(from,to), 30000);
    return ()=>clearInterval(t);
  }, [view, selDate.toDateString(), weekBase.toDateString()]);

  const sameDay2 = (a:Date,b:Date) => a.getDate()===b.getDate()&&a.getMonth()===b.getMonth()&&a.getFullYear()===b.getFullYear();
  const getEvTime = (ev:any) => { if(ev.start?.dateTime) return new Date(ev.start.dateTime); if(ev.start?.date) return new Date(ev.start.date+"T00:00:00"); return new Date(); };
  const fmtTime = (ev:any) => {
    if (!ev.start?.dateTime) return "ทั้งวัน";
    const s=new Date(ev.start.dateTime), e=new Date(ev.end.dateTime);
    return `${String(s.getHours()).padStart(2,"0")}:${String(s.getMinutes()).padStart(2,"0")} – ${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`;
  };

  // รวม events จากทุก calendar ที่ enable
  const getMergedEvents = (filterFn:(ev:any,d:Date)=>boolean, d:Date) => {
    const merged: Array<any&{_calColor:string,_calName:string}> = [];
    GCAL_SOURCES.forEach(src => {
      if (!enabled[src.id]) return;
      (allEvents[src.id]||[]).filter(ev=>filterFn(ev,d)).forEach(ev=>{
        merged.push({...ev, _calColor:src.color, _calName:src.name});
      });
    });
    return merged.sort((a,b)=>getEvTime(a).getTime()-getEvTime(b).getTime());
  };

  const DAY_COLORS2:Record<number,string> = {0:"#ef4444",1:"#eab308",2:"#ec4899",3:"#22c55e",4:"#f97316",5:"#38bdf8",6:"#7c3aed"};
  const weekDays = Array.from({length:7},(_,i)=>{ const d=new Date(wMon); d.setDate(wMon.getDate()+i); return d; });

  const EventCard = ({ev}:{ev:any}) => (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderLeft:`4px solid ${ev._calColor||"#3b82f6"}`,borderRadius:8,padding:"12px 18px",marginBottom:10,boxShadow:"0 1px 4px #0001"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{fontSize:14,color:"#6366f1",fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap",background:"#eef2ff",borderRadius:5,padding:"2px 9px",flexShrink:0}}>{fmtTime(ev)}</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{ev.summary||"(ไม่มีชื่อ)"}</div>
          {ev.description&&<div style={{fontSize:14,color:"var(--text-secondary)",marginTop:3,whiteSpace:"pre-wrap"}}>{ev.description}</div>}
          {ev.location&&<div style={{fontSize:14,color:"#94a3b8",marginTop:2}}>📍 {ev.location}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#312e81,#1e1b4b)",borderRadius:"10px 10px 0 0",padding:"18px 25px",display:"flex",alignItems:"center",gap:15,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:1}}>📅 ตารางปฏิบัติ</div>
          <div style={{fontSize:14,color:"#a5b4fc",marginTop:3,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            {GCAL_SOURCES.map(s=>(
              <span key={s.id} style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:s.color,display:"inline-block"}}/>
                {s.name}
              </span>
            ))}
            <span style={{color:"var(--text-secondary)"}}>·</span>
            <span>refresh ทุก 30 วิ</span>
            {loading&&<span style={{color:"#fbbf24"}}>⟳ กำลังโหลด...</span>}
            {!loading&&<span style={{color:"#86efac"}}>● อัปเดตแล้ว</span>}
          </div>
        </div>
        <div style={{display:"flex",background:"rgba(0,0,0,0.3)",borderRadius:10,padding:3,gap:2}}>
          {(["daily","weekly"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:15,
                background:view===v?"#6366f1":"transparent",color:view===v?"#fff":"#a5b4fc"}}>
              {v==="daily"?"📋 รายวัน":"📅 รายสัปดาห์"}
            </button>
          ))}
        </div>
      </div>

      {/* Date controls */}
      <div style={{background:"#f1f5f9",padding:"10px 20px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e2e8f0",flexWrap:"wrap"}}>
        {view==="daily"&&<>
          <span style={{fontSize:15,fontWeight:700,color:"#374151"}}>วันที่:</span>
          <div style={{width:138}}><DatePicker value={fmtShort(selDate)} onChange={v=>{const p=v.split(" ");if(p.length>=2){const d=parseInt(p[0]);const m=MONTH_EN.findIndex(x=>x.toLowerCase()===p[1].toLowerCase());if(!isNaN(d)&&m>=0)setSelDate(new Date(new Date().getFullYear(),m,d));}}} dark={false}/></div>
          <button onClick={()=>{const d=new Date(selDate);d.setDate(d.getDate()-1);setSelDate(d);}} style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>‹</button>
          <button onClick={()=>{const d=new Date(selDate);d.setDate(d.getDate()+1);setSelDate(d);}} style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>›</button>
          <button onClick={()=>setSelDate(new Date())} style={{fontSize:14,padding:"3px 12px",borderRadius:6,border:"1px solid #6366f1",background:"transparent",color:"#6366f1",cursor:"pointer",fontWeight:700}}>วันนี้</button>
          <span style={{fontSize:15,fontWeight:700,color:"#6366f1"}}>{fmtD(selDate)}</span>
        </>}
        {view==="weekly"&&<>
          <button onClick={()=>{const d=new Date(weekBase);d.setDate(d.getDate()-7);setWeekBase(d);}} style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>‹</button>
          <span style={{fontSize:15,fontWeight:700,color:"#1e293b",padding:"3px 12px",background:"#fff",borderRadius:8,border:"1px solid #cbd5e1"}}>{fmtShort(wMon)} – {fmtShort(wSun)}</span>
          <button onClick={()=>{const d=new Date(weekBase);d.setDate(d.getDate()+7);setWeekBase(d);}} style={{fontSize:16,padding:"3px 10px",borderRadius:6,border:"1px solid #cbd5e1",background:"#fff",color:"#374151",cursor:"pointer"}}>›</button>
          <button onClick={()=>setWeekBase(new Date())} style={{fontSize:14,padding:"3px 12px",borderRadius:6,border:"1px solid #6366f1",background:"transparent",color:"#6366f1",cursor:"pointer",fontWeight:700}}>สัปดาห์นี้</button>
        </>}
      </div>

      {/* Daily view */}
      {view==="daily"&&(
        <div style={{background:"#fff",borderRadius:"0 0 10px 10px",border:"1px solid #e2e8f0",padding:"20px"}}>
          <div style={{fontWeight:800,fontSize:18,color:"#312e81",marginBottom:15}}>
            {sameDay2(selDate,today)&&<span style={{background:"#6366f1",color:"#fff",fontSize:12,borderRadius:5,padding:"2px 9px",marginRight:10,fontWeight:700}}>TODAY</span>}
            {fmtD(selDate)}
          </div>
          {loading?<div style={{textAlign:"center",color:"#94a3b8",padding:"40px"}}>⟳ กำลังโหลด...</div>
          :(()=>{ const evs=getMergedEvents((ev,d)=>sameDay2(getEvTime(ev),selDate),selDate);
            return evs.length===0?<div style={{textAlign:"center",color:"#94a3b8",padding:"40px",fontSize:16}}>ไม่มีกิจกรรมในวันนี้</div>
            :evs.map((ev,i)=><EventCard key={i} ev={ev}/>);
          })()}
        </div>
      )}

      {/* Weekly view */}
      {view==="weekly"&&(
        <div style={{background:"#fff",borderRadius:"0 0 10px 10px",border:"1px solid #e2e8f0",overflow:"hidden"}}>
          {loading&&<div style={{textAlign:"center",color:"#94a3b8",padding:"30px"}}>⟳ กำลังโหลด...</div>}
          {!loading&&weekDays.map((wd,wi)=>{
            const dow=wd.getDay();
            const isToday2=sameDay2(wd,today);
            const hdrBg=DAY_COLORS2[dow];
            const rowBg=dow===0?"#fff5f5":dow===6?"#f9f7ff":isToday2?"#f0f7ff":"#fff";
            const dayEvs=getMergedEvents((ev)=>sameDay2(getEvTime(ev),wd),wd);
            return (
              <div key={wi} style={{borderBottom:wi<6?"1px solid #e2e8f0":"none",background:rowBg}}>
                <div style={{padding:"10px 20px",background:hdrBg,display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontWeight:800,fontSize:16,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>{DAY_EN_SHORT[dow]}</span>
                  <span style={{fontSize:15,color:"rgba(255,255,255,0.9)",fontWeight:600}}>{fmtShort(wd)}</span>
                  {isToday2&&<span style={{fontSize:12,background:"rgba(0,0,0,0.25)",color:"#fff",borderRadius:5,padding:"1px 8px",fontWeight:700}}>TODAY</span>}
                  <span style={{marginLeft:"auto",fontSize:14,color:"rgba(255,255,255,0.7)"}}>{dayEvs.length>0?`${dayEvs.length} กิจกรรม`:""}</span>
                </div>
                <div style={{padding:dayEvs.length?"12px 20px 5px":"8px 20px 10px"}}>
                  {dayEvs.length===0?<span style={{fontSize:14,color:"#cbd5e1"}}>— ไม่มีกิจกรรม</span>
                  :dayEvs.map((ev,i)=><EventCard key={i} ev={ev}/>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Safety Tab ────────────────────────────────────────────────────────────────
// ── Safety Announcement Popup ────────────────────────────────────────────────
function SafetyPopup({announcements, onClose}:{announcements:any[], onClose:()=>void}) {
  const [canAck, setCanAck] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    setTimeout(()=>{
      const el = bodyRef.current;
      if (!el) return;
      if (el.scrollHeight <= el.clientHeight + 10) setCanAck(true);
    }, 400);
  }, []);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) setCanAck(true);
  };

  if (!announcements.length) return null;

  return (
    <div style={{position:"fixed",inset:0,zIndex:9990,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.75)"}}>
      <div style={{background:"#0f172a",border:"2px solid #dc2626",borderRadius:20,maxWidth:700,width:"95%",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>

        {/* Header */}
        <div style={{background:"linear-gradient(90deg,#7f1d1d,#dc2626)",padding:"18px 25px",display:"flex",alignItems:"center",gap:12,borderRadius:"14px 14px 0 0",flexShrink:0}}>
          <span style={{fontSize:25}}>🛡️</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:16,color:"#fff",letterSpacing:1}}>FLIGHT SAFETY</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>ประชาสัมพันธ์ด้านนิรภัยการบิน</div>
          </div>
          <span style={{fontSize:14,color:"rgba(255,255,255,0.6)"}}>{announcements.length} รายการ</span>
        </div>

        {/* Scrollable content — แสดงทุก announcement ต่อเนื่องกัน */}
        <div ref={bodyRef} onScroll={handleScroll}
          style={{flex:1,overflowY:"auto",padding:"0"}}>
          {announcements.map((a,i)=>(
            <div key={i} style={{padding:"30px 30px 25px",borderBottom:i<announcements.length-1?"1px solid #1e293b":"none"}}>
              {a.imageUrl&&(
                <img src={a.imageUrl} alt="announcement"
                  style={{width:"100%",borderRadius:10,marginBottom:20,objectFit:"contain",display:"block"}}
                  onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              )}
              <div style={{fontSize:20,fontWeight:800,color:"#f87171",marginBottom:10}}>{a.title}</div>
              <div style={{fontSize:16,color:"#cbd5e1",lineHeight:2,textAlign:"justify"}}>
                {a.body?.split(/\n+/).filter(Boolean).map((para,pi)=>(
                  <p key={pi} style={{margin:"0 0 8px 0"}}>{para}</p>
                ))}
              </div>
              {a.date&&<div style={{fontSize:14,color:"var(--text-secondary)",marginTop:15}}>📅 {a.date}</div>}
            </div>
          ))}
          <div style={{height:10}}/>
        </div>

        {/* Scroll hint */}
        {!canAck&&(
          <div style={{textAlign:"center",padding:"8px",fontSize:14,color:"#f59e0b",background:"rgba(245,158,11,0.08)",borderTop:"1px solid rgba(245,158,11,0.15)",flexShrink:0}}>
            ↓ เลื่อนอ่านจนครบก่อนกดรับทราบ
          </div>
        )}

        {/* Footer */}
        <div style={{padding:"15px 30px 25px",display:"flex",justifyContent:"flex-end",flexShrink:0,borderTop:"1px solid #1e293b"}}>
          <button onClick={()=>{ if(canAck) onClose(); }} disabled={!canAck}
            style={{padding:"10px 30px",borderRadius:8,border:"none",fontSize:16,fontWeight:700,
              background:canAck?"#dc2626":"#334155",
              color:canAck?"#fff":"var(--text-secondary)",
              cursor:canAck?"pointer":"not-allowed"}}>
            {canAck?"✓ รับทราบ":"↓ เลื่อนอ่านก่อน"}
          </button>
        </div>
      </div>
    </div>
  );
}

const RISK_FORM_URL = "https://forms.gle/mYU11RECfb8K1Mpf7";
const HAZARD_LINK_URL = "";

function SafetyTab({prefill=null, onClearPrefill=null}:{prefill?:any, onClearPrefill?:()=>void}) {
  const [view, setView] = useState<"menu"|"risk"|"hazard"|"announcements">("menu");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annLoaded, setAnnLoaded] = useState(false);
  const [annSyncing, setAnnSyncing] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annForm, setAnnForm] = useState({title:"",body:"",date:"",imageUrl:""});
  const [editAnnIdx, setEditAnnIdx] = useState<number|null>(null);
  const [annToast, setAnnToast] = useState("");

  const showAnnToast = (msg) => { setAnnToast(msg); setTimeout(()=>setAnnToast(""),2500); };

  // โหลด announcements จาก Sheet
  useEffect(()=>{
    loadFromSheet("SAFETY ANNOUNCEMENTS").then(rows=>{
      if(rows.length>1){
        const [,...data]=rows;
        setAnnouncements(data.map(r=>({title:r[0]||"",body:r[1]||"",date:r[2]||"",imageUrl:parseDriveUrl(r[3]||"")})));
      }
      setAnnLoaded(true);
    }).catch(()=>setAnnLoaded(true));
  },[]);

  const saveAnnouncements = (list) => {
    setAnnSyncing(true);
    const rows=[["title","body","date","imageUrl"],...list.map(a=>[a.title,a.body,a.date,a.imageUrl||""])];
    saveToSheet("SAFETY ANNOUNCEMENTS",rows).finally(()=>setAnnSyncing(false));
  };

  const submitAnn = () => {
    if(!annForm.title) return showAnnToast("⚠️ กรุณากรอกหัวข้อ");
    let updated;
    if(editAnnIdx!==null){
      updated = announcements.map((a,i)=>i===editAnnIdx?annForm:a);
    } else {
      updated = [annForm,...announcements];
    }
    setAnnouncements(updated);
    saveAnnouncements(updated);
    setAnnForm({title:"",body:"",date:"",imageUrl:""});
    setShowAnnForm(false);
    setEditAnnIdx(null);
    showAnnToast("✓ บันทึกประชาสัมพันธ์แล้ว");
  };

  const deleteAnn = (i) => {
    const updated = announcements.filter((_,idx)=>idx!==i);
    setAnnouncements(updated);
    saveAnnouncements(updated);
    showAnnToast("ลบประชาสัมพันธ์แล้ว");
  };

  const aInp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:6,padding:"8px 12px",fontSize:15,width:"100%",boxSizing:"border-box" as any};

  // รับข้อมูล prefill จากตารางบิน
  useEffect(()=>{
    if (!prefill) return;
    const f = prefill.data;
    if (prefill.type==="hazard") {
      setHazardForm({
        date: f.date||"", time: f.takeoff||"", reporter:"",
        acType: f.acTypeF||"S-92A", ac: f.ac||"",
        callsign: f.cs||"", pilot: f.pilot||"",
        coPilot: f.coPilot||"", event:""
      });
      setShowHazardForm(true);
      setView("hazard");
    } else {
      setView("risk");
    }
    if (onClearPrefill) onClearPrefill();
  }, [prefill]);
  const [hazardReports, setHazardReports] = useState<any[]>([]);
  const [hazardLoaded, setHazardLoaded] = useState(false);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [hazardSyncing, setHazardSyncing] = useState(false);

  const EMPTY_HAZARD = {
    date:"", time:"", reporter:"", acType:"S-92A", ac:"", callsign:"",
    pilot:"", coPilot:"", event:""
  };
  const [hazardForm, setHazardForm] = useState(EMPTY_HAZARD);
  const [hazardPilots, setHazardPilots] = useState<any[]>([]);

  // โหลด hazard reports + pilots
  useEffect(()=>{
    loadFromSheet("HAZARD REPORT").then(rows=>{
      if(rows.length>1){
        const [,  ...data]=rows;
        setHazardReports(data.map(r=>({date:r[0]||"",time:r[1]||"",reporter:r[2]||"",acType:r[3]||"",ac:r[4]||"",callsign:r[5]||"",pilot:r[6]||"",coPilot:r[7]||"",event:r[8]||""})));
      }
      setHazardLoaded(true);
    }).catch(()=>setHazardLoaded(true));
    Promise.all([loadFromSheet("PILOTS S-92A"),loadFromSheet("PILOTS S-70i")]).then(([a,b])=>{
      const parse=(rows)=>rows.length>1?rows.slice(1).map(r=>({name:r[1]||"",callsign:r[3]||"",initial:r[2]||""})):[];
      setHazardPilots([...parse(a),...parse(b)]);
    });
  },[]);

  const submitHazard = () => {
    if(!hazardForm.event) return showToast("⚠️ กรุณากรอกรายละเอียดเหตุการณ์");
    const newReport = {...hazardForm, id: Date.now()};
    const updated = [newReport, ...hazardReports];
    setHazardReports(updated);
    setHazardSyncing(true);
    const rows = [
      ["date","time","reporter","acType","ac","callsign","pilot","coPilot","event"],
      ...updated.map(r=>[r.date,r.time,r.reporter,r.acType,r.ac,r.callsign,r.pilot,r.coPilot,r.event])
    ];
    saveToSheet("HAZARD REPORT", rows).finally(()=>setHazardSyncing(false));
    setHazardForm(EMPTY_HAZARD);
    setShowHazardForm(false);
    showToast("✓ บันทึก Hazard Report แล้ว");
  };

  const SEVERITY_COLORS = {HIGH:"#dc2626",MEDIUM:"#f97316",LOW:"#eab308"};
  const hInp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:6,padding:"8px 12px",fontSize:15,width:"100%",boxSizing:"border-box" as any};
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2500); };

  const tabBtn = (id,label,color) => (
    <button onClick={()=>setView(id as any)}
      style={{padding:"9px 22px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:15,
        background:view===id?color:"transparent",color:view===id?"#fff":"#a8a29e"}}>
      {label}
    </button>
  );

  return (
    <div>
      {toast&&<div style={{position:"fixed",top:20,right:24,zIndex:999,background:"#f97316",color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16,boxShadow:"0 4px 12px #0004"}}>{toast}</div>}

      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#1c1917,#292524)",borderRadius:"10px 10px 0 0",padding:"18px 25px",display:"flex",alignItems:"center",gap:15,flexWrap:"wrap"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:25,fontWeight:900,color:"#fff",letterSpacing:2}}>🛡️ SAFETY</div>
          <div style={{fontSize:14,color:"#a8a29e",marginTop:2}}>ระบบความปลอดภัยในการบิน · Flight Safety Management</div>
        </div>
        {view!=="menu"&&(
          <button onClick={()=>setView("menu")}
            style={{fontSize:14,padding:"6px 18px",borderRadius:8,border:"1px solid #44403c",background:"transparent",color:"#a8a29e",cursor:"pointer"}}>
            ← กลับ
          </button>
        )}
        {/* Tab toggles */}
        <div style={{display:"flex",background:"rgba(0,0,0,0.3)",borderRadius:10,padding:3,gap:2}}>
          {tabBtn("menu","🏠 หน้าหลัก","#78716c")}
          {tabBtn("risk","⚠️ Risk Management","#c2410c")}
          {tabBtn("hazard","🚨 Hazard Report","#b91c1c")}
          {tabBtn("announcements","📢 ประชาสัมพันธ์","#7c3aed")}
        </div>
      </div>

      {/* Menu view */}
      {view==="menu"&&(
        <div style={{background:"#1c1917",padding:"40px 30px",borderRadius:"0 0 10px 10px",display:"flex",gap:25,flexWrap:"wrap",justifyContent:"center"}}>
          {/* Risk Management Card */}
          <div onClick={()=>setView("risk")}
            style={{flex:"1 1 280px",maxWidth:400,background:"linear-gradient(135deg,#7c2d12,#c2410c)",borderRadius:18,
              padding:"40px 35px",cursor:"pointer",textAlign:"center",transition:"transform 0.2s",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
            <div style={{fontSize:65,marginBottom:15}}>⚠️</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:2,marginBottom:8}}>RISK MANAGEMENT</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.7)",marginBottom:20}}>การบริหารความเสี่ยง</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.55)",lineHeight:2,marginBottom:25}}>ประเมินและบริหารจัดการความเสี่ยงในการปฏิบัติภารกิจ ข้อมูลจะถูกบันทึกลง Google Sheets อัตโนมัติ</div>
            <div style={{background:"rgba(255,255,255,0.9)",color:"#c2410c",fontWeight:900,fontSize:18,padding:"10px 0",borderRadius:10,letterSpacing:1}}>
              กรอกแบบประเมิน →
            </div>
          </div>

          {/* Hazard Report Card */}
          <div onClick={()=>setView("hazard")}
            style={{flex:"1 1 280px",maxWidth:400,background:"linear-gradient(135deg,#7f1d1d,#b91c1c)",borderRadius:18,
              padding:"40px 35px",cursor:"pointer",textAlign:"center",transition:"transform 0.2s",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
            <div style={{fontSize:65,marginBottom:15}}>🚨</div>
            <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:2,marginBottom:8}}>HAZARD REPORT</div>
            <div style={{fontSize:15,color:"rgba(255,255,255,0.7)",marginBottom:20}}>รายงานอันตราย</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.55)",lineHeight:2,marginBottom:25}}>รายงานสภาวะอันตรายหรือสิ่งที่อาจก่อให้เกิดอุบัติเหตุ เพื่อป้องกันและแก้ไขปัญหาล่วงหน้า</div>
            <div style={{background:hazardReports.length>0?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.85)",color:"#b91c1c",fontWeight:900,fontSize:18,padding:"10px 0",borderRadius:10,letterSpacing:1}}>
              {hazardReports.length>0?`ดูรายงาน (${hazardReports.length}) →`:"รายงานอันตราย →"}
            </div>
          </div>
        </div>
      )}

      {/* Risk Management — embed Google Form */}
      {view==="risk"&&(
        <div style={{background:"#f8fafc",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
          <div style={{background:"#fff7ed",padding:"12px 25px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #fed7aa"}}>
            <span style={{fontSize:15,color:"#c2410c",fontWeight:700}}>⚠️ RISK MANAGEMENT — แบบประเมินความเสี่ยง</span>
            <span style={{fontSize:14,color:"#9a3412",marginLeft:"auto"}}>ข้อมูลบันทึกลง Google Sheets อัตโนมัติ</span>
          </div>
          <iframe
            src="https://docs.google.com/forms/d/1-R_goVwhns5V9Pf3C8sDrDK6q_MZSx3zvnTVR-fuJss/viewform?embedded=true"
            style={{width:"100%",height:"75vh",border:"none"}}
            title="Risk Management Form"
          >
            กำลังโหลด...
          </iframe>
        </div>
      )}

      {/* Hazard Report */}
      {view==="hazard"&&(
        <div style={{background:"#0f172a",borderRadius:"0 0 10px 10px",padding:"20px"}}>
          {hazardSyncing&&<div style={{textAlign:"center",fontSize:14,color:"#86efac",marginBottom:10}}>⟳ กำลังบันทึก...</div>}

          {/* Form */}
          {showHazardForm&&(
            <div style={{background:"#1e293b",border:"1px solid #7f1d1d",borderRadius:12,padding:18,marginBottom:20}}>
              <div style={{fontWeight:800,fontSize:18,color:"#fca5a5",marginBottom:18}}>🚨 รายงานอันตราย (Hazard Report)</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:15}}>

                {/* วันที่ */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>วันที่</div>
                  <DatePicker value={hazardForm.date} onChange={v=>setHazardForm(p=>({...p,date:v}))} dark={true}/>
                </div>

                {/* เวลา */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>เวลา (HH:MM)</div>
                  <input value={hazardForm.time} onChange={e=>setHazardForm(p=>({...p,time:e.target.value}))} style={hInp} placeholder="เช่น 10:30"/>
                </div>

                {/* ผู้รายงาน */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>ผู้รายงาน</div>
                  <input value={hazardForm.reporter} onChange={e=>setHazardForm(p=>({...p,reporter:e.target.value}))} style={hInp} placeholder="ชื่อผู้รายงาน"/>
                </div>

                {/* แบบอากาศยาน */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>แบบอากาศยาน</div>
                  <select value={hazardForm.acType} onChange={e=>setHazardForm(p=>({...p,acType:e.target.value,ac:"",callsign:""}))} style={hInp}>
                    <option value="S-92A">S-92A</option>
                    <option value="S-70i">S-70i</option>
                  </select>
                </div>

                {/* หมายเลขเครื่อง */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>หมายเลขเครื่อง</div>
                  <select value={hazardForm.ac} onChange={e=>{
                    const opts = getCallsignOptions(e.target.value);
                    setHazardForm(p=>({...p,ac:e.target.value,callsign:opts[0]||""}));
                  }} style={hInp}>
                    <option value="">— เลือก —</option>
                    {(AC_NUMBERS[hazardForm.acType]||[]).map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* Callsign */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Callsign</div>
                  <CallsignComboBox value={hazardForm.callsign} onChange={v=>setHazardForm(p=>({...p,callsign:v}))} ac={hazardForm.ac} dark={true} inp={hInp}/>
                </div>

                {/* Pilot */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Pilot</div>
                  <PilotComboBox value={hazardForm.pilot} onChange={v=>setHazardForm(p=>({...p,pilot:v}))} pilots={hazardPilots} placeholder="Callsign / ชื่อ..." dark={true}/>
                </div>

                {/* Co-Pilot */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>Co-Pilot</div>
                  <PilotComboBox value={hazardForm.coPilot} onChange={v=>setHazardForm(p=>({...p,coPilot:v}))} pilots={hazardPilots} placeholder="Callsign / ชื่อ..." dark={true}/>
                </div>

                {/* เหตุการณ์ */}
                <div style={{gridColumn:"1/-1"}}>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>รายละเอียดเหตุการณ์ / อันตรายที่พบ</div>
                  <textarea value={hazardForm.event} onChange={e=>setHazardForm(p=>({...p,event:e.target.value}))}
                    rows={3} placeholder="อธิบายเหตุการณ์หรืออันตรายที่พบโดยละเอียด..."
                    style={{...hInp,resize:"vertical"}}/>
                </div>
              </div>

              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button onClick={()=>{setShowHazardForm(false);setHazardForm(EMPTY_HAZARD);}}
                  style={{padding:"8px 20px",fontSize:15,borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
                <button onClick={submitHazard}
                  style={{padding:"8px 22px",fontSize:15,borderRadius:8,border:"none",background:"#b91c1c",color:"#fff",cursor:"pointer",fontWeight:700}}>🚨 ส่งรายงาน</button>
              </div>
            </div>
          )}

          {/* Header + New button */}
          <div style={{display:"flex",alignItems:"center",gap:15,marginBottom:15}}>
            <span style={{fontWeight:800,fontSize:18,color:"#fca5a5"}}>🚨 รายการรายงานอันตราย</span>
            <span style={{fontSize:14,color:"var(--text-secondary)"}}>{hazardReports.length} รายการ</span>
            <button onClick={()=>setShowHazardForm(true)}
              style={{marginLeft:"auto",background:"#b91c1c",border:"none",color:"#fff",borderRadius:9,padding:"9px 20px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              + รายงานอันตรายใหม่
            </button>
          </div>

          {/* Report list */}
          {!hazardLoaded&&<div style={{textAlign:"center",color:"var(--text-secondary)",padding:"40px"}}>⟳ กำลังโหลด...</div>}
          {hazardLoaded&&hazardReports.length===0&&(
            <div style={{textAlign:"center",color:"var(--text-secondary)",padding:"50px",background:"#1e293b",borderRadius:12,fontSize:16}}>
              ยังไม่มีรายงานอันตราย<br/><span style={{fontSize:14}}>กด "+ รายงานอันตรายใหม่" เพื่อเริ่มต้น</span>
            </div>
          )}
          {hazardReports.map((r,i)=>(
            <div key={i} style={{background:"#1e293b",border:"1px solid #334155",borderLeft:"4px solid #ef4444",borderRadius:10,padding:"15px 20px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontSize:15,color:"#94a3b8",fontFamily:"monospace"}}>{r.date} {r.time}</span>
                <span style={{fontSize:15,color:"#e2e8f0",fontWeight:600}}>{r.reporter}</span>
                <span style={{marginLeft:"auto",fontSize:14,color:"#38bdf8",fontFamily:"monospace"}}>{r.acType} {r.ac} {r.callsign}</span>
              </div>
              <div style={{fontSize:15,color:"#cbd5e1",marginBottom:5}}>{r.event}</div>
              <div style={{fontSize:14,color:"var(--text-secondary)"}}>
                {r.pilot&&`Pilot: ${r.pilot}`}{r.coPilot&&` · Co-Pilot: ${r.coPilot}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Announcements Management */}
      {view==="announcements"&&(
        <div style={{background:"#0f172a",borderRadius:"0 0 10px 10px",padding:"20px"}}>
          {annToast&&<div style={{position:"fixed",top:20,right:24,zIndex:999,background:"#7c3aed",color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16}}>{annToast}</div>}
          {annSyncing&&<div style={{textAlign:"center",fontSize:14,color:"#86efac",marginBottom:10}}>⟳ กำลังบันทึก...</div>}

          {/* Form เพิ่ม/แก้ไขประชาสัมพันธ์ */}
          {showAnnForm&&(
            <div style={{background:"#1e293b",border:"1px solid #7c3aed",borderRadius:12,padding:18,marginBottom:20}}>
              <div style={{fontWeight:800,fontSize:18,color:"#c4b5fd",marginBottom:18}}>📢 {editAnnIdx!==null?"แก้ไขประชาสัมพันธ์":"เพิ่มประชาสัมพันธ์"}</div>
              <div style={{display:"grid",gap:12,marginBottom:15}}>
                {/* แถวที่ 1: หัวข้อประชาสัมพันธ์ และ วันที่ ในบรรทัดเดียวกัน */}
                <div style={{display:"grid",gridTemplateColumns:"3fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>หัวข้อประชาสัมพันธ์ *</div>
                    <input value={annForm.title} onChange={e=>setAnnForm(p=>({...p,title:e.target.value}))} style={aInp} placeholder="เช่น แจ้งเตือนสภาพอากาศ"/>
                  </div>
                  <div>
                    <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>วันที่</div>
                    <DatePicker value={annForm.date} onChange={v=>setAnnForm(p=>({...p,date:v}))} dark={true}/>
                  </div>
                </div>

                {/* แถวที่ 2: รายละเอียด ขยายความสูง (เพิ่มจำนวนบรรทัด) */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>รายละเอียด</div>
                  <textarea value={annForm.body} onChange={e=>setAnnForm(p=>({...p,body:e.target.value}))}
                    rows={10} placeholder="รายละเอียด..." style={{...aInp,resize:"vertical"}}/>
                </div>

                {/* แถวที่ 3: รูปภาพ */}
                <div>
                  <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>รูปภาพ</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
                    <div style={{display:"flex",gap:10}}>
                      <input value={annForm.imageUrl}
                        onChange={e=>{
                          let url = e.target.value.trim();
                          let fileId = "";
                          const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                          const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                          if (m1) fileId = m1[1];
                          else if (m2) fileId = m2[1];
                          if (fileId) {
                            url = `https://lh3.googleusercontent.com/d/${fileId}`;
                          }
                          setAnnForm(p=>({...p,imageUrl:url}));
                        }}
                        style={{...aInp,flex:1}} placeholder="วาง Google Drive link หรือ URL รูปภาพ..."/>
                      {annForm.imageUrl&&(
                        <button onClick={()=>setAnnForm(p=>({...p,imageUrl:""}))}
                          style={{padding:"6px 12px",borderRadius:8,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer",fontSize:14,flexShrink:0}}>
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,color:"#94a3b8"}}>หรืออัปโหลดรูปภาพโดยตรง:</span>
                      <input type="file" accept="image/*"
                        onChange={e=>{
                          const file = e.target.files?.[0];
                          if (file) {
                            const r = new FileReader();
                            r.onloadend = () => {
                              setAnnForm(p=>({...p,imageUrl:r.result as string}));
                            };
                            r.readAsDataURL(file);
                          }
                        }}
                        style={{fontSize:13,color:"#cbd5e1"}}/>
                    </div>
                  </div>
                  {annForm.imageUrl&&(
                    <img src={annForm.imageUrl} alt="preview"
                      style={{maxWidth:"100%",maxHeight:250,borderRadius:10,border:"1px solid #334155",objectFit:"contain",display:"block",marginTop:10}}
                      onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                  )}
                  <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:5}}>
                    💡 วิธีที่ 1: อัปโหลดรูปตรงจากเครื่องคอมพิวเตอร์ของคุณ (แนะนำ)<br/>
                    💡 วิธีที่ 2: วาง Google Drive link ที่ตั้งค่าแชร์เป็น "ทุกคนที่มีลิงก์"
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button onClick={()=>{setShowAnnForm(false);setAnnForm({title:"",body:"",date:"",imageUrl:""});setEditAnnIdx(null);}}
                  style={{padding:"8px 20px",fontSize:15,borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
                <button onClick={submitAnn}
                  style={{padding:"8px 22px",fontSize:15,borderRadius:8,border:"none",background:"#7c3aed",color:"#fff",cursor:"pointer",fontWeight:700}}>📢 บันทึก</button>
              </div>
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",gap:15,marginBottom:15}}>
            <span style={{fontWeight:800,fontSize:18,color:"#c4b5fd"}}>📢 ประชาสัมพันธ์ด้านนิรภัย</span>
            <span style={{fontSize:14,color:"var(--text-secondary)"}}>{announcements.length} รายการ</span>
            <button onClick={()=>{setAnnForm({title:"",body:"",date:"",imageUrl:""});setEditAnnIdx(null);setShowAnnForm(true);}}
              style={{marginLeft:"auto",background:"#7c3aed",border:"none",color:"#fff",borderRadius:9,padding:"9px 20px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              + เพิ่มประชาสัมพันธ์
            </button>
          </div>

          {!annLoaded&&<div style={{textAlign:"center",color:"var(--text-secondary)",padding:"40px"}}>⟳ กำลังโหลด...</div>}
          {annLoaded&&announcements.length===0&&(
            <div style={{textAlign:"center",color:"var(--text-secondary)",padding:"50px",background:"#1e293b",borderRadius:12,fontSize:16}}>
              ยังไม่มีข้อมูลประชาสัมพันธ์ · กด "+ เพิ่มประชาสัมพันธ์" เพื่อเพิ่ม
            </div>
          )}
          {announcements.map((a,i)=>(
            <div key={i} style={{background:"#1e293b",border:"1px solid #4c1d95",borderLeft:"4px solid #7c3aed",borderRadius:10,padding:"15px 20px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:15}}>
              {a.imageUrl && (
                <img src={a.imageUrl} alt="announcement"
                  style={{width:100,maxHeight:100,borderRadius:8,objectFit:"cover",flexShrink:0,border:"1px solid #334155"}}
                  onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
              )}
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:16,color:"#c4b5fd",marginBottom:5}}>{a.title}</div>
                <div style={{fontSize:15,color:"#94a3b8",lineHeight:2}}>{a.body}</div>
                {a.date&&<div style={{fontSize:12,color:"var(--text-secondary)",marginTop:8}}>📅 {a.date}</div>}
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <button onClick={()=>{setAnnForm({...a});setEditAnnIdx(i);setShowAnnForm(true);}}
                  style={{padding:"3px 10px",fontSize:14,borderRadius:5,border:"1px solid #6d28d9",background:"transparent",color:"#a78bfa",cursor:"pointer"}}>✏️</button>
                <button onClick={()=>deleteAnn(i)}
                  style={{padding:"3px 10px",fontSize:14,borderRadius:5,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────────
// ── บันทึก/สั่งการ Tab ────────────────────────────────────────────────────────
function OrderTab() {
  const [records, setRecords]   = useState<any[]>([]);
  const [loaded,  setLoaded]    = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [showForm,setShowForm]  = useState(false);
  const [toast,   setToast]     = useState("");
  const EMPTY = {date:"", items:[""]};
  const [form,    setForm]       = useState<{date:string,items:string[]}>(EMPTY);
  const [editIdx, setEditIdx]   = useState<number|null>(null);

  const showT = (m,c="#22c55e")=>{setToast(m);setTimeout(()=>setToast(""),2500);};
  const inp = {background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0",borderRadius:6,padding:"8px 12px",fontSize:15,width:"100%",boxSizing:"border-box" as any};

  useEffect(()=>{
    loadFromSheet("ORDERS").then(rows=>{
      if(rows.length>1){
        const [,...data]=rows;
        // แต่ละแถว: date, item1, item2, item3...
        const grouped:{[key:string]:{date:string,items:string[]}} = {};
        data.forEach(r=>{
          const date=r[0]||"";
          const items=r.slice(1).filter(Boolean);
          if(!grouped[date]) grouped[date]={date,items:[]};
          grouped[date].items.push(...items);
        });
        // หรือถ้า save แบบใหม่ (date + JSON items)
        const recs = data.map(r=>({
          date:r[0]||"",
          items: (() => { try { return JSON.parse(r[1]||"[]"); } catch { return r.slice(1).filter(Boolean); } })()
        }));
        setRecords(recs);
      }
      setLoaded(true);
    }).catch(()=>setLoaded(true));
  },[]);

  const saveOrdersToSheet = (updatedRecords) => {
    setSyncing(true);
    const rows=[["date","items"],...updatedRecords.map(r=>[r.date, JSON.stringify(r.items)])];
    saveToSheet("ORDERS",rows).finally(()=>setSyncing(false));
  };

  const addItem = () => setForm(p=>({...p, items:[...p.items, ""]}));
  const removeItem = (i) => setForm(p=>({...p, items:p.items.filter((_,idx)=>idx!==i)}));
  const setItem = (i,v) => setForm(p=>({...p, items:p.items.map((x,idx)=>idx===i?v:x)}));

  const deleteRecord = (i) => {
    const next = records.filter((_,idx)=>idx!==i);
    setRecords(next);
    saveOrdersToSheet(next);
    showT("ลบแล้ว","#ef4444");
  };

  const submit = ()=>{
    const cleanItems = form.items.filter(x=>x.trim());
    if(!cleanItems.length) return showT("⚠️ กรุณากรอกบันทึกอย่างน้อย 1 ข้อ","#ef4444");
    const newRec = {date:form.date, items:cleanItems};
    let next;
    if(editIdx!==null){
      next = records.map((r,i)=>i===editIdx?newRec:r);
      showT("แก้ไขสำเร็จ ✓");
    } else {
      next = [newRec,...records];
      showT("บันทึกสำเร็จ ✓");
    }
    setRecords(next);
    saveOrdersToSheet(next);
    setForm(EMPTY); setShowForm(false); setEditIdx(null);
  };

  return (
    <div>
      {toast&&<div style={{position:"fixed",top:20,right:24,zIndex:999,background:"#22c55e",color:"#fff",padding:"12px 25px",borderRadius:10,fontWeight:700,fontSize:16,boxShadow:"0 4px 12px #0004"}}>{toast}</div>}
      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#1e3a5f,#0f2040)",borderRadius:"10px 10px 0 0",padding:"18px 25px",display:"flex",alignItems:"center",gap:15}}>
        <div style={{flex:1}}>
          <div style={{fontSize:22,fontWeight:900,color:"#fff",letterSpacing:1}}>📋 บันทึก / สั่งการ</div>
          <div style={{fontSize:14,color:"#60a5fa",marginTop:2}}>
            {syncing?<span style={{color:"#86efac"}}>⟳ sync...</span>:<span style={{color:"#22c55e"}}>● Sheet</span>}
          </div>
        </div>
        <button onClick={()=>{setForm(EMPTY);setEditIdx(null);setShowForm(true);}}
          style={{background:"#1d4ed8",border:"none",color:"#fff",borderRadius:9,padding:"9px 20px",fontSize:16,fontWeight:700,cursor:"pointer"}}>
          ＋ บันทึกใหม่
        </button>
      </div>

      {/* Form */}
      {showForm&&(
        <div style={{background:"#0f2040",border:"1px solid #1d4ed8",padding:"22px"}}>
          <div style={{fontWeight:800,fontSize:18,color:"#60a5fa",marginBottom:18}}>
            📋 {editIdx!==null?"แก้ไขบันทึก":"บันทึกใหม่"}
          </div>

          {/* วันที่ */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:3}}>วันที่</div>
            <div style={{width:175}}>
              <DatePicker value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} dark={true}/>
            </div>
          </div>

          {/* รายการบันทึก */}
          <div style={{marginBottom:15}}>
            <div style={{fontSize:14,color:"var(--text-secondary)",marginBottom:8}}>บันทึก / สั่งการ</div>
            {form.items.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{color:"#38bdf8",fontSize:15,fontWeight:700,minWidth:25,paddingTop:10}}>{i+1}.</div>
                <textarea value={item} onChange={e=>setItem(i,e.target.value)}
                  rows={2} placeholder={`ข้อที่ ${i+1}...`}
                  style={{...inp,flex:1,resize:"vertical"}}/>
                {form.items.length>1&&(
                  <button onClick={()=>removeItem(i)}
                    style={{padding:"6px 10px",fontSize:14,borderRadius:6,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer",flexShrink:0,marginTop:5}}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button onClick={addItem}
              style={{padding:"6px 18px",fontSize:14,borderRadius:6,border:"1px dashed #334155",background:"transparent",color:"var(--text-secondary)",cursor:"pointer",marginTop:5}}>
              + เพิ่มข้อ
            </button>
          </div>

          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>{setShowForm(false);setForm(EMPTY);setEditIdx(null);}}
              style={{padding:"8px 20px",fontSize:15,borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer"}}>ยกเลิก</button>
            <button onClick={submit}
              style={{padding:"8px 22px",fontSize:15,borderRadius:8,border:"none",background:"#1d4ed8",color:"#fff",cursor:"pointer",fontWeight:700}}>📋 บันทึก</button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{background:"#fff",borderRadius:"0 0 10px 10px",border:"1px solid #e2e8f0",overflow:"hidden"}}>
        {!loaded&&<div style={{textAlign:"center",padding:"50px",color:"#94a3b8"}}>⟳ กำลังโหลด...</div>}
        {loaded&&records.length===0&&(
          <div style={{textAlign:"center",padding:"60px",color:"#94a3b8",fontSize:16}}>
            ยังไม่มีบันทึก · กด "+ บันทึกใหม่" เพื่อเริ่มต้น
          </div>
        )}
        {records.map((r,i)=>(
          <div key={i} style={{borderBottom:"1px solid #e2e8f0",padding:"18px 25px",background:i%2===0?"#fff":"#f9fafb"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:15}}>
              <div style={{flex:1}}>
                {r.date&&<div style={{fontSize:14,color:"var(--text-secondary)",fontFamily:"monospace",background:"#f1f5f9",padding:"2px 10px",borderRadius:5,display:"inline-block",marginBottom:10}}>📅 {r.date}</div>}
                <ol style={{margin:0,paddingLeft:25}}>
                  {(r.items||[]).map((item,j)=>(
                    <li key={j} style={{fontSize:16,color:"#1e293b",lineHeight:2,marginBottom:5}}>{item}</li>
                  ))}
                </ol>
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <button onClick={()=>{setForm({date:r.date,items:[...(r.items||[""])]});setEditIdx(i);setShowForm(true);}}
                  style={{padding:"5px 12px",fontSize:14,borderRadius:6,border:"1px solid #3b82f6",background:"transparent",color:"#3b82f6",cursor:"pointer"}}>✏️</button>
                <button onClick={()=>deleteRecord(i)}
                  style={{padding:"5px 12px",fontSize:14,borderRadius:6,border:"1px solid #ef4444",background:"transparent",color:"#ef4444",cursor:"pointer"}}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab,setTab]         = useState("dashboard");
  const [sideOpen,setSideOpen] = useState(false);
  const [safetyPrefill, setSafetyPrefill] = useState<any>(null);

  // Theme support
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else {
      root.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const openSafety = (type:"risk"|"hazard", data:any) => {
    setSafetyPrefill({type, data});
    setTab("safety");
    setSideOpen(false);
  };

  // Popup ประกาศนิรภัย
  const [showPopup, setShowPopup] = useState(false);
  const [popupAnn, setPopupAnn]   = useState<any[]>([]);
  useEffect(()=>{
    loadFromSheet("SAFETY ANNOUNCEMENTS").then(rows=>{
      if(rows.length>1){
        const [,...data]=rows;
        const list=data.map(r=>({title:r[0]||"",body:r[1]||"",date:r[2]||"",imageUrl:parseDriveUrl(r[3]||"")}));
        if(list.length>0){setPopupAnn(list);setShowPopup(true);}
      }
    }).catch(()=>{});
  },[]);

  const toggleFS = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen().catch(()=>{});
  };
  const [isFS, setIsFS] = useState(false);
  useEffect(()=>{
    const h=()=>setIsFS(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",h);
    return()=>document.removeEventListener("fullscreenchange",h);
  },[]);

  const TABS=[
    {id:"dashboard", l:"🏠 Dashboard"},
    {id:"notam",     l:"📡 NOTAM"},
    {id:"flight",    l:"✈️ FLIGHT SCHEDULE"},
    {id:"duty",      l:"📋 PILOT ON DUTY"},
    {id:"aircraft",  l:"🛩️ AIRCRAFT STATUS"},
    {id:"pilot",     l:"👨‍✈️ รายชื่อนักบิน"},
    {id:"calendar",  l:"📅 ตารางปฏิบัติ"},
    {id:"safety",    l:"🛡️ FLIGHT SAFETY"},
    {id:"order",     l:"📋 บันทึก/สั่งการ"},
  ];

  // Bottom Navigation สำหรับมือถือ
  const MOBILE_TABS = [
    {id:"dashboard", l:"🏠 Dashboard", icon:"🏠"},
    {id:"flight",    l:"✈️ ตารางบิน", icon:"✈️"},
    {id:"duty",      l:"📋 เวรบิน", icon:"📋"},
    {id:"aircraft",  l:"🛩️ เครื่องบิน", icon:"🛩️"},
    {id:"more",      l:"☰ เมนูอื่น", icon:"☰"}
  ];

  return (
    <div style={{background:"var(--bg-app)",minHeight:"100vh",width:"100%",fontFamily:"'Sarabun',sans-serif",color:"var(--text-primary)",overflowX:"hidden",paddingBottom:isMobile?"85px":"20px"}}>
      <div className="cyber-grid" />
      <div className="hologram-overlay" />

      {showPopup&&popupAnn.length>0&&(
        <SafetyPopup announcements={popupAnn} onClose={()=>setShowPopup(false)}/>
      )}

      {/* Sidebar overlay */}
      {sideOpen&&(
        <div onClick={()=>setSideOpen(false)}
          style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}/>
      )}

      {/* Sidebar */}
      <div className="glass-panel" style={{position:"fixed",top:0,left:sideOpen?0:-325,width:325,height:"100vh",zIndex:1001,
        transition:"left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",display:"flex",flexDirection:"column",
        paddingTop:"env(safe-area-inset-top)",borderRadius:"0 20px 20px 0"}}>
        <div className="app-sidebar-header" style={{
          padding:"22px 25px",
          borderBottom:"1px solid var(--border-panel)",display:"flex",alignItems:"center",gap:15}}>
          <div style={{width:45,height:45,background:"linear-gradient(135deg,var(--accent-color),var(--accent-secondary))",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",flexShrink:0,boxShadow:"0 4px 12px var(--glow-accent)"}}>✈</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:18,letterSpacing:1}}>201 SOMS</div>
            <div style={{fontSize:11,color:"var(--accent-color)",letterSpacing:1,fontWeight:700}}>SQUADRON OPS SYSTEM</div>
          </div>
          <button onClick={()=>setSideOpen(false)}
            style={{background:"transparent",border:"none",color:"var(--text-secondary)",fontSize:22,cursor:"pointer",padding:4,
              minWidth:40,minHeight:40,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 0"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setSideOpen(false);}}
              style={{width:"100%",padding:isMobile?"24px 25px":"16px 25px",textAlign:"left",background:tab===t.id?"var(--glow-accent)":"transparent",
                border:"none",cursor:"pointer",fontSize:isMobile?20:16,fontWeight:tab===t.id?700:400,
                color:tab===t.id?"var(--accent-color)":"var(--text-secondary)",
                borderLeft:tab===t.id?"4px solid var(--accent-color)":"4px solid transparent",
                transition:"all 0.2s"}}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{padding:"15px 25px",borderTop:"1px solid var(--border-panel)",fontSize:12,color:"var(--text-secondary)",textAlign:"center",fontWeight:500}}>
          201 SQDN · SQUADRON MANAGEMENT
        </div>
      </div>

      {/* Header */}
      <div className="glass-panel app-header" style={{borderBottom:"1px solid var(--border-panel)",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSideOpen(true)}
            style={{background:"var(--glow-accent)",border:"1px solid var(--border-panel)",color:"var(--text-secondary)",
              borderRadius:10,padding:"10px 15px",cursor:"pointer",fontSize:isMobile?24:18,lineHeight:1,flexShrink:0,
              minWidth:isMobile?50:45,minHeight:isMobile?50:45,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ☰
          </button>

          <div>
            <div style={{fontWeight:900,fontSize:18,letterSpacing:1}}>201 SOMS</div>
            <div style={{fontSize:12,color:"var(--accent-color)",letterSpacing:1,fontWeight:700}}>{TABS.find(t=>t.id===tab)?.l||""}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* ปุ่มสลับธีมแบบเลื่อนซ้ายขวา ☀️/🌙 */}
          <div onClick={toggleTheme} title="สลับโหมดสว่าง/มืด"
            style={{
              width: 72,
              height: 38,
              borderRadius: 19,
              background: theme === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.08)",
              border: "1px solid var(--border-panel)",
              position: "relative",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "0 4px",
              boxSizing: "border-box",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
              transition: "background-color 0.3s ease",
              flexShrink: 0
            }}>
            {/* ตัวอักษรบอกโหมดจางๆ ด้านหลัง */}
            <span style={{ fontSize: 13, opacity: theme === "light" ? 0.3 : 0.8, marginLeft: 6, userSelect: "none" }}>🌙</span>
            <span style={{ fontSize: 13, opacity: theme === "light" ? 0.8 : 0.3, marginLeft: "auto", marginRight: 6, userSelect: "none" }}>☀️</span>
            
            {/* ตัวปุ่มเลื่อนทรงกลมพร้อมไอคอน */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: theme === "light" 
                ? "linear-gradient(135deg, #f59e0b, #d97706)" 
                : "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              position: "absolute",
              top: 4,
              left: theme === "light" ? 38 : 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              boxShadow: theme === "light" ? "0 2px 8px rgba(245, 158, 11, 0.4)" : "0 2px 8px rgba(56, 189, 248, 0.4)",
              transition: "left 0.3s cubic-bezier(0.25, 1, 0.5, 1), background 0.3s ease, box-shadow 0.3s ease"
            }}>
              {theme === "light" ? "☀️" : "🌙"}
            </div>
          </div>
          {!isMobile&&<button onClick={toggleFS} title={isFS?"ออกจากเต็มจอ":"เต็มจอ"}
            style={{background:"var(--glow-accent)",border:"1px solid var(--border-panel)",color:"var(--accent-color)",
              borderRadius:10,padding:"8px 10px",fontSize:18,cursor:"pointer",
              minWidth:45,minHeight:45,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {isFS?"⊠":"⛶"}
          </button>}
          <Clock/>
        </div>
      </div>

      {/* Bottom Navigation Bar สำหรับมือถือ */}
      {isMobile&&(
        <div className="glass-panel" style={{position:"fixed",bottom:0,left:0,right:0,height:75,zIndex:999,
          borderTop:"1px solid var(--border-panel)",display:"grid",gridTemplateColumns:"repeat(5, 1fr)",
          paddingBottom:"env(safe-area-inset-bottom)",borderRadius:"20px 20px 0 0"}}>
          {MOBILE_TABS.map(t=>(
            <button key={t.id} onClick={()=>{
              if(t.id === "more") {
                setSideOpen(true);
              } else {
                setTab(t.id);
              }
            }}
              style={{background:"transparent",border:"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                color:tab===t.id && t.id!=="more"?"var(--accent-color)":"var(--text-secondary)",cursor:"pointer"}}>
              <span style={{fontSize:22,marginBottom:4}}>{t.icon}</span>
              <span style={{fontSize:11,fontWeight:700}}>{t.id === "more" ? "เมนูอื่น" : t.l.split(" ")[1]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content — full width, responsive padding */}
      <div style={{padding:"24px 5%",width:"100%",boxSizing:"border-box" as any,maxWidth:1400,margin:"0 auto"}}>
        {tab==="dashboard"&&<DashboardContent/>}
        {tab==="notam"    &&<NotamTab/>}
        {tab==="flight"   &&<FlightTab onOpenSafety={openSafety}/>}
        {tab==="duty"     &&<DutyTab/>}
        {tab==="aircraft" &&<AcTab/>}
        {tab==="pilot"    &&<PilotTab/>}
        {tab==="calendar" &&<CalendarTab/>}
        {tab==="safety"   &&<SafetyTab prefill={safetyPrefill} onClearPrefill={()=>setSafetyPrefill(null)}/>}
        {tab==="order"    &&<OrderTab/>}
        <div style={{textAlign:"center",color:"#1e3a5f",fontSize:12,marginTop:20,letterSpacing:1}}>
          201 SQUADRON MANAGEMENT SYSTEM · PROTOTYPE
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Content ──────────────────────────────────────────────────────────
function DashboardContent() {
  const [flights,   setFlights]  = useState<any[]>([]);
  const [listA,     setListA]    = useState(AIRCRAFT_A);
  const [listB,     setListB]    = useState(AIRCRAFT_B);
  const [monthly,   setMonthly]  = useState<any[]>([]);
  const [orders,    setOrders]   = useState<any[]>([]);
  const [hazards,   setHazards]  = useState<any[]>([]);
  const [safetyAnn, setSafetyAnn]= useState<any[]>([]);
  const [notams,    setNotams]   = useState<any[]>(Object.values(NOTAMS).flat());

  useEffect(()=>{
    const today=new Date();
    const todayStr=`${today.getDate()} ${MONTH_EN[today.getMonth()]}`;
    loadFromSheet("FLIGHT SCHEDULE").then(rows=>{
      if(rows.length>1){
        const [,...data]=rows;
        setFlights(data.map(r=>({date:r[1]||"",acTypeF:r[2]||"",mission:r[3]||"",ac:r[4]||"",cs:r[5]||"",pilot:r[6]||"",coPilot:r[7]||"",takeoff:r[8]||"",land:r[9]||"",route:r[10]||""})).filter(f=>f.date===todayStr));
      }
    });
    loadFromSheet("AIRCRAFT STATUS S-92A").then(rows=>{ if(rows.length>1)setListA(rows.slice(1).map(r=>({id:r[0]||"",status:r[1]||"FMC",trouble:r[6]||"",remark:r[13]||""}))); });
    loadFromSheet("AIRCRAFT STATUS S-70i").then(rows=>{ if(rows.length>1)setListB(rows.slice(1).map(r=>({id:r[0]||"",status:r[1]||"FMC",trouble:r[6]||"",remark:r[13]||""}))); });
    loadFromSheet("DUTY").then(rows=>{ if(rows.length>1) setMonthly(rows.slice(1).map(r=>({date:r[1]||"",alert:r[2]||"",sof:r[3]||"",base:r[4]||""}))); });
    loadFromSheet("ORDERS").then(rows=>{ if(rows.length>1) setOrders(rows.slice(1,4).map(r=>({date:r[0]||"",items:(()=>{try{return JSON.parse(r[1]||"[]");}catch{return [r[1]||""];}})()}))); });
    loadFromSheet("HAZARD REPORT").then(rows=>{ if(rows.length>1) setHazards(rows.slice(1,4).map(r=>({date:r[0]||"",time:r[1]||"",reporter:r[2]||"",event:r[8]||""}))); });
    loadFromSheet("SAFETY ANNOUNCEMENTS").then(rows=>{ if(rows.length>1) setSafetyAnn(rows.slice(1).map(r=>({title:r[0]||"",body:r[1]||"",date:r[2]||"",imageUrl:parseDriveUrl(r[3]||"")}))); });
    loadNotamFromCSV().then(rows=>{
      if(rows.length>1){
        const rawTexts = rows.slice(1).map(r => {
          let val = r[8] || r[5];
          val = cleanRawText(val);
          if (val && !val.trim().startsWith("(")) {
            val = "(" + val.trim() + ")";
          }
          return val;
        }).filter(Boolean).join("\n\n");
        const parsed = parseNotamText(rawTexts);
        if(parsed.length>0) setNotams(parsed);
      }
    }).catch(()=>{});
  },[]);

  const allAc  = [...listA,...listB];
  const fmc    = allAc.filter(a=>a.status==="FMC").length;
  const nmc    = allAc.filter(a=>a.status==="NMC").length;
  const allN   = notams;
  const hiN    = allN.filter((n:any)=>n.p==="HIGH").length;
  const today  = new Date();
  const todStr = `${today.getDate()} ${MONTH_EN[today.getMonth()]}`;
  const dutyRow= monthly.find(r=>r.date===todStr);

  return (
    <div style={{width:"100%"}}>
      <div style={{display:"flex",flexDirection:"column",gap:20}}>

        {/* 1. บันทึก/สั่งการล่าสุด */}
        <Sec title="บันทึก / สั่งการล่าสุด" icon="📋">
          {orders.length===0&&<div style={{color:"var(--text-secondary)",fontSize:15,padding:"8px 0"}}>ยังไม่มีบันทึก</div>}
          {orders.map((o,i)=>(
            <div key={i} style={{padding:"8px 0",borderBottom:"1px solid var(--border-panel)"}}>
              {o.date&&<div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:5}}>📅 {o.date}</div>}
              <ol style={{margin:0,paddingLeft:22}}>
                {(o.items||[]).map((item,j)=>(
                  <li key={j} style={{fontSize:15,color:"var(--text-primary)",lineHeight:2}}>{item}</li>
                ))}
              </ol>
            </div>
          ))}
        </Sec>

        {/* 2. เวรประจำวัน */}
        <Sec title="เวรประจำวัน" icon="👮">
          {dutyRow ? (
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"6px 0"}}>
              {[["ALERT 1",dutyRow.alert],["SOF",dutyRow.sof],["BASE OPS",dutyRow.base]].map(([l,v])=>(
                <div key={l} style={{background:"var(--bg-card)",border:"1px solid var(--border-panel)",borderRadius:8,padding:"12px 15px"}}>
                  <div style={{fontSize:12,color:"var(--accent-color)",fontWeight:700,marginBottom:5}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:"var(--text-primary)"}}>{v||"—"}</div>
                </div>
              ))}
            </div>
          ) : <div style={{color:"var(--text-secondary)",fontSize:15,padding:"8px 0"}}>ไม่พบข้อมูลเวรวันนี้</div>}
        </Sec>


        {/* 4. Hazard Report */}
        <Sec title="HAZARD REPORT ล่าสุด" icon="⚠️">
          {hazards.length===0&&<div style={{color:"var(--text-secondary)",fontSize:15,padding:"8px 0"}}>ยังไม่มีรายงาน</div>}
          {hazards.map((h,i)=>(
            <div key={i} style={{padding:"8px 0 8px 10px",borderBottom:"1px solid var(--border-panel)",borderLeft:"3px solid #f97316"}}>
              <div style={{fontSize:14,color:"#fca5a5",lineHeight:2}}>{h.event}</div>
              <div style={{fontSize:12,color:"var(--text-secondary)",marginTop:2}}>{h.date} {h.time&&`· ${h.time}`} {h.reporter&&`· ${h.reporter}`}</div>
            </div>
          ))}
        </Sec>

        {/* 5. ตารางบินวันนี้ */}
        <Sec title="ตารางบินวันนี้" icon="✈️">
          {flights.length===0&&<div style={{color:"var(--text-secondary)",fontSize:15,padding:"8px 0"}}>ไม่มีการบินวันนี้</div>}
          {flights.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:"1px solid var(--border-panel)"}}>
              <span style={{fontSize:12,padding:"2px 8px",borderRadius:3,background:f.acTypeF==="S-92A"?"#14532d":"#0c4a6e",color:f.acTypeF==="S-92A"?"#86efac":"#7dd3fc",fontWeight:700,flexShrink:0}}>{f.acTypeF}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:700,color:"var(--text-primary)"}}>{f.cs} · {f.mission}</div>
                <div style={{fontSize:14,color:"var(--text-secondary)"}}>{f.pilot}{f.coPilot?` / ${f.coPilot}`:""}{f.route?` · ${f.route}`:""}</div>
              </div>
              <div style={{fontSize:14,color:"var(--text-secondary)",fontFamily:"monospace",flexShrink:0}}>{f.takeoff}{f.land?`–${f.land}`:""}</div>
            </div>
          ))}
        </Sec>

        {/* 6. NOTAM */}
        <Sec title="NOTAM HIGH" icon="🚨">
          {allN.filter((n:any)=>n.p==="HIGH").length===0&&<div style={{color:"var(--text-secondary)",fontSize:15,padding:"8px 0"}}>ไม่มี NOTAM HIGH</div>}
          {allN.filter((n:any)=>n.p==="HIGH").map((n:any,i)=>(
            <div key={i} style={{padding:"7px 0 7px 10px",borderBottom:"1px solid var(--border-panel)",borderLeft:"3px solid #ef4444"}}>
              <div style={{fontFamily:"monospace",fontSize:14,fontWeight:800,color:"#38bdf8"}}>{n.raw.split("\n")[0]}</div>
              <div style={{fontFamily:"monospace",fontSize:12,color:"var(--text-secondary)",marginTop:2}}>{(n.raw.split("\n").find((l:string)=>l.trim().startsWith("E)"))||"").trim()}</div>
            </div>
          ))}
        </Sec>

        {/* 7. สถานะอากาศยาน */}
        <Sec title="สถานภาพอากาศยาน" icon="🛩️">
          {allAc.map((ac:any,i)=>{
            const s=SB[ac.status]||SB.FMC;
            return <div key={ac.id} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",borderBottom:"1px solid var(--border-panel)"}}>
              <span style={{fontSize:12,padding:"2px 10px",borderRadius:5,background:s.bg,color:s.c,fontWeight:800,minWidth:48,textAlign:"center"}}>{ac.status}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:700,color:"var(--text-primary)"}}>{ac.id}</div>
                {(ac.remark||ac.trouble)&&<div style={{fontSize:12,color:"#f59e0b"}}>{ac.remark||ac.trouble}</div>}
              </div>
            </div>;
          })}
        </Sec>

      </div>
    </div>
  );
}
