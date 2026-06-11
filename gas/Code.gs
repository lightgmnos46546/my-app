/**
 * ════════════════════════════════════════════════════════════════════════════
 * 201 SOMS — Google Apps Script Backend v2
 * เพิ่ม: ระบบล็อกอิน (PIN) + สิทธิ์ 3 ระดับ + Audit Log + กันข้อมูลชนกัน + Backup
 *
 * API เดิมยังทำงานเหมือนเดิมทุกอย่าง:
 *   GET  ?sheet=ชื่อชีท                 → ข้อมูลทั้งชีท (array of arrays)
 *   GET  ?action=getDashboard          → ข้อมูลรวมหลายชีทสำหรับหน้า Dashboard
 *   POST {sheet, data}                 → เขียนทับทั้งชีท
 *
 * API ใหม่:
 *   GET  ?action=authStatus            → {authEnabled: true/false}
 *   GET  ?sheet=X&withMeta=1&token=T   → {v: เวอร์ชัน, data: [...]}
 *   POST {action:"login", username, pin}        → {ok, token, role, display, exp}
 *   POST {action:"logout", token}               → {ok}
 *   POST {sheet, data, token, baseVersion}      → {ok, v} หรือ {error:"conflict"}
 *   POST {action:"backupNow", token}            → {ok, name} (admin เท่านั้น)
 *
 * Script Properties (ตั้งใน Project Settings → Script Properties):
 *   REQUIRE_AUTH   = "false" (ค่าเริ่มต้น: ระบบเปิดแบบเดิม) | "true" (บังคับล็อกอิน)
 *   SESSION_HOURS  = "24"    (อายุ session เป็นชั่วโมง — ไม่ตั้งก็ได้)
 *   SPREADSHEET_ID = (ใส่เฉพาะกรณีสคริปต์ไม่ได้ผูกกับ Spreadsheet โดยตรง)
 *
 * ชีทที่สคริปต์สร้าง/ใช้เอง:
 *   USERS      — บัญชีผู้ใช้: USERNAME | PIN | ROLE | DISPLAY NAME | ACTIVE
 *   AUDIT LOG  — ประวัติการใช้งาน: TIMESTAMP | USER | ACTION | SHEET | DETAIL
 * ════════════════════════════════════════════════════════════════════════════
 */

var USERS_SHEET = 'USERS';
var AUDIT_SHEET = 'AUDIT LOG';
var BACKUP_FOLDER = '201 SOMS Backups';
var BACKUP_KEEP_DAYS = 14;
var AUDIT_MAX_ROWS = 5000;

// ⚠️ ถ้าหน้า Dashboard ของเดิมใช้ชีทไม่ตรงกับรายการนี้ ให้แก้ให้ตรง
var DASHBOARD_SHEETS = [
  'FLIGHT SCHEDULE',
  'AIRCRAFT STATUS S-92A',
  'AIRCRAFT STATUS S-70i',
  'ORDERS',
  'HAZARD REPORT',
  'SAFETY ANNOUNCEMENTS',
  'POST FLIGHT LOGS'
];

// ── พื้นฐาน ──────────────────────────────────────────────────────────────────

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function authEnabled_() {
  return PropertiesService.getScriptProperties().getProperty('REQUIRE_AUTH') === 'true';
}

function readSheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) return [];
  return sh.getDataRange().getValues();
}

function writeSheet_(name, data) {
  var sp = ss_();
  var sh = sp.getSheetByName(name) || sp.insertSheet(name);
  sh.clearContents();
  if (!data || !data.length) return;
  // ทำให้ทุกแถวกว้างเท่ากัน (setValues ต้องการ array สี่เหลี่ยม)
  var width = 0;
  for (var i = 0; i < data.length; i++) width = Math.max(width, data[i].length);
  var rect = data.map(function (r) {
    var row = r.slice();
    while (row.length < width) row.push('');
    return row;
  });
  sh.getRange(1, 1, rect.length, width).setValues(rect);
}

// ── เวอร์ชันชีท (กันเขียนทับกัน) ─────────────────────────────────────────────

function getVer_(sheetName) {
  return Number(PropertiesService.getScriptProperties().getProperty('ver_' + sheetName) || 0);
}

function setVer_(sheetName, v) {
  PropertiesService.getScriptProperties().setProperty('ver_' + sheetName, String(v));
}

