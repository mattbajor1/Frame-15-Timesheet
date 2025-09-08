// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // Tailwind v4 entry + your custom styles

// Toasts (split files to keep Fast Refresh happy)
import ToastProvider from "./components/ToastProvider.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
