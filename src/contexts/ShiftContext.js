import { createContext, useContext } from "react";
export const ShiftCtx = createContext({
  active: null, today: 0, week: 0,
  start: async () => {}, stop: async () => {}, refresh: async () => {},
});
export const useShift = () => useContext(ShiftCtx);