// ── Audit Log ────────────────────────────────────────────────────────────────

function audit_(user, action, sheet, detail) {
  try {
    var sp = ss_();
    var sh = sp.getSheetByName(AUDIT_SHEET);
    if (!sh) {
      sh = sp.insertSheet(AUDIT_SHEET);
      sh.appendRow(['TIMESTAMP', 'USER', 'ACTION', 'SHEET', 'DETAIL']);
    }
    sh.appendRow([new Date(), user || 'anonymous', action, sheet || '', detail || '']);
  } catch (e) { /* audit ห้ามทำให้งานหลักล้ม */ }
}

function trimAudit_() {
  try {
    var sh = ss_().getSheetByName(AUDIT_SHEET);
    if (!sh) return;
    var n = sh.getLastRow();
    if (n > AUDIT_MAX_ROWS + 1) sh.deleteRows(2, n - AUDIT_MAX_ROWS - 1);
  } catch (e) {}
}

// ── Token / Session ──────────────────────────────────────────────────────────

function checkAuth_(token) {
  if (!token) return null;
  var raw = PropertiesService.getScriptProperties().getProperty('tok_' + token);
  if (!raw) return null;
  try {
    var s = JSON.parse(raw);
    if (s.exp && s.exp > Date.now()) return s; // {u, role, exp}
    PropertiesService.getScriptProperties().deleteProperty('tok_' + token);
  } catch (e) {}
  return null;
}

function cleanupTokens_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  for (var k in all) {
    if (k.indexOf('tok_') !== 0) continue;
    try {
      var s = JSON.parse(all[k]);
      if (!s.exp || s.exp <= Date.now()) props.deleteProperty(k);
    } catch (e) { props.deleteProperty(k); }
  }
}

function hashPin_(pin, salt) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    var v = (b + 256) % 256;
    return (v < 16 ? '0' : '') + v.toString(16);
  }).join('');
}

// ── Login ────────────────────────────────────────────────────────────────────

function handleLogin_(body) {
  var uname = String(body.username || '').trim();
  var pin = String(body.pin || '');
  if (!uname || !pin) return json_({ error: 'invalid' });

  // กันเดา PIN: พลาด 5 ครั้ง → ล็อก 10 นาที
  var cache = CacheService.getScriptCache();
  var failKey = 'fail_' + uname.toLowerCase();
  var fails = Number(cache.get(failKey) || 0);
  if (fails >= 5) return json_({ error: 'locked' });

  var sh = ss_().getSheetByName(USERS_SHEET);
  if (!sh) return json_({ error: 'no-users-sheet' });

  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var u = String(rows[i][0] || '').trim();
    if (u.toLowerCase() !== uname.toLowerCase()) continue;

    var active = String(rows[i][4]).toUpperCase();
    if (active === 'FALSE' || active === 'NO' || active === '0' || active === 'ปิด') {
      return json_({ error: 'disabled' });
    }

    var stored = String(rows[i][1] || '');
    var okPin = false;
    if (stored.indexOf('sha256:') === 0) {
      var parts = stored.split(':'); // sha256:salt:hash
      okPin = hashPin_(pin, parts[1]) === parts[2];
    } else {
      // PIN ยังเป็นตัวอักษรธรรมดา (admin เพิ่งใส่) → ล็อกอินสำเร็จครั้งแรกจะถูกแปลงเป็น hash อัตโนมัติ
      okPin = stored === pin;
      if (okPin) {
        var salt = Utilities.getUuid().slice(0, 8);
        sh.getRange(i + 1, 2).setValue('sha256:' + salt + ':' + hashPin_(pin, salt));
      }
    }
    if (!okPin) break; // เจอ user แล้วแต่ PIN ผิด → นับ fail

    cache.remove(failKey);
    var role = String(rows[i][2] || 'viewer').trim().toLowerCase();
    if (role !== 'admin' && role !== 'editor') role = 'viewer';
    var display = String(rows[i][3] || u);
    var hours = Number(PropertiesService.getScriptProperties().getProperty('SESSION_HOURS') || 24);
    var exp = Date.now() + hours * 3600 * 1000;
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    PropertiesService.getScriptProperties()
      .setProperty('tok_' + token, JSON.stringify({ u: u, role: role, exp: exp }));
    audit_(u, 'login', '', 'role=' + role);
    return json_({ ok: true, token: token, user: u, display: display, role: role, exp: exp });
  }

  cache.put(failKey, String(fails + 1), 600);
  audit_(uname, 'login-fail', '', '');
  return json_({ error: 'invalid' });
}

