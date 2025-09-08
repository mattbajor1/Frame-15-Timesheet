// src/App.jsx
import { useState } from "react";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import Insights from "./pages/Insights";

export default function App() {
  const [page, setPage] = useState("home");
  const [email, setEmail] = useState("");

  return (
    <Shell page={page} setPage={setPage} onEmail={setEmail}>
      {page === "home" && <Home email={email} setPage={setPage} />}
      {page === "projects" && <Projects email={email} />}
      {page === "insights" && <Insights email={email} />}
    </Shell>
  );
}
