import { useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

export function Card({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass-card" style={{ 
      borderTop: `4px solid ${color}`, 
      padding: "20px 24px", 
      minWidth: 140, 
      flex: 1, 
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)", margin: "8px 0 4px", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: color, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export function Sec({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="glass-panel" style={{ borderRadius: "var(--radius-xl)", padding: "28px 32px", marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--border-panel)" }}>
        <span style={{ fontSize: 24, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>{icon}</span>
        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 18, letterSpacing: "-0.01em" }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Clock() {
  const [now, setNow] = useState(new Date());
  const [full, setFull] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const p = (n: number) => String(n).padStart(2, "0");
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const mo   = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const timeStr = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  const dateStr = `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${mo[now.getMonth()]} ${now.getFullYear() + 543}`;

  return (
    <>
      {full && createPortal(
        <div onClick={(e) => { e.stopPropagation(); console.log("Portal click: setting full to false"); setFull(false); }}
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", userSelect: "none" }}>
          <div style={{ fontSize: "clamp(80px,18vw,220px)", fontWeight: 900, color: "var(--accent-color)", fontFamily: "var(--font-mono)", letterSpacing: 5, lineHeight: 1 }}>
            {timeStr}
          </div>
          <div style={{ fontSize: "clamp(20px,4vw,48px)", color: "var(--text-secondary)", marginTop: 30, fontWeight: 600, letterSpacing: 2 }}>
            {dateStr}
          </div>
          <div style={{ position: "absolute", bottom: 40, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20, color: "#22c55e" }}>●</span>
          </div>
          <div style={{ position: "absolute", bottom: 20, fontSize: 16, color: "var(--text-secondary)", letterSpacing: 1 }}>
            กดที่หน้าจอหรือ ESC เพื่อปิด
          </div>
        </div>,
        document.body
      )}
      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
        <div onClick={(e) => { e.stopPropagation(); console.log("Clock click: setting full to true"); setFull(true); }} style={{ cursor: "pointer" }} title="คลิกเพื่อขยายเต็มจอ">
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-color)", fontFamily: "var(--font-mono)" }}>{timeStr}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
            <span>{dateStr}</span>
            <span style={{ color: "#22c55e", fontSize: 10 }}>●</span>
          </div>
        </div>
      </div>
    </>
  );
}
