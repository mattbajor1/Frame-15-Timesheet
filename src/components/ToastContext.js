import { createContext, useContext } from "react";

// Context only (no components exported here)
export const ToastCtx = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}
