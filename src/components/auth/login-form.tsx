"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INTERNAL_EMAIL_DOMAIN } from "@/config/external-links";
import { toast } from "sonner";
import { Loader2, LogIn, User, Lock } from "lucide-react";

const STARS = [
  [8,15,2,"0s","3.2s"],[14,88,1.5,"1.1s","2.8s"],[22,42,1.8,"0.4s","3.8s"],
  [31,67,1.2,"1.8s","2.5s"],[6,55,2.2,"0.9s","4.1s"],[42,8,1.5,"1.5s","3.5s"],
  [55,93,1.8,"0.2s","3s"],[63,31,1.2,"2.1s","2.7s"],[71,76,2,"0.7s","4s"],
  [78,18,1.5,"1.3s","3.3s"],[86,61,1.8,"0.5s","2.9s"],[93,44,1.2,"1.9s","3.7s"],
  [18,72,2,"0.3s","4.2s"],[35,25,1.5,"1.6s","3.1s"],[48,85,1.8,"0.8s","2.6s"],
  [60,50,1.2,"1.4s","3.9s"],[75,12,2,"0.6s","4.4s"],[88,79,1.5,"2s","3s"],
  [25,96,1.8,"1.2s","2.8s"],[50,3,1.2,"0.1s","3.6s"],[40,38,2,"1.7s","4.1s"],
  [95,22,1.5,"0.9s","3.2s"],[16,60,1.8,"1.4s","2.9s"],[70,48,1.2,"0.6s","3.5s"],
] as const;

const PARTICLES = [
  {l:"4%",  s:3, d:"18s", dl:"0s",  dr:"25px",  c:"rgba(201,168,76,0.7)"},
  {l:"12%", s:2, d:"22s", dl:"3s",  dr:"-18px", c:"rgba(255,245,180,0.4)"},
  {l:"22%", s:4, d:"16s", dl:"6s",  dr:"30px",  c:"rgba(201,168,76,0.5)"},
  {l:"33%", s:2, d:"24s", dl:"1s",  dr:"-22px", c:"rgba(255,255,255,0.28)"},
  {l:"44%", s:3, d:"20s", dl:"8s",  dr:"18px",  c:"rgba(201,168,76,0.6)"},
  {l:"55%", s:2, d:"19s", dl:"4s",  dr:"-15px", c:"rgba(180,145,255,0.35)"},
  {l:"63%", s:3, d:"23s", dl:"11s", dr:"22px",  c:"rgba(201,168,76,0.45)"},
  {l:"72%", s:2, d:"17s", dl:"2s",  dr:"-28px", c:"rgba(255,255,255,0.22)"},
  {l:"81%", s:4, d:"21s", dl:"7s",  dr:"14px",  c:"rgba(201,168,76,0.55)"},
  {l:"90%", s:2, d:"25s", dl:"9s",  dr:"-10px", c:"rgba(255,240,160,0.3)"},
  {l:"8%",  s:2, d:"20s", dl:"13s", dr:"35px",  c:"rgba(255,255,255,0.2)"},
  {l:"38%", s:3, d:"18s", dl:"15s", dr:"-30px", c:"rgba(201,168,76,0.4)"},
  {l:"60%", s:2, d:"26s", dl:"5s",  dr:"20px",  c:"rgba(160,120,240,0.38)"},
  {l:"78%", s:3, d:"22s", dl:"10s", dr:"-18px", c:"rgba(201,168,76,0.36)"},
  {l:"95%", s:4, d:"14s", dl:"0s",  dr:"12px",  c:"rgba(255,255,255,0.16)"},
  {l:"28%", s:2, d:"21s", dl:"17s", dr:"-24px", c:"rgba(255,230,100,0.32)"},
];