// ── Backup ───────────────────────────────────────────────────────────────────

function backupNow_() {
  var file = DriveApp.getFileById(ss_().getId());
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH.mm');
  var name = 'SOMS Backup ' + stamp;
  file.makeCopy(name, folder);
  // ลบ backup ที่เก่ากว่ากำหนด
  var cutoff = Date.now() - BACKUP_KEEP_DAYS * 24 * 3600 * 1000;
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getDateCreated().getTime() < cutoff) f.setTrashed(true);
  }
  return name;
}

/**
 * dailyBackup — ตั้ง Trigger แบบ Time-driven ให้รันวันละครั้ง (เช่น ตี 2)
 * Apps Script → ไอคอนนาฬิกา (Triggers) → Add Trigger →
 *   function: dailyBackup | event: Time-driven | Day timer | 2am-3am
 */
function dailyBackup() {
  var name = backupNow_();
  cleanupTokens_();
  trimAudit_();
  audit_('system', 'backup', '', name);
}

// ── จัดเวร (เขียนลงสเปรดชีตเวรไฟล์เดิมแบบเจาะจงเซลล์) ─────────────────────────
// ⚠️ บัญชี Google ที่เป็นเจ้าของสคริปต์นี้ ต้องมีสิทธิ์ "แก้ไข" สเปรดชีตเวรด้วย

var DUTY_SPREADSHEET_ID_DEFAULT = '1NLqQWzaiLU7x0Q5WOU9qhdZRSaCsfpYjldc9w3QKE-8';

// ตำแหน่งคอลัมน์ในชีทเวร (ตรงกับที่หน้าเว็บอ่าน) — คอลัมน์อื่นจะไม่ถูกแตะเลย
var DUTY_COLS = {
  alert: 2,        // B
  sof: 4,          // D
  baseops: 6,      // F
  emerBrief: 8,    // H
  remark: 10,      // J
  det9923: [11, 12, 13],       // K, L, M
  cSqdn: [17, 18, 19, 20]      // Q, R, S, T
};

function dutySheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('DUTY_SHEET_ID')
        || DUTY_SPREADSHEET_ID_DEFAULT;
  return SpreadsheetApp.openById(id).getSheets()[0];
}

// แปลงค่าในคอลัมน์ A (วันที่) ให้เป็น {y,m,d} — รองรับ Date จริง / ไทย+พ.ศ. / EN / dd/mm/yyyy / ISO
function parseDutyCellDate_(c) {
  if (c instanceof Date && !isNaN(c.getTime())) {
    return { y: c.getFullYear(), m: c.getMonth() + 1, d: c.getDate() };
  }
  var s = String(c || '').trim();
  if (!s) return null;
  var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var en = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})/);
  if (en) {
    var mi = months.indexOf(en[2].slice(0, 3).toUpperCase());
    if (mi >= 0) return { y: +en[3], m: mi + 1, d: +en[1] };
  }
  var thMonths = {'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12,
    'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12};
  var th = s.match(/(\d{1,2})\s+([^\s\d,]+)\s+(\d{2,4})/);
  if (th && thMonths[th[2]]) {
    var yy = +th[3];
    if (yy < 100) yy += 2000;
    if (yy > 2500) yy -= 543;
    return { y: yy, m: thMonths[th[2]], d: +th[1] };
  }
  var sl = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (sl) {
    var y2 = +sl[3];
    if (y2 > 2500) y2 -= 543;
    return { y: y2, m: +sl[2], d: +sl[1] };
  }
  var iso = new Date(s);
  if (!isNaN(iso.getTime())) return { y: iso.getFullYear(), m: iso.getMonth() + 1, d: iso.getDate() };
  return null;
}

