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

export default function App(){
  const [page, setPage] = useLocalState("f15:page","home");
  const [user,setUser]   = useLocalState("f15:user",{ email:"", name:"", role:"" });
  const [err,setErr] = useState("");

  useEffect(()=>{
    (async ()=>{
      if(!import.meta.env.VITE_API_URL){ setErr("Missing VITE_API_URL"); return; }
      if(!import.meta.env.VITE_API_KEY){ setErr("Missing VITE_API_KEY"); return; }
      try{
        const pong = await api.ping();
        if(!pong.ok) setErr(pong.error||"Ping failed");
      }catch(e){ setErr(String(e.message||e)); }
    })();
  },[]);

  function Nav(){
    const tabs = [
      ["home","Home"],["projects","Projects"],["work","Work"],
      ["insights","Insights"],["inventory","Inventory"],["invoices","Invoices"]
    ];
    return (
      <div className="nav">
        <div className="container" style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontWeight:700, letterSpacing:.6}}>Frame 15 • Internal</div>
          <div style={{flex:1}} />
          <div className="tabs" style={{display:"flex",gap:6}}>
            {tabs.map(([k,label])=> (
              <button key={k} onClick={()=>setPage(k)} className={k===page?"active":""}>{label}</button>
            ))}
          </div>
          <div style={{flex:1}} />
          <div className="row" style={{maxWidth:420}}>
            <input placeholder="your@email" value={user.email||""} onChange={e=>setUser({...user,email:e.target.value})} />
            <button className="btn primary" onClick={()=>localStorage.setItem("f15:user", JSON.stringify(user))}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav />
      <div className="container">
        {err && <div className="card" style={{borderColor:"#b91c1c"}}><b>Connection error</b><div className="muted">{err}</div></div>}
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
