import { useEffect, useRef } from "react";

export default function HeloImg({ src }: { src: string; alt?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!src || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current!;
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      try {
        const d = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) {
          const r=d.data[i], g=d.data[i+1], b=d.data[i+2];
          // ลบพื้นหลังสีดำเข้ม (ปรับความแม่นยำเป็น < 15)
          if (r < 15 && g < 15 && b < 15) d.data[i+3] = 0;
        }
        ctx.putImageData(d, 0, 0);
      } catch (e) {
        console.error("Canvas image processing failed (possibly CORS issue)", e);
      }
    };
    img.src = src;
  }, [src]);

  return <canvas ref={canvasRef} style={{width:125,height:55,objectFit:"contain",flexShrink:0}}/>;
}