function handleUpdateDuty_(body, who) {
  var t = body.date || {};
  var y = Number(t.y), m = Number(t.m), d = Number(t.d); // m = 1-12
  if (!y || !m || !d) return json_({ error: 'bad-date' });

  var sh;
  try { sh = dutySheet_(); }
  catch (e) { return json_({ error: 'duty-sheet-access', detail: String(e) }); }

  // หาแถวของวันที่ในคอลัมน์ A
  var colA = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  var rowIdx = -1;
  for (var i = 0; i < colA.length; i++) {
    var pd = parseDutyCellDate_(colA[i][0]);
    if (pd && pd.y === y && pd.m === m && pd.d === d) { rowIdx = i + 1; break; }
  }
  if (rowIdx < 0) return json_({ error: 'date-not-found' });

  var f = body.fields || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    Object.keys(DUTY_COLS).forEach(function (k) {
      if (!(k in f)) return; // อัปเดตเฉพาะ field ที่ส่งมา
      var spec = DUTY_COLS[k];
      if (Array.isArray(spec)) {
        var vals = Array.isArray(f[k]) ? f[k] : [];
        for (var j = 0; j < spec.length; j++) {
          sh.getRange(rowIdx, spec[j]).setValue(vals[j] !== undefined && vals[j] !== null ? String(vals[j]) : '');
        }
      } else {
        sh.getRange(rowIdx, spec).setValue(f[k] !== undefined && f[k] !== null ? String(f[k]) : '');
      }
    });
  } finally {
    lock.releaseLock();
  }
  audit_(who, 'duty-update', 'DUTY', d + '/' + m + '/' + y);
  return json_({ ok: true });
}

// ── Entry points ─────────────────────────────────────────────────────────────

function doGet(e) {
  var p = (e && e.parameter) || {};

  if (p.action === 'authStatus') {
    return json_({ ok: true, authEnabled: authEnabled_(), api: 2 });
  }

  // ตรวจสิทธิ์การอ่าน (ทุก role อ่านได้ ถ้าล็อกอินแล้ว)
  if (authEnabled_() && !checkAuth_(p.token)) {
    return json_({ error: 'unauthorized' });
  }

  if (p.action === 'getDashboard') {
    var out = {};
    DASHBOARD_SHEETS.forEach(function (name) { out[name] = readSheet_(name); });
    return json_(out);
  }

  if (p.sheet) {
    var data = readSheet_(p.sheet);
    if (p.withMeta === '1') return json_({ v: getVer_(p.sheet), data: data });
    return json_(data); // รูปแบบเดิม — frontend เวอร์ชันเก่ายังใช้ได้
  }

  return json_({ error: 'bad-request' });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {
    return json_({ error: 'bad-json' });
  }

  if (body.action === 'login') return handleLogin_(body);

  if (body.action === 'logout') {
    if (body.token) PropertiesService.getScriptProperties().deleteProperty('tok_' + body.token);
    return json_({ ok: true });
  }

  var auth = checkAuth_(body.token);
  if (authEnabled_()) {
    if (!auth) return json_({ error: 'unauthorized' });
    if (auth.role !== 'editor' && auth.role !== 'admin') {
      audit_(auth.u, 'denied-write', body.sheet || body.action || '', 'role=' + auth.role);
      return json_({ error: 'forbidden' });
    }
  }
  var who = auth ? auth.u : 'anonymous';

  if (body.action === 'backupNow') {
    if (authEnabled_() && auth.role !== 'admin') return json_({ error: 'forbidden' });
    var name = backupNow_();
    audit_(who, 'backup', '', name);
    return json_({ ok: true, name: name });
  }

  if (body.action === 'updateDuty') {
    return handleUpdateDuty_(body, who);
  }

  if (!body.sheet || !Array.isArray(body.data)) return json_({ error: 'bad-request' });

  // เขียนแบบ atomic + ตรวจเวอร์ชันกันเขียนทับงานคนอื่น
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cur = getVer_(body.sheet);
    if (body.baseVersion !== undefined && body.baseVersion !== null
        && Number(body.baseVersion) !== cur) {
      audit_(who, 'conflict', body.sheet, 'base=' + body.baseVersion + ' cur=' + cur);
      return json_({ error: 'conflict', current: cur });
    }
    writeSheet_(body.sheet, body.data);
    var v = cur + 1;
    setVer_(body.sheet, v);
    audit_(who, 'save', body.sheet, body.data.length + ' rows');
    return json_({ ok: true, v: v });
  } finally {
    lock.releaseLock();
  }
}
