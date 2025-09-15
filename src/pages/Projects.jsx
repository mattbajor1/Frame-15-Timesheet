import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";

// Normalize server → UI task shape
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

export default function Project() {
  const { id } = useParams(); // e.g. "P - 1000"
  const projectNumber = decodeURIComponent(id || "").trim();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const j = await api.projectDetails(projectNumber);
      if (j?.ok === false) throw new Error(j.error || "Failed to load project");
      setProject(j.project);
      setTasks(normalizeTasks(j.tasks || []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectNumber]);

  async function onAddTask() {
    const text = taskText.trim();
    if (!text || savingTask) return;
    setSavingTask(true);
    try {
      const res = await api.addTask({
        projectNumber,
        taskName: text, // backend accepts taskName/name/title/task
      });

      // Prefer the server-echoed task to avoid shape drift
      if (res?.task) {
        const t = normalizeTasks([res.task])[0];
        setTasks((prev) => [t, ...prev]); // show immediately
      } else {
        await load(); // fallback (older backends)
      }
      setTaskText("");
    } catch (e) {
      alert(`Add task failed: ${e?.message || e}`);
    } finally {
      setSavingTask(false);
    }
  }

  if (loading) return <div className="p-6 opacity-70">Loading…</div>;
  if (!project) return <div className="p-6 text-red-400">Project not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link to="/projects" className="text-sm opacity-75 hover:opacity-100">
          ← Back
        </Link>
      </div>

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{project.number}</h1>
        <div className="opacity-70">{project.client || ""}</div>
      </header>

      {/* ----- details form kept simple (your existing styles will still apply) ----- */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 p-4">
          <div className="font-medium mb-3">Name</div>
          <input
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            defaultValue={project.name || ""}
            readOnly
          />
          <div className="font-medium mt-4 mb-2">Notes</div>
          <textarea
            className="w-full min-h-[120px] rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            defaultValue={project.notes || ""}
            readOnly
          />
        </div>

        <div className="rounded-2xl border border-white/10 p-4">
          <div className="font-medium mb-3">Meta</div>
          <div className="text-sm opacity-70">Status: {project.status || "Active"}</div>
          <div className="text-sm opacity-70">Budget (hrs): {project.budgetHours || 0}</div>
          <div className="text-sm opacity-70">Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</div>
          <div className="text-sm opacity-70">Due: {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}</div>
        </div>
      </section>

      {/* ----- Tasks + People Hours (layout matches your screenshot) ----- */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="rounded-2xl border border-white/10 p-4">
          <div className="font-medium mb-3">Tasks</div>
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2"
              placeholder="Add a task and press Enter"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddTask();
                }
              }}
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
                  className="rounded-lg border border-white/10 px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{t.taskName || t.name}</div>
                    <div className="text-xs opacity-70">
                      {(t.status || "Backlog") + " · " + (t.priority || "Med")}
                      {t.dueISO ? ` · due ${new Date(t.dueISO).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* People - hours (kept as a placeholder to preserve your layout) */}
        <div className="rounded-2xl border border-white/10 p-4">
          <div className="font-medium mb-3">People · hours</div>
          <div className="text-sm opacity-70">No time logged yet.</div>
        </div>
      </section>
    </div>
  );
}