const METEORS = [
  {top:"12%", delay:"1s",  dur:"9s",  w:200},
  {top:"38%", delay:"8s",  dur:"11s", w:150},
  {top:"60%", delay:"14s", dur:"8s",  w:220},
  {top:"22%", delay:"20s", dur:"10s", w:170},
  {top:"75%", delay:"5s",  dur:"12s", w:130},
  {top:"48%", delay:"16s", dur:"9s",  w:185},
  {top:"85%", delay:"11s", dur:"7s",  w:140},
];

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword]   = useState("");
  const [loading,  setLoading]    = useState(false);
  const [focused,  setFocused]    = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) { toast.error("יש להזין שם משתמש"); return; }
    setLoading(true);
    const email = `${username.trim().toLowerCase()}@${INTERNAL_EMAIL_DOMAIN}`;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("שגיאה בהתחברות", { description: "שם משתמש או סיסמה שגויים. נסה שוב." });
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <style>{`
        /* ═══ KEYFRAMES ═══════════════════════════════════════════════ */
        @keyframes orb1  { 0%,100%{transform:translate(0,0) scale(1)}      33%{transform:translate(65px,-85px) scale(1.09)}    66%{transform:translate(-48px,58px) scale(.91)} }
        @keyframes orb2  { 0%,100%{transform:translate(0,0) scale(1)}      40%{transform:translate(-72px,52px) scale(1.13)}    75%{transform:translate(58px,-68px) scale(.87)} }
        @keyframes orb3  { 0%,100%{transform:translate(0,0)}                50%{transform:translate(48px,72px)} }
        @keyframes orb4  { 0%,100%{transform:translate(0,0) scale(1)}      45%{transform:translate(-42px,-64px) scale(1.07)}   80%{transform:translate(38px,48px) scale(.93)} }
        @keyframes orb5  { 0%,100%{transform:translate(0,0)}                60%{transform:translate(-58px,38px)} }

        @keyframes cardIn    { from{opacity:0;transform:translateY(44px) scale(.95);filter:blur(12px)} to{opacity:1;transform:translateY(0) scale(1);filter:blur(0)} }
        @keyframes welcomeIn { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }

        @keyframes ring1 { 0%,100%{transform:scale(1);opacity:.42}       50%{transform:scale(1.1);opacity:.16} }
        @keyframes ring2 { 0%,100%{transform:scale(1);opacity:.22}       50%{transform:scale(1.17);opacity:.08} }
        @keyframes ring3 { 0%,100%{transform:scale(1);opacity:.11}       50%{transform:scale(1.24);opacity:.04} }
        @keyframes ring4 { from{transform:rotate(0deg)}                  to{transform:rotate(360deg)} }

        @keyframes logoGlow  {
          0%,100%{box-shadow:0 0 28px rgba(201,168,76,.28),0 0 80px rgba(201,168,76,.08),0 18px 52px rgba(0,0,0,.72)}
             50%{box-shadow:0 0 50px rgba(201,168,76,.55),0 0 110px rgba(201,168,76,.22),0 18px 52px rgba(0,0,0,.72)}
        }
        @keyframes topGlow   { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes goldText  { 0%{background-position:-260% center} 100%{background-position:260% center} }
        @keyframes btnShimmer{ 0%{background-position:-320% center} 100%{background-position:320% center} }
        @keyframes btnShine  { 0%{left:-140%} 28%,100%{left:140%} }
        @keyframes dotBounce { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.75);opacity:1} }
        @keyframes starFade  { 0%,100%{opacity:.09;transform:scale(1)} 50%{opacity:.62;transform:scale(1.45)} }
        @keyframes particle  { 0%{transform:translateY(0) translateX(0);opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{transform:translateY(-125vh) translateX(var(--pd));opacity:0} }
        @keyframes gridDrift { from{transform:translateY(0)} to{transform:translateY(80px)} }
        @keyframes meteor    { 0%{transform:translateX(-400px) translateY(0);opacity:0} 4%{opacity:.9} 85%{opacity:.7} 100%{transform:translateX(115vw) translateY(60px);opacity:0} }
        @keyframes scanMove  { 0%{top:-8%} 100%{top:108%} }
        @keyframes spinIcon  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cardBreath{
          0%,100%{box-shadow:0 0 0 1px rgba(201,168,76,.18),0 70px 130px rgba(0,0,0,.82),0 28px 60px rgba(0,0,0,.58),inset 0 1.5px 0 rgba(255,255,255,.12),inset 0 -1px 0 rgba(0,0,0,.22)}
             50%{box-shadow:0 0 0 1px rgba(201,168,76,.34),0 70px 130px rgba(0,0,0,.82),0 28px 60px rgba(0,0,0,.58),0 0 90px rgba(201,168,76,.07),inset 0 1.5px 0 rgba(255,255,255,.14),inset 0 -1px 0 rgba(0,0,0,.22)}
        }
        @keyframes diamondSpin { from{transform:rotate(0deg) scale(1)} 50%{transform:rotate(180deg) scale(1.3)} to{transform:rotate(360deg) scale(1)} }

        /* ═══ PAGE ════════════════════════════════════════════════════ */
        .lp {
          min-height:100vh; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:2rem 1rem; gap:18px;
          position:relative; overflow:hidden;
          background:#010409;
        }
        .lp-bg {
          position:fixed; inset:0; pointer-events:none;
          background:
            radial-gradient(ellipse 80% 65% at 82% 8%,  rgba(201,168,76,.12) 0%,transparent 54%),
            radial-gradient(ellipse 70% 60% at 8%  92%,  rgba(22,72,220,.2)   0%,transparent 54%),
            radial-gradient(ellipse 55% 50% at 50% 50%,  rgba(90,28,165,.055) 0%,transparent 60%),
            radial-gradient(ellipse 60% 55% at 88% 78%,  rgba(14,48,145,.1)   0%,transparent 52%),
            radial-gradient(ellipse 50% 45% at 18% 25%,  rgba(30,100,220,.08) 0%,transparent 52%),
            linear-gradient(175deg,#010812 0%,#060e22 35%,#070d1e 65%,#020810 100%);
        }
        .lp-grid {
          position:fixed; inset:0; pointer-events:none;
          background-image:
            linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px);
          background-size:80px 80px;
          animation:gridDrift 20s linear infinite;
        }
        .lp-scan {
          position:fixed; left:0; right:0; height:100px; pointer-events:none;
          background:linear-gradient(180deg,transparent 0%,rgba(201,168,76,.012) 50%,transparent 100%);
          animation:scanMove 14s linear infinite;
        }

        /* ═══ ORBS ════════════════════════════════════════════════════ */
        .lp-orb { position:fixed; border-radius:50%; pointer-events:none; }
        .o1{width:720px;height:720px;top:-22%;right:-15%;background:radial-gradient(circle at 33% 33%,rgba(201,168,76,.24) 0%,rgba(180,130,40,.06) 44%,transparent 64%);filter:blur(82px);animation:orb1 17s ease-in-out infinite;}
        .o2{width:660px;height:660px;bottom:-24%;left:-15%;background:radial-gradient(circle at 67% 67%,rgba(20,66,215,.3)  0%,rgba(12,48,140,.07) 44%,transparent 64%);filter:blur(92px);animation:orb2 21s ease-in-out infinite;}
        .o3{width:420px;height:420px;top:36%;left:28%;background:radial-gradient(circle,rgba(148,86,228,.09) 0%,transparent 64%);filter:blur(62px);animation:orb3 14s ease-in-out infinite;}
        .o4{width:520px;height:520px;top:8%;left:12%;background:radial-gradient(circle at 50% 50%,rgba(28,100,228,.11) 0%,transparent 64%);filter:blur(72px);animation:orb4 18s ease-in-out infinite 4s;}
        .o5{width:380px;height:380px;bottom:8%;right:8%;background:radial-gradient(circle,rgba(201,168,76,.09) 0%,transparent 64%);filter:blur(58px);animation:orb5 12s ease-in-out infinite;}

        /* ═══ METEORS ═════════════════════════════════════════════════ */
        .lp-meteor {
          position:fixed; left:-20%; height:1px; border-radius:9999px; pointer-events:none; opacity:0;
          background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.85) 45%,rgba(201,168,76,.7) 70%,transparent 100%);
          transform:rotate(-18deg);
        }

        /* ═══ CARD ════════════════════════════════════════════════════ */
        .lp-card {
          position:relative; width:100%; max-width:490px;
          border-radius:34px; overflow:hidden;
          backdrop-filter:blur(76px) saturate(250%) brightness(1.09);
          -webkit-backdrop-filter:blur(76px) saturate(250%) brightness(1.09);
          background:linear-gradient(160deg,rgba(255,255,255,.09) 0%,rgba(255,255,255,.036) 45%,rgba(255,255,255,.075) 100%);
          border:1px solid rgba(255,255,255,.1);
          animation:cardIn .92s cubic-bezier(.16,1,.3,1) both, cardBreath 4.5s ease-in-out infinite 1.2s;
        }
        .lp-topline {
          position:absolute;top:0;left:0;right:0;height:1.5px;
          background:linear-gradient(90deg,transparent 0%,rgba(201,168,76,.28) 10%,rgba(235,195,82,.96) 30%,rgba(255,242,140,1) 50%,rgba(235,195,82,.96) 70%,rgba(201,168,76,.28) 90%,transparent 100%);
          animation:topGlow 3.2s ease-in-out infinite;
        }
        .lp-sideline-l {
          position:absolute;top:15%;bottom:15%;left:0;width:1px;
          background:linear-gradient(180deg,transparent,rgba(201,168,76,.25) 50%,transparent);
        }
        .lp-sideline-r {
          position:absolute;top:25%;bottom:25%;right:0;width:1px;
          background:linear-gradient(180deg,transparent,rgba(201,168,76,.12) 50%,transparent);
        }
        .lp-inner-shine {
          position:absolute;inset:0;pointer-events:none;border-radius:34px;
          background:
            radial-gradient(ellipse at 50% -10%,rgba(201,168,76,.1) 0%,transparent 52%),
            radial-gradient(ellipse at 100% 105%,rgba(22,72,200,.07) 0%,transparent 45%);
        }
        .lp-noise {
          position:absolute;inset:0;pointer-events:none;border-radius:34px;opacity:.022;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:160px;
        }

        /* ═══ HERO ════════════════════════════════════════════════════ */
        .lp-hero {
          padding:54px 50px 30px;
          display:flex;flex-direction:column;align-items:center;gap:26px;
          text-align:center;position:relative;
        }
        .lp-rings { position:relative;display:flex;align-items:center;justify-content:center; }
        .lp-r { position:absolute;border-radius:50%; }
        .r1{width:114px;height:114px;border:1px solid rgba(201,168,76,.3);animation:ring1 3.8s ease-in-out infinite;}
        .r2{width:150px;height:150px;border:1px solid rgba(201,168,76,.16);animation:ring2 3.8s ease-in-out infinite .8s;}
        .r3{width:188px;height:188px;border:1px solid rgba(201,168,76,.08);animation:ring3 3.8s ease-in-out infinite 1.6s;}
        .r4{width:230px;height:230px;border:1px dashed rgba(201,168,76,.045);animation:ring4 25s linear infinite;}

        .lp-logo {
          position:relative;z-index:1;
          width:96px;height:96px;border-radius:26px;
          display:flex;align-items:center;justify-content:center;
          overflow:hidden;
          background:linear-gradient(148deg,#0f2042 0%,#060e20 100%);
          border:1px solid rgba(201,168,76,.58);
          animation:logoGlow 4s ease-in-out infinite;
        }
        .lp-logo::before {
          content:'';position:absolute;inset:0;border-radius:26px;
          background:linear-gradient(140deg,rgba(255,255,255,.13) 0%,transparent 50%);
        }
        .logo-corner {
          position:absolute;width:7px;height:7px;background:rgba(201,168,76,.85);
          transform:rotate(45deg);
          animation:diamondSpin 4s ease-in-out infinite;
        }
        .lc-tl{top:7px;left:7px;}
        .lc-br{bottom:7px;right:7px;width:5px;height:5px;opacity:.5;animation-delay:2s;}

        .lp-eyebrow {
          font-size:11px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;
          color:rgba(201,168,76,.72);
          animation:welcomeIn 1s ease both .45s;
        }
        .lp-title {
          margin:0;font-size:48px;font-weight:900;letter-spacing:-.045em;
          background:linear-gradient(112deg,#9e7018 0%,#c9a84c 14%,#e8c860 30%,#fff8cc 47%,#f5e07a 53%,#e8c860 70%,#c9a84c 86%,#9e7018 100%);
          background-size:250% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;
          animation:goldText 5.5s linear infinite;
          filter:drop-shadow(0 0 36px rgba(201,168,76,.32));
        }
        .lp-desc { margin:0;font-size:13.5px;color:rgba(255,255,255,.36);letter-spacing:.06em; }

        /* Stats strip */
        .lp-stats {
          display:flex;gap:22px;align-items:center;
          padding:10px 20px;border-radius:12px;
          background:rgba(255,255,255,.035);
          border:1px solid rgba(255,255,255,.07);
          margin-top:2px;
        }
        .lp-stat { display:flex;flex-direction:column;align-items:center;gap:2px; }
        .lp-stat-v { font-size:14px;font-weight:800;color:rgba(201,168,76,.95); }
        .lp-stat-l { font-size:10px;color:rgba(255,255,255,.28);letter-spacing:.06em; }
        .lp-stat-sep { width:1px;height:24px;background:rgba(255,255,255,.08); }

        /* ═══ DIVIDER ═════════════════════════════════════════════════ */
        .lp-sep { display:flex;align-items:center;gap:14px;padding:0 50px; }
        .lp-sep-l { flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07)); }
        .lp-sep-r { flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.07),transparent); }
        .lp-sep-dots { display:flex;gap:5px;align-items:center; }
        .lp-d  { width:4px;height:4px;border-radius:50%;background:rgba(201,168,76,.32); }
        .lp-dc { width:8px;height:8px;border-radius:50%;background:rgba(201,168,76,1);animation:dotBounce 2.8s ease-in-out infinite;box-shadow:0 0 10px rgba(201,168,76,.65); }

        /* ═══ FORM ════════════════════════════════════════════════════ */
        .lp-form { padding:28px 50px 46px;display:flex;flex-direction:column;gap:18px; }
        .lp-lbl { display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.42);margin-bottom:9px; }
        .lp-iw  { position:relative; }
        .lp-ico { position:absolute;top:50%;transform:translateY(-50%);left:16px;width:16px;height:16px;pointer-events:none;transition:color .25s,filter .25s;color:rgba(255,255,255,.18); }
        .lp-ico.on { color:rgba(201,168,76,.92);filter:drop-shadow(0 0 7px rgba(201,168,76,.55)); }
        .lp-inp {
          width:100%;height:54px;border-radius:16px;
          padding:0 16px 0 50px;font-size:14px;color:white;
          background:rgba(255,255,255,.048);
          border:1px solid rgba(255,255,255,.08);
          outline:none;
          transition:border-color .25s,box-shadow .25s,background .25s;
          -webkit-appearance:none;
        }
        .lp-inp::placeholder { color:rgba(255,255,255,.18); }
        .lp-inp:focus {
          background:rgba(255,255,255,.09);
          border-color:rgba(201,168,76,.68);
          box-shadow:0 0 0 3.5px rgba(201,168,76,.15),0 0 32px rgba(201,168,76,.08),inset 0 1px 0 rgba(255,255,255,.07);
        }
        .lp-inp:disabled { opacity:.38;cursor:not-allowed; }

        /* ═══ BUTTON ══════════════════════════════════════════════════ */
        .lp-btn {
          width:100%;height:56px;border-radius:16px;border:none;cursor:pointer;
          font-size:15px;font-weight:800;letter-spacing:.08em;color:#07101e;
          display:flex;align-items:center;justify-content:center;gap:10px;
          position:relative;overflow:hidden;
          background:linear-gradient(110deg,#9a6e1c 0%,#c9a84c 14%,#e8c85e 32%,#f8e478 50%,#e8c85e 68%,#c9a84c 86%,#9a6e1c 100%);
          background-size:280% auto;
          animation:btnShimmer 4.2s linear infinite;
          box-shadow:0 8px 38px rgba(201,168,76,.48),0 2px 10px rgba(0,0,0,.4),inset 0 1.5px 0 rgba(255,255,255,.32);
          transition:transform .15s ease,box-shadow .25s ease,opacity .2s;
          margin-top:4px;
        }
        .lp-btn::before {
          content:'';position:absolute;top:0;bottom:0;width:90px;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.38),transparent);
          animation:btnShine 4.2s ease-in-out infinite;
        }
        .lp-btn::after {
          content:'';position:absolute;inset:0;
          background:linear-gradient(142deg,rgba(255,255,255,.2) 0%,transparent 50%);
        }
        .lp-btn:hover:not(:disabled) {
          transform:translateY(-3px);
          box-shadow:0 18px 52px rgba(201,168,76,.68),0 4px 16px rgba(0,0,0,.42),inset 0 1.5px 0 rgba(255,255,255,.34);
        }
        .lp-btn:active:not(:disabled) { transform:translateY(0); }
        .lp-btn:disabled { opacity:.52;cursor:not-allowed;animation:none; }
        .lp-btn:disabled::before { display:none; }

        /* Security tag */
        .lp-sec {
          display:flex;align-items:center;justify-content:center;gap:6px;
          font-size:11px;color:rgba(255,255,255,.22);letter-spacing:.04em;
        }
      `}</style>

      <div className="lp">
        <div aria-hidden className="lp-bg" />
        <div aria-hidden className="lp-grid" />
        <div aria-hidden className="lp-scan" />

        {/* Orbs */}
        <div aria-hidden className="lp-orb o1" />
        <div aria-hidden className="lp-orb o2" />
        <div aria-hidden className="lp-orb o3" />
        <div aria-hidden className="lp-orb o4" />
        <div aria-hidden className="lp-orb o5" />

        {/* Stars */}
        {STARS.map(([top, left, size, delay, dur], i) => (
          <div key={`s${i}`} aria-hidden style={{
            position:"fixed", top:`${top}%`, left:`${left}%`,
            width:size, height:size, borderRadius:"50%", background:"white", pointerEvents:"none",
            animationName:"starFade", animationDuration:dur, animationDelay:delay,
            animationIterationCount:"infinite", animationTimingFunction:"ease-in-out",
          }} />
        ))}

        {/* Shooting meteors */}
        {METEORS.map((m, i) => (
          <div key={`m${i}`} aria-hidden className="lp-meteor" style={{
            top:m.top, width:m.w,
            animationName:"meteor", animationDuration:m.dur, animationDelay:m.delay,
            animationIterationCount:"infinite", animationTimingFunction:"ease-in-out",
          }} />
        ))}

        {/* Particles */}
        {PARTICLES.map((p, i) => (
          <div key={`p${i}`} aria-hidden style={{
            position:"fixed", bottom:"-20px", left:p.l,
            width:p.s, height:p.s, borderRadius:"50%", background:p.c, pointerEvents:"none",
            ["--pd" as string]:p.dr,
            animationName:"particle", animationDuration:p.d, animationDelay:p.dl,
            animationIterationCount:"infinite", animationTimingFunction:"linear",
          }} />
        ))}

        {/* ── CARD ─────────────────────────────────────────────── */}
        <div className="lp-card">
          <div className="lp-topline" />
          <div className="lp-sideline-l" />
          <div className="lp-sideline-r" />
          <div className="lp-inner-shine" />
          <div className="lp-noise" />

          {/* Hero */}
          <div className="lp-hero">
            <div className="lp-rings">
              <div className="lp-r r4" />
              <div className="lp-r r3" />
              <div className="lp-r r2" />
              <div className="lp-r r1" />
              <div className="lp-logo">
                <div className="logo-corner lc-tl" />
                <div className="logo-corner lc-br" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/tab-logo-ps.png" alt="Hollandia"
                  style={{ height:58, width:"auto", objectFit:"contain", position:"relative", zIndex:1 }} />
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
              <p className="lp-eyebrow">ברוכים הבאים לפורטל</p>
              <h1 className="lp-title">הולנדיה</h1>
              <p className="lp-desc">
                מערכת ניהול פנימית —{" "}
                <span style={{ fontFamily:"Inter,sans-serif", fontWeight:400, letterSpacing:"-.01em" }}>
                  <span style={{ color:"#fff" }}>target</span><span style={{ color:"#4096ff" }}>call</span>
                </span>
              </p>

              {/* Stats strip */}
              <div className="lp-stats">
                <div className="lp-stat"><span className="lp-stat-v">9</span><span className="lp-stat-l">סניפים</span></div>
                <div className="lp-stat-sep" />
                <div className="lp-stat"><span className="lp-stat-v">AI</span><span className="lp-stat-l">מנטור</span></div>
                <div className="lp-stat-sep" />
                <div className="lp-stat"><span className="lp-stat-v">CRM</span><span className="lp-stat-l">ניהול</span></div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="lp-sep">
            <div className="lp-sep-l" />
            <div className="lp-sep-dots">
              <div className="lp-d" /><div className="lp-dc" /><div className="lp-d" />
            </div>
            <div className="lp-sep-r" />
          </div>

          {/* Form */}
          <div className="lp-form">
            <form onSubmit={handleSubmit} noValidate style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label htmlFor="username" className="lp-lbl">שם משתמש</label>
                <div className="lp-iw">
                  <User className={`lp-ico ${focused==="username"?"on":""}`} />
                  <input id="username" type="text" dir="ltr" placeholder="username"
                    value={username} onChange={e=>setUsername(e.target.value)}
                    onFocus={()=>setFocused("username")} onBlur={()=>setFocused(null)}
                    autoComplete="username" required disabled={loading} className="lp-inp" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="lp-lbl">סיסמה</label>
                <div className="lp-iw">
                  <Lock className={`lp-ico ${focused==="password"?"on":""}`} />
                  <input id="password" type="password" dir="ltr" placeholder="••••••••"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    onFocus={()=>setFocused("password")} onBlur={()=>setFocused(null)}
                    autoComplete="current-password" required disabled={loading} className="lp-inp" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="lp-btn" style={{ marginTop:6 }}>
                {loading
                  ? <><Loader2 style={{ width:18, height:18, animation:"spinIcon 1s linear infinite" }} />מתחבר...</>
                  : <><LogIn style={{ width:18, height:18 }} />כניסה למערכת</>
                }
              </button>

            </form>
          </div>
        </div>

        <p style={{ position:"relative", fontSize:11, color:"rgba(255,255,255,0.15)", textAlign:"center" }}>
          נוצר ע&quot;י דניאל צ&#39;רבוני — 0544452558
        </p>
      </div>
    </>
  );
}
