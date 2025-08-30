import { useState } from "react";
import Shell from "./components/Shell.jsx";
import Work from "./pages/Work.jsx";
import Projects from "./pages/Projects.jsx";
import Insights from "./pages/Insights.jsx";

export default function App(){
  const [page, setPage] = useState("projects");
  const [email, setEmail] = useState("");

  return (
    <Shell page={page} setPage={setPage} onEmail={setEmail}>
      {page === "work" && <Work email={email} />}
      {page === "projects" && <Projects />}
      {page === "insights" && <Insights />}
    </Shell>
  );
}
