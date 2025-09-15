// src/App.jsx
import { useEffect, useState } from "react";
import Home from "./pages/Home.jsx";
import Projects from "./pages/Projects.jsx";
import Work from "./pages/Work.jsx";
import Insights from "./pages/Insights.jsx";
import Inventory from "./pages/Inventory.jsx";
import Invoices from "./pages/Invoices.jsx";
import "./index.css";
import { api } from "./lib/api.js";

function useLocalState(key, initial){
  const [v,setV] = useState(()=>{
    try{ const j = localStorage.getItem(key); return j?JSON.parse(j):initial; }catch{return initial;}
  });
  useEffect(()=>{ localStorage.setItem(key, JSON.stringify(v)); }, [key,v]);
  return [v,setV];
}

function GoogleButton({ onEmail }){
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useEffect(()=>{
    if(!clientId) return;
    // Load Google Identity Services script
    const id = "google-identity";
    if(document.getElementById(id)) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.id = id;
    document.head.appendChild(s);
  },[clientId]);

  useEffect(()=>{
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if(!clientId || !(window).google?.accounts?.id) return;
    const google = (window).google;
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp)=>{
        try{
          const payload = JSON.parse(atob(resp.credential.split(".")[1]));
          const email = payload?.email;
          if(email){ onEmail(email); }
        }catch{ /* ignore */ }
      }
    });
    const el = document.getElementById("google-signin-btn");
    if(el) google.accounts.id.renderButton(el, { theme:"outline", size:"large" });
  });

  if(!clientId) return null;
  return <div id="google-signin-btn" />;
}

function Nav({ page, setPage, email, onSignOut }){
  const tabs = [
    { k:"home", label:"Home" },
    { k:"projects", label:"Projects" },
    { k:"work", label:"Work" },
    { k:"insights", label:"Insights" },
    { k:"inventory", label:"Inventory" },
    { k:"invoices", label:"Invoices" },
  ];
  return (
    <div className="navbar">
      <div className="nav-inner">
        <div className="h3">Frame 15 — Internal</div>
        <div className="nav-tabs">
          {tabs.map(t=>(
            <button key={t.k} className={`tab ${page===t.k?"active":""}`} onClick={()=>setPage(t.k)}>{t.label}</button>
          ))}
        </div>
        <div style={{flex:1}} />
        <div className="badge">{email || "signed out"}</div>
        {email ? (
          <button className="btn ghost" onClick={onSignOut}>Sign out</button>
        ) : null}
      </div>
    </div>
  );
}

export default function App(){
  const [page, setPage] = useLocalState("f15:page","home");
  const [user,setUser] = useLocalState("f15:user",{ email:"", name:"", role:"" });
  const [diag, setDiag] = useState({ ok:true, msg:"" });

  // Try auto-diagnose API
  useEffect(()=>{
    (async ()=>{
      try{
        const p = await api.ping();
        if(p?.ok === false) throw new Error(p.error || "Ping failed");
        setDiag({ ok:true, msg:`API OK` });
      }catch(e){
        setDiag({ ok:false, msg:String(e?.message || e) });
      }
    })();
  },[]);

  function onSetEmail(email){
    const u = { ...user, email };
    setUser(u);
    localStorage.setItem("f15:user", JSON.stringify(u));
  }
  function signOut(){
    setUser({ email:"", name:"", role:"" });
    localStorage.removeItem("f15:user");
  }

  // Guard: require email for app features
  if(!user.email){
    return (
      <div className="center">
        <div className="card" style={{ width: 520, maxWidth: "100%" }}>
          <div className="h2" style={{ marginBottom: 6 }}>Sign in</div>
          <div className="muted" style={{ marginBottom: 14 }}>Use your work email (@frame15.com). If Google sign-in is configured, you can also click the button below.</div>

          {/* Email form */}
          <div className="grid" style={{ gap: 10 }}>
            <div className="row">
              <input placeholder="you@frame15.com" onKeyDown={(e)=>{
                if(e.key==="Enter"){
                  const v = e.currentTarget.value.trim();
                  if(!v || !v.includes("@")) return alert("Please enter a valid email.");
                  onSetEmail(v);
                }
              }} />
              <button className="btn primary" onClick={()=>{
                const el = document.querySelector('input[placeholder="you@frame15.com"]');
                const v = (el?.value || "").trim();
                if(!v || !v.includes("@")) return alert("Please enter a valid email.");
                onSetEmail(v);
              }}>Continue</button>
            </div>

            {/* Google Sign-In (if VITE_GOOGLE_CLIENT_ID is set) */}
            <GoogleButton onEmail={onSetEmail} />
          </div>

          {/* Diagnostics */}
          <div className="hr" />
          <div className="muted" style={{ fontSize: 12 }}>
            API: {diag.ok ? "OK" : "Error"} {diag.msg ? `— ${diag.msg}` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav page={page} setPage={setPage} email={user.email} onSignOut={signOut} />
      <div className="container">
        {!diag.ok && (
          <div className="card section-orange" style={{ marginBottom: 12 }}>
            <div className="h3">Connection issue</div>
            <div className="muted">{diag.msg}</div>
          </div>
        )}
        {page==="home" && <Home />}
        {page==="projects" && <Projects />}
        {page==="work" && <Work />}
        {page==="insights" && <Insights />}
        {page==="inventory" && <Inventory />}
        {page==="invoices" && <Invoices />}
      </div>
    </div>
  );
}
