import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

export default function Invoices() {
  const [projectNumber, setProjectNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [invoices, setInvoices] = useState([]);

  const pn = useMemo(() => projectNumber.trim(), [projectNumber]);

  async function refreshList() {
    if (!pn || !api?.listInvoices) {
      setInvoices([]);
      return;
    }
    try {
      const res = await api.listInvoices(pn);
      setInvoices(Array.isArray(res) ? res : []);
    } catch (err) {
      console.warn("listInvoices failed:", err);
      setInvoices([]);
    }
  }

  async function handleBuild() {
    if (!pn) return;
    setErrorMsg("");
    setLoading(true);
    setPreview(null);

    try {
      if (!api?.buildInvoice) {
        throw new Error(
          "api.buildInvoice(projectNumber) is not implemented. Add it in src/lib/api.js."
        );
      }
      const data = await api.buildInvoice(pn);
      setPreview(data ?? { ok: true, note: "No data returned from API." });
      await refreshList();
    } catch (err) {
      setErrorMsg(err?.message || "Failed to build invoice.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load any existing invoices for the typed project
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pn]);

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Invoices</h2>

      {/* Project Number Input */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="pn" style={{ fontWeight: 600, minWidth: 140 }}>
          Project Number
        </label>
        <input
          id="pn"
          placeholder="e.g. F15-2025-001"
          value={projectNumber}
          onChange={(e) => setProjectNumber(e.target.value)}
          style={{
            padding: "8px 10px",
            minWidth: 240,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
        <button
          onClick={handleBuild}
          disabled={!pn || loading}
          style={{
            padding: "8px 12px",
            border: "1px solid #111",
            borderRadius: 8,
            background: loading ? "#eee" : "#111",
            color: loading ? "#111" : "#fff",
            cursor: !pn || loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Building…" : "Build Invoice"}
        </button>
      </div>

      {/* Errors */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: 600,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <section
          aria-label="Invoice Preview"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 12,
            overflow: "auto",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      )}

      {/* Existing Invoices */}
      <section
        aria-label="Existing Invoices"
        style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Existing invoices for this project</div>
          <button
            onClick={refreshList}
            disabled={!pn || loading}
            title="Refresh list"
            style={{
              padding: "4px 8px",
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#f9fafb",
              cursor: !pn || loading ? "not-allowed" : "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {!pn ? (
          <div style={{ marginTop: 8, color: "#6b7280" }}>Enter a project number.</div>
        ) : invoices.length === 0 ? (
          <div style={{ marginTop: 8, color: "#6b7280" }}>No invoices found.</div>
        ) : (
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            {invoices.map((iv) => (
              <li key={iv.id ?? iv.invoiceNumber ?? Math.random()}>
                <strong>{iv.invoiceNumber ?? iv.id ?? "Invoice"}</strong>{" "}
                {iv.date ? `— ${iv.date}` : ""}{" "}
                {iv.total != null ? `— $${Number(iv.total).toFixed(2)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footnote if API missing */}
      {!api?.buildInvoice && (
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          <em>Note:</em> Expected <code>api.buildInvoice(projectNumber)</code> is missing. Add it
          in <code>src/lib/api.js</code>.
        </div>
      )}
    </div>
  );
}
