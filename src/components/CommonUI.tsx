import { useState, useEffect, ReactNode } from "react";

export function Card({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass-card" style={{ borderLeft: `4px solid ${color}`, padding: "15px 20px", minWidth: 138, flex: 1, position: "relative", overflow: "hidden" }}>
      <div className="laser-scanner"></div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: "var(--font-mono)", margin: "6px 0" }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{sub}</div>}
    </div>
  );
}

export function Sec({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="glass-panel" style={{ borderRadius: 16, padding: "22px 25px", marginBottom: 25 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, borderBottom: "1px solid var(--border-panel)", paddingBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 16, letterSpacing: 1 }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Clock() {
  const [now,     setNow]    = useState(new Date());
  const [offset,  setOffset] = useState(0);
  const [synced,  setSynced] = useState(false);
  const [full,    setFull]   = useState(false);

  useEffect(() => {
    const sync = async () => {
      try {
        const res  = await fetch("https://worldtimeapi.org/api/timezone/Asia/Bangkok");
        const data = await res.json();
        const serverMs = new Date(data.datetime).getTime();
        setOffset(serverMs - Date.now());
        setSynced(true);
      } catch { setSynced(false); }
    };
    sync();
    const interval = setInterval(sync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date(Date.now() + offset)), 1000);
    return () => clearInterval(t);
  }, [offset]);

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
      {full && (
        <div onClick={() => setFull(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--bg-app)", display: "flex", flexDirection: "column", alignItems: "center", justifyOrigin: "center", justifyContent: "center", cursor: "pointer", userSelect: "none" }}>
          <div style={{ fontSize: "clamp(80px,18vw,220px)", fontWeight: 900, color: "var(--accent-color)", fontFamily: "var(--font-mono)", letterSpacing: 5, lineHeight: 1 }}>
            {timeStr}
          </div>
          <div style={{ fontSize: "clamp(20px,4vw,48px)", color: "var(--text-secondary)", marginTop: 30, fontWeight: 600, letterSpacing: 2 }}>
            {dateStr}
          </div>
          <div style={{ position: "absolute", bottom: 40, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20, color: synced ? "#22c55e" : "#f59e0b" }}>●</span>
          </div>
          <div style={{ position: "absolute", bottom: 20, fontSize: 16, color: "var(--text-secondary)", letterSpacing: 1 }}>
            กดที่หน้าจอหรือ ESC เพื่อปิด
          </div>
        </div>
      )}
      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
        <div onClick={() => setFull(true)} style={{ cursor: "pointer" }} title="คลิกเพื่อขยายเต็มจอ">
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-color)", fontFamily: "var(--font-mono)" }}>{timeStr}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
            <span>{dateStr}</span>
            <span style={{ color: synced ? "#22c55e" : "#f59e0b", fontSize: 10 }}>●</span>
          </div>
        </div>
      </div>
    </>
  );
}
