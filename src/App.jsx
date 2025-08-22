import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'

const TimeTracker = lazy(() => import('./TimeTracker.jsx'))
const ProjectsAdmin = lazy(() => import('./ProjectsAdmin.jsx'))

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <NavLink to="/" className="font-semibold">Frame 15 – Internal</NavLink>
          <nav className="text-sm flex items-center gap-4">
            <NavLink to="/time" className={({isActive}) => isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}>Time</NavLink>
            <NavLink to="/projects" className={({isActive}) => isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}>Projects</NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}

function Home() {
  return (
    <Shell>
      <div className="py-24 text-center space-y-3">
        <h1 className="text-4xl font-semibold">Internal Tools</h1>
        <p className="text-neutral-400">Private site for tracking projects and time</p>
        <div className="flex justify-center gap-3 mt-4">
          <Link to="/time" className="rounded-lg border border-neutral-700 px-4 py-2 hover:bg-neutral-900/70">Open Time Tracker</Link>
          <Link to="/projects" className="rounded-lg border border-neutral-700 px-4 py-2 hover:bg-neutral-900/70">Manage Projects</Link>
        </div>
      </div>
    </Shell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/time" element={
          <Suspense fallback={<div className="text-neutral-400">Loading…</div>}>
            <Shell><TimeTracker /></Shell>
          </Suspense>
        } />
        <Route path="/projects" element={
          <Suspense fallback={<div className="text-neutral-400">Loading…</div>}>
            <Shell><ProjectsAdmin /></Shell>
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  )
}
