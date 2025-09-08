import { useCallback, useMemo, useState } from "react";
import { ToastCtx } from "./ToastContext.js";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, kind = "info", ms = 2200) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ms);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-2 rounded-xl text-sm backdrop-blur"
            style={{
              color: "#fff",
              background:
                t.kind === "error"
                  ? "rgba(239,68,68,0.9)"
                  : t.kind === "success"
                  ? "rgba(34,197,94,0.9)"
                  : "rgba(30,41,59,0.9)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
