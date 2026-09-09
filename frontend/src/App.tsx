import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://api.homelab.local";

interface GeoInfo {
  status?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
  message?: string;
}

interface VisitorInfo {
  ip?: string;
  location?: GeoInfo;
  userAgent?: string;
  resolvedAt?: string;
}

function App() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<VisitorInfo | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/visits`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setCount(data.count))
      .catch((err) => setError(err.message));

    fetch(`${API_URL}/api/visitor`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setVisitor(data))
      .catch(() => {
        /* visitor info is non-critical - leave chips empty on failure */
      });
  }, []);

  // Interactive dot-mesh background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onMq);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spacing = 28;
    const radius = 1.1;
    let raf = 0;
    let mouse = { x: -9999, y: -9999 };
    let hasPointer = false;

    let dots: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(window.innerWidth / spacing) + 1;
      const rows = Math.ceil(window.innerHeight / spacing) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({ x: i * spacing, y: j * spacing, vx: 0, vy: 0 });
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      hasPointer = true;
    };
    const onLeave = () => {
      hasPointer = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const influence = 110;

        if (hasPointer && dist < influence && dist > 0.001) {
          const force = (1 - dist / influence) * 0.9;
          d.vx += (dx / dist) * force;
          d.vy += (dy / dist) * force;
        }

        const restX = Math.round(d.x / spacing) * spacing;
        const restY = Math.round(d.y / spacing) * spacing;
        d.vx += (restX - d.x) * 0.09;
        d.vy += (restY - d.y) * 0.09;

        d.vx *= 0.82;
        d.vy *= 0.82;

        d.x += d.vx;
        d.y += d.vy;

        const dxr = d.x - mouse.x;
        const dyr = d.y - mouse.y;
        const distR = Math.hypot(dxr, dyr);
        const glow = hasPointer ? Math.max(0, 1 - distR / influence) : 0;
        const r = radius + glow * 1.1;
        const alpha = 0.22 + glow * 0.35;

        ctx.beginPath();
        ctx.fillStyle = `rgba(180, 184, 205, ${alpha.toFixed(3)})`;
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    if (!reduceMotion) {
      raf = requestAnimationFrame(tick);
    } else {
      for (const d of dots) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(180, 184, 205, 0.22)";
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      mq.removeEventListener("change", onMq);
    };
  }, [reduceMotion]);

  const geo = visitor?.location;
  const locationLabel = geo?.city
    ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ")
    : geo?.message ?? "Locating…";

  return (
    <div className="page">
      <canvas ref={canvasRef} className="mesh" aria-hidden="true" />

      <div className="hud hud--tl" aria-label="Visitor details">
        <div className="hud__item">
          <span className="hud__label">IP address</span>
          <span className="hud__value">{visitor?.ip ?? "…"}</span>
        </div>
        <div className="hud__item">
          <span className="hud__label">Location</span>
          <span className="hud__value">{locationLabel}</span>
        </div>
      </div>

      <div className="hud hud--tr" aria-label="Network details">
        <div className="hud__item">
          <span className="hud__label">Timezone</span>
          <span className="hud__value">{geo?.timezone ?? "…"}</span>
        </div>
        <div className="hud__item">
          <span className="hud__label">Coordinates</span>
          <span className="hud__value">
            {geo?.latitude != null && geo?.longitude != null
              ? `${geo.latitude.toFixed(2)}, ${geo.longitude.toFixed(2)}`
              : "…"}
          </span>
        </div>
      </div>

      <div className="hud hud--bl" aria-label="Network provider">
        <div className="hud__item">
          <span className="hud__label">ISP</span>
          <span className="hud__value">{geo?.isp ?? geo?.org ?? "…"}</span>
        </div>
      </div>

      <div className="card">
        <header className="card__header">
          <h1>Guestbook</h1>
          <p className="card__subtitle">Thanks for stopping by.</p>
        </header>

        {error && (
          <p className="error" role="alert">
            Error: {error}
          </p>
        )}

        {!error && count === null && (
          <div className="status">
            <div className="spinner" aria-hidden="true" />
            <span>Loading...</span>
          </div>
        )}

        {!error && count !== null && (
          <div className="counter">
            <p className="count">{count}</p>
            <p className="count__label">
              visit{count === 1 ? "" : "s"} so far
            </p>
          </div>
        )}

        <footer className="card__footer">
          <span className="card__dot" aria-hidden="true" />
          <span>You're visitor #{count ?? "…"}</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
