import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

// Helpers
function normalizeProjects(arr) {
  return (arr || []).map((p) => ({
    number: String(p.number || p.projectNumber || "").trim(),
    name: String(p.name || p.projectName || "").trim(),
    client: String(p.client || "").trim(),
    status: String(p.status || "Active").trim(),
    startDate: p.startDate || "",
    dueDate: p.dueDate || "",
    budgetHours: Number(p.budgetHours || 0),
    notes: String(p.notes || ""),
  })).filter(p => p.number);
}
function normalizeTasks(arr) {
  return (arr || []).map((t) => ({
    id: t.id,
    projectNumber: t.projectNumber,
    taskName: t.taskName || t.name || t.title || "",
    name: t.taskName || t.name || t.title || "",
    assignee: t.assigneeEmail || t.assignee || "",
    priority: t.priority || "Med",
    status: t.status || "Backlog",
    dueISO: t.dueISO || t.dueDate || "",
    progress: Number(t.progress || 0),
  }));
}

export default function Projects() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasksByProject, setTasksByProject] = useState({}); // fast initial display
  const [selectedPN, setSelectedPN] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState("");

  // Initial load: projects + tasks cache
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const j = await api.lists();
        if (j?.ok === false) throw new Error(j.error || "Failed to load projects");
        const proj = normalizeProjects(j.projects || []);
        const tasks = normalizeTasks(j.tasks || []);
        const grouped = tasks.reduce((acc, t) => {
          const pn = t.projectNumber || "";
          (acc[pn] ||= []).push(t);
          return acc;
        }, {});
        if (!alive) return;
        setProjects(proj);
        setTasksByProject(grouped);
        // Select first project by default
        if (proj.length && !selectedPN) setSelectedPN(proj[0].number);
      } catch (e) {
        if (!alive) return;
        setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [selectedPN]);

  // Whenever selected project changes, fetch fresh details (name/notes/time)
  useEffect(() => {
    if (!selectedPN) { setProject(null); setTasks([]); return; }
    let alive = true;
    async function loadDetails() {
      setDetailsLoading(true);
      setError("");
      try {
        const j = await api.projectDetails(selectedPN);
        if (j?.ok === false) throw new Error(j.error || "Failed to load project");
        if (!alive) return;
        setProject(j.project || null);
        // prefer server tasks; if empty fall back to cached grouping
        const serverTasks = normalizeTasks(j.tasks || []);
        setTasks(serverTasks.length ? serverTasks : (tasksByProject[selectedPN] || []));
      } catch (e) {
        if (!alive) return;
        // fall back to cached list if we have it
        setProject({ number: selectedPN, name: "", client: "", status: "Active", notes: "" });
        setTasks(tasksByProject[selectedPN] || []);
        setError(String(e?.message || e));
      } finally {
        if (alive) setDetailsLoading(false);
      }
    }
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPN]);

  // Derived for left list filter/sort (optional)
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.number.localeCompare(b.number));
  }, [projects]);

  async function onAddTask() {
    const text = taskText.trim();
    if (!text || savingTask || !selectedPN) return;
    setSavingTask(true);
    try {
      const res = await api.addTask({ projectNumber: selectedPN, taskName: text });
      // echo from server preferred
      let t = res?.task ? normalizeTasks([res.task])[0] : null;
      if (!t) {
        // fallback: refetch (older backend) or synthesize a minimal object
        try {
          const j = await api.projectDetails(selectedPN);
          const fresh = normalizeTasks(j.tasks || []);
          setTasks(fresh);
          setTasksByProject(prev => ({ ...prev, [selectedPN]: fresh }));
        } catch {
          t = { id: res?.id || `temp-${Date.now()}`, projectNumber: selectedPN, taskName: text, name: text, status: "Backlog", priority: "Med", progress: 0 };
          setTasks(prev => [t, ...prev]);
        }
      } else {
        setTasks(prev => [t, ...prev]);
        setTasksByProject(prev => ({ ...prev, [selectedPN]: [t, ...(prev[selectedPN] || [])] }));
      }
      setTaskText("");
    } catch (e) {
      alert(`Add task failed: ${e?.message || e}`);
    } finally {
      setSavingTask(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
      </header>

      {!!error && (
        <div className="text-red-400">
          {error}
          <div className="text-xs opacity-70 mt-1">Make sure you’re signed in and your email domain is allowed.</div>
        </div>
      )}

      {/* Two-column layout: list (left) · details (right) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: project list */}
        <div className="rounded-2xl border border-white/10">
          <div className="p-4 font-medium border-b border-white/10">All projects</div>
          {loading ? (
            <div className="p-4 opacity-70">Loading…</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {sortedProjects.map((p) => {
                const active = p.number === selectedPN;
                return (
                  <li key={p.number}>
                    <button
                      className={`w-full text-left p-3 hover:bg-white/5 ${active ? "bg-white/10" : ""}`}
                      onClick={() => setSelectedPN(p.number)}
                      title={p.client || ""}
                    >
                      <div className="text-xs opacity-60">{p.number}</div>
                      <div className="font-medium">{p.name || "(Untitled)"}</div>
                      <div className="text-xs opacity-70">{p.status}</div>
                    </button>
                  </li>
                );
              })}
              {sortedProjects.length === 0 && (
                <li className="p-3 text-sm opacity-70">No projects yet.</li>
              )}
            </ul>
          )}
        </div>

        {/* Right: selected project details */}
        <div className="rounded-2xl border border-white/10 p-4">
          {!selectedPN ? (
            <div className="opacity-70">Select a project to view details.</div>
          ) : detailsLoading && !project ? (
            <div className="opacity-70">Loading project…</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs opacity-60">{project?.number || selectedPN}</div>
                  <div className="text-xl font-semibold">{project?.name || "(Untitled project)"}</div>
                  <div className="text-xs opacity-70 mt-1">{project?.client || ""}</div>
                </div>
                <div className="opacity-70">{project?.status || "Active"}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="font-medium mb-2">Notes</div>
                  <div className="rounded-lg bg-black/30 border border-white/10 p-3 min-h-[100px] whitespace-pre-wrap">
                    {project?.notes || "—"}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-2">Meta</div>
                  <div className="text-sm opacity-70">Budget (hrs): {project?.budgetHours || 0}</div>
                  <div className="text-sm opacity-70">Start: {project?.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</div>
                  <div className="text-sm opacity-70">Due: {project?.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="font-medium mb-3">Tasks</div>
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2"
                    placeholder="Add a task and press Enter"
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddTask(); } }}
                  />
                  <button
                    className="rounded-lg px-4 py-2 bg-white text-black disabled:opacity-50"
                    disabled={savingTask}
                    onClick={onAddTask}
                  >
                    Add
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="text-sm opacity-70">No tasks yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {tasks.map((t) => (
                      <li key={t.id} className="rounded-lg border border-white/10 px-3 py-2">
                        <div className="font-medium">{t.taskName || t.name}</div>
                        <div className="text-xs opacity-70">
                          {(t.status || "Backlog") + " · " + (t.priority || "Med")}
                          {t.dueISO ? ` · due ${new Date(t.dueISO).toLocaleDateString()}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
