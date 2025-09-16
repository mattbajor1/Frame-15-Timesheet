import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

// ---------- local cache for snappy UX ----------
const LS_TASKS = "f15:tasksByProject";

function loadTasksCache() {
  try { return JSON.parse(localStorage.getItem(LS_TASKS) || "{}"); } catch { return {}; }
}
function saveTasksCache(map) {
  try { localStorage.setItem(LS_TASKS, JSON.stringify(map)); } catch { /* empty */ }
}

// ---------- normalizers (tolerant to column names) ----------
function normalizeProjects(arr) {
  return (arr || [])
    .map((p) => ({
      number: String(p.number || p.projectNumber || "").trim(),
      name: String(p.name || p.projectName || "").trim(),
      client: String(p.client || "").trim(),
      status: String(p.status || "Active").trim(),
      startDate: p.startDate || "",
      dueDate: p.dueDate || "",
      budgetHours: Number(p.budgetHours || 0),
      notes: String(p.notes || ""),
    }))
    .filter((p) => p.number);
}
function normalizeTasks(arr) {
  return (arr || [])
    .map((t) => ({
      id: t.id || t.ID || t.taskId || t.TaskID,
      projectNumber: t.projectNumber || t.ProjectNumber,
      taskName: t.taskName || t.name || t.title || t.TaskName || "",
      name: t.taskName || t.name || t.title || t.TaskName || "",
      assignee: t.assigneeEmail || t.assignee || t.AssigneeEmail || "",
      priority: t.priority || "Med",
      status: t.status || "Backlog",
      dueISO: t.dueISO || t.dueDate || "",
      progress: Number(t.progress || 0),
    }))
    .filter((t) => t.projectNumber && t.name);
}

// ---------- pure Apps Script data layer ----------
async function fetchProjects() {
  const j = await api.lists();               // { projects, tasks, users, ok:true }
  if (j?.ok === false) throw new Error(j.error || "Failed to load projects");
  return normalizeProjects(j.projects || []);
}
async function fetchTasksForProject(pn) {
  const j = await api.projectDetails(pn);    // { ok:true, project, tasks, time }
  if (j?.ok === false) throw new Error(j.error || "Failed to load tasks");
  return normalizeTasks(j.tasks || []);
}
async function addTaskToProject(pn, text) {
  const res = await api.addTask({ projectNumber: pn, taskName: text });
  if (res?.task) return normalizeTasks([res.task])[0];
  // Older server shape: res.id only → synthesize minimal object
  return {
    id: res?.id || `tmp-${Date.now()}`,
    projectNumber: pn,
    taskName: text,
    name: text,
    status: "Backlog",
    priority: "Med",
    progress: 0,
  };
}

export default function Projects() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedPN, setSelectedPN] = useState("");
  const [projectMeta, setProjectMeta] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [tasksByProject, setTasksByProject] = useState(loadTasksCache());

  const [taskText, setTaskText] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [error, setError] = useState("");

  // Initial: load projects
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const proj = await fetchProjects();
        if (!alive) return;
        setProjects(proj);
        if (proj.length && !selectedPN) setSelectedPN(proj[0].number);
      } catch (e) {
        if (!alive) return;
        setError(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selecting a project: show cached tasks instantly, then refresh from server
  useEffect(() => {
    if (!selectedPN) { setProjectMeta(null); setTasks([]); return; }
    let alive = true;
    (async () => {
      setError("");
      // 1) instant: cached
      const cached = tasksByProject[selectedPN] || [];
      setTasks(cached);
      // 2) fetch fresh tasks + details
      try {
        const [fresh, details] = await Promise.all([
          fetchTasksForProject(selectedPN),
          api.projectDetails(selectedPN).catch(() => null),
        ]);
        if (!alive) return;
        setTasks(fresh);
        const nextMap = { ...tasksByProject, [selectedPN]: fresh };
        setTasksByProject(nextMap);
        saveTasksCache(nextMap);
        setProjectMeta(details?.project || { number: selectedPN });
      } catch (e) {
        if (!alive) return;
        setProjectMeta({ number: selectedPN });
        setError((prev) => prev || String(e?.message || e));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPN]);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.number.localeCompare(b.number)),
    [projects]
  );

  async function onAddTask() {
    const text = taskText.trim();
    if (!text || savingTask || !selectedPN) return;

    // Optimistic add (instant UI)
    const optimistic = {
      id: `tmp-${Date.now()}`,
      projectNumber: selectedPN,
      taskName: text,
      name: text,
      status: "Backlog",
      priority: "Med",
      progress: 0,
      _optimistic: true,
    };
    setTasks((prev) => [optimistic, ...prev]);
    const map1 = {
      ...tasksByProject,
      [selectedPN]: [optimistic, ...(tasksByProject[selectedPN] || [])],
    };
    setTasksByProject(map1);
    saveTasksCache(map1);
    setTaskText("");

    // Sync to backend
    setSavingTask(true);
    try {
      const created = await addTaskToProject(selectedPN, text);
      // Replace optimistic with real
      setTasks((prev) => [created, ...prev.filter((t) => t.id !== optimistic.id)]);
      const map2 = {
        ...map1,
        [selectedPN]: [created, ...(map1[selectedPN].filter((t) => t.id !== optimistic.id))],
      };
      setTasksByProject(map2);
      saveTasksCache(map2);
    } catch (e) {
      // Mark as failed (keeps the text visible so users don’t lose it)
      setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? { ...t, _failed: true } : t)));
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
          <div className="text-xs opacity-70 mt-1">
            Ensure you’re signed in (email in localStorage) and API key/domain match your Apps Script.
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Project list */}
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

        {/* Right: Details + Tasks */}
        <div className="rounded-2xl border border-white/10 p-4">
          {!selectedPN ? (
            <div className="opacity-70">Select a project to view details.</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs opacity-60">{projectMeta?.number || selectedPN}</div>
                  <div className="text-xl font-semibold">{projectMeta?.name || "(Untitled project)"}</div>
                  <div className="text-xs opacity-70 mt-1">{projectMeta?.client || ""}</div>
                </div>
                <div className="opacity-70">{projectMeta?.status || "Active"}</div>
              </div>

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
                    <li
                      key={t.id}
                      className={`rounded-lg border px-3 py-2 ${t._failed ? "border-red-500/60" : "border-white/10"}`}
                      title={t._failed ? "Failed to save to server" : ""}
                    >
                      <div className="font-medium">{t.taskName || t.name}</div>
                      <div className="text-xs opacity-70">
                        {(t.status || "Backlog") + " · " + (t.priority || "Med")}
                        {t._optimistic && " · saving…"}
                        {t._failed && " · failed to save"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
