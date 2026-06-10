import { useState, useEffect, useRef } from "react";

const MONTH_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MONTH_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_TH   = ["อา","จ","อ","พ","พฤ","ศ","ส"];

export default function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]   = useState(false);
  const today = new Date();
  
  const parseVal = (v: string) => {
    if (!v) return today;
    const parts = v.trim().split(" ");
    if (parts.length >= 2) {
      const d = parseInt(parts[0]);
      const mIdx = MONTH_EN.findIndex(m => m.toLowerCase() === parts[1].toLowerCase());
      if (!isNaN(d) && mIdx >= 0) {
        const y = parts[2] ? parseInt(parts[2]) : today.getFullYear();
        return new Date(y, mIdx, d);
      }
    }
    return today;
  };
  
  const [cur, setCur] = useState(() => parseVal(value));
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setCur(parseVal(value));
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const bg    = "var(--bg-panel-solid)";
  const txt   = "var(--text-primary)";
  const brd   = "var(--border-panel)";
  const todayBg = "var(--accent-color)";

  const firstDay = new Date(cur.getFullYear(), cur.getMonth(), 1).getDay();
  const daysInMonth = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();

  const selectDate = (d: number) => {
    const picked = new Date(cur.getFullYear(), cur.getMonth(), d);
    onChange(`${d} ${MONTH_EN[picked.getMonth()]} ${picked.getFullYear()}`);
    setOpen(false);
  };

  const parseValSafe = (v: string) => { try { return parseVal(v); } catch { return today; } };
  const pv = value ? parseValSafe(value) : null;
  const isSelected = (d: number) => pv && pv.getDate()===d && pv.getMonth()===cur.getMonth() && pv.getFullYear()===cur.getFullYear();
  const isToday    = (d: number) => today.getDate()===d && today.getMonth()===cur.getMonth() && today.getFullYear()===cur.getFullYear();

  return (
    <div ref={ref} style={{position:"relative",width:"100%"}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{background:bg,border:`1px solid ${brd}`,color:value?txt:"var(--text-secondary)",borderRadius:6,padding:"6px 10px",fontSize:15,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",userSelect:"none"}}>
        <span>{value || "เลือกวันที่"}</span>
        <span style={{fontSize:12,color:"var(--text-secondary)"}}>📅</span>
      </div>
      {open && (
        <div style={{position:"absolute",zIndex:999,top:"calc(100% + 4px)",left:0,background:bg,border:`1px solid ${brd}`,borderRadius:12,padding:12,minWidth:300,boxShadow:"0 8px 32px #0008"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <button onClick={(e)=>{e.stopPropagation();setCur(new Date(cur.getFullYear(),cur.getMonth()-1,1));}} style={{background:"none",border:"none",color:txt,cursor:"pointer",fontSize:20,padding:"2px 10px"}}>‹</button>
            <span style={{fontSize:16,fontWeight:700,color:txt}}>{MONTH_TH[cur.getMonth()]} {cur.getFullYear()+543}</span>
            <button onClick={(e)=>{e.stopPropagation();setCur(new Date(cur.getFullYear(),cur.getMonth()+1,1));}} style={{background:"none",border:"none",color:txt,cursor:"pointer",fontSize:20,padding:"2px 10px"}}>›</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:5}}>
            {DAY_TH.map((d,i)=>(
              <div key={d} style={{textAlign:"center",fontSize:12,fontWeight:700,color:i===0?"#ef4444":i===6?"#a855f7":"var(--text-secondary)",padding:"2px 0"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const d=i+1; const sel=isSelected(d); const tod=isToday(d);
              const dow=(firstDay+i)%7;
              const wkColor=dow===0?"#ef4444":dow===6?"#a855f7":txt;
              return (
                <div key={d} onClick={(e)=>{e.stopPropagation();selectDate(d);}}
                  style={{textAlign:"center",padding:"5px 0",borderRadius:8,cursor:"pointer",fontSize:15,fontWeight:sel?800:400,
                    background:sel?todayBg:tod?"rgba(59,130,246,0.2)":"transparent",
                    color:sel?"#fff":wkColor,border:tod&&!sel?"1px solid #3b82f6":"1px solid transparent"}}>
                  {d}
                </div>
              );
            })}
          </div>
          <div style={{marginTop:10,textAlign:"center"}}>
            <button onClick={(e)=>{e.stopPropagation();const t=new Date();setCur(t);selectDate(t.getDate());}}
              style={{fontSize:14,padding:"3px 18px",borderRadius:6,border:"1px solid #334155",background:"transparent",color:"var(--accent-color)",cursor:"pointer"}}>
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
