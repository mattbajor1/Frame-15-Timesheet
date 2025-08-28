import { useEffect, useState } from "react";
import Shell from "./components/Shell";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Analytics from "./pages/Analytics";

export default function App(){
  const [page, setPage] = useState("dash");
  const [email, setEmail] = useState("");

  // Load persisted user email (from Shell's modal or previous sessions)
  useEffect(()=>{
    const stored = localStorage.getItem("f15:user");
    if(stored){
      const u = JSON.parse(stored);
      setEmail(u.email || "");
    }
  },[]);

  return (
    <Shell page={page} setPage={setPage}>
      {page==='dash'      && <Dashboard email={email} onEmail={(e)=>{ setEmail(e); localStorage.setItem("f15:user", JSON.stringify({ ...(JSON.parse(localStorage.getItem("f15:user")||"{}")), email:e })); }} />}
      {page==='projects'  && <Projects/>}
      {page==='tasks'     && <Tasks/>}
      {page==='analytics' && <Analytics/>}
    </Shell>
  );
}
