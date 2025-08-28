import { useEffect, useState } from "react";
import Shell from "./components/Shell";
import Work from "./pages/Work";
import Projects from "./pages/Projects";
import Insights from "./pages/Insights";

export default function App(){
  const [page, setPage] = useState("work");
  const [email, setEmail] = useState("");

  useEffect(()=>{
    const u = localStorage.getItem("f15:user");
    if(u) setEmail(JSON.parse(u).email || "");
  },[]);

  return (
    <Shell page={page} setPage={setPage} onEmail={setEmail}>
      {page==='work'     && <Work email={email} />}
      {page==='projects' && <Projects />}
      {page==='insights' && <Insights />}
    </Shell>
  );
}
