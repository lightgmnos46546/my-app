# 201 SOMS — Project Notes

## สถานะปัจจุบัน (1 Jun 2026)
เว็บไซต์ใช้งานได้ดีแล้ว deploy บน GitHub Pages

**Repo:** https://github.com/lightgmnos46546/my-app  
**URL:** https://lightgmnos46546.github.io/my-app/

---

## Stack
- React 19 + TypeScript + Vite
- Deploy: gh-pages (`npm run build && npm run deploy`)
- Data: Google Apps Script (GAS_URL) ← → Google Sheets
- Font: Sarabun (Google Fonts)

---

## การปรับแต่งที่ทำไปแล้ว

### Layout / ขนาด
- Scale ทุก fontSize/padding/gap ขึ้น ×1.25 ในโค้ด (แทนการใช้ CSS zoom)
- base font-size: 20px ใน index.css
- Content wrapper: padding 5% ซ้าย-ขวา, maxWidth 1400px, margin auto
- Sidebar width: 325px, left offset ตอนปิด: -325px

### FLIGHT SCHEDULE
- คลิกที่แถวไฟล์ทเพื่อ expand/collapse panel (SAFETY + จัดการ)
- ปุ่ม ▼/▲ ซ่อนแล้ว แต่คลิก row ยังทำงานได้
- Font: Sarabun ทุกช่อง, fontWeight: 400 (ไม่หนา), ตัวอักษรสีดำ
- ข้อมูลจัดกึ่งกลางทุก cell
- Table: tableLayout fixed, ไม่มี horizontal scroll, fontSize 13px
- COLS widths รวม ~864px (ไม่เกินหน้าจอ)
- Load/Save fix: ใช้ useRef(isInitialLoad) แทน loaded state
  → auto-save ข้ามครั้งแรก, บันทึกเฉพาะเมื่อ user เปลี่ยนข้อมูล

### AIRCRAFT STATUS  
- Summary cards (S-92A / S-70i) + controls อยู่แถวเดียวกันเสมอ
- ลบ minHeight: 70vh ออก (ไม่มีช่องว่างเกิน)
- Card padding: 12px, minWidth: 0

### Dashboard
- ลบแท็บ "ประชาสัมพันธ์ด้านนิรภัยการบิน" ออกจาก Dashboard แล้ว
  (ยังมีในหน้า Flight Safety ปกติ)

### index.html
- เพิ่ม Google Fonts: Sarabun
- viewport: width=device-width, initial-scale=1.0, viewport-fit=cover

---

## หมายเหตุสำคัญ
- GAS URL อยู่บรรทัดที่ 4 ของ squadron-dashboard.tsx
- Sheet names: FLIGHT SCHEDULE, AIRCRAFT STATUS S-92A, AIRCRAFT STATUS S-70i,
  DUTY, PILOTS S-92A, PILOTS S-70i, ORDERS, HAZARD REPORT, SAFETY ANNOUNCEMENTS
