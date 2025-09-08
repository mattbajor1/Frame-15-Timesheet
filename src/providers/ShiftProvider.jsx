// src/providers/ShiftProvider.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { ShiftCtx } from "../contexts/ShiftContext.js";
import { useToast } from "../components/ToastContext.js";

export default function ShiftProvider({ email, children }) {
  const { show: showToast } = useToast();

  const [active, setActive] = useState(null);
  const [today, setToday] = useState(0);
  const [week, setWeek] = useState(0);
  const busyRef = useRef(false);

  const cacheKey = useMemo(() => `f15:shift:${email}`, [email]);

  const paintFromCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) setActive(JSON.parse(raw));
    } catch { /* empty */ }
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    if (!email) return;
    try {
      const s = await api.shiftSummary(email);
      setActive(s.active || null);
      setToday(Number(s.todayHours || 0));
      setWeek(Number(s.weekHours || 0));
      if (s.active) localStorage.setItem(cacheKey, JSON.stringify(s.active));
      else localStorage.removeItem(cacheKey);
    } catch {
      // keep optimistic cache if API is slow
      paintFromCache();
    }
  }, [email, cacheKey, paintFromCache]);

  useEffect(() => {
    paintFromCache();
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh, paintFromCache]);

  useEffect(() => {
    if (!email) {
      setActive(null);
      setToday(0);
      setWeek(0);
    }
  }, [email]);

  const start = useCallback(async () => {
    if (busyRef.current || active) return;
    busyRef.current = true;
    const fake = { inISO: new Date().toISOString() };
    setActive(fake);
    localStorage.setItem(cacheKey, JSON.stringify(fake));
    try {
      await api.startShift();
      showToast("Clocked in", "success");
      await refresh();
    } catch (e) {
      setActive(null);
      localStorage.removeItem(cacheKey);
      showToast(`Clock in failed: ${e?.message || e}`, "error", 4000);
    } finally {
      busyRef.current = false;
    }
  }, [active, cacheKey, refresh, showToast]);

  const stop = useCallback(async () => {
    if (busyRef.current || !active) return;
    busyRef.current = true;
    setActive(null);
    localStorage.removeItem(cacheKey);
    try {
      await api.stopShift();
      showToast("Clocked out", "success");
      await refresh();
    } catch (e) {
      showToast(`Clock out failed: ${e?.message || e}`, "error", 4000);
      await refresh();
    } finally {
      busyRef.current = false;
    }
  }, [active, cacheKey, refresh, showToast]);

  const value = useMemo(
    () => ({ active, today, week, start, stop, refresh }),
    [active, today, week, start, stop, refresh]
  );

  return <ShiftCtx.Provider value={value}>{children}</ShiftCtx.Provider>;
}
