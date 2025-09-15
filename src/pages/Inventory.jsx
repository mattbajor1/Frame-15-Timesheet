// src/pages/Inventory.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    category: "Cameras",
    name: "",
    sku: "",
    condition: "Good",
    qtyTotal: 1,
    qtyAvail: 1,
    dailyRate: 0,
    notes: "",
  });

  async function load() {
    setErr("");
    setLoading(true);
    try {
      if (!api?.listInventory) {
        throw new Error("api.listInventory() is not implemented in src/lib/api.js");
      }
      const res = await api.listInventory();
      // Expecting { items: [...] }
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Failed to load inventory");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const it of items) {
      const cat = it.category || "Uncategorized";
      if (!m.has(cat)) m.set(cat, []);
      m.get(cat).push(it);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  async function addItem() {
    if (!form.name) {
      alert("Item name required");
      return;
    }
    try {
      if (!api?.addInventory) {
        throw new Error("api.addInventory(form) is not implemented in src/lib/api.js");
      }
      await api.addInventory(form);
      setForm({
        category: form.category,
        name: "",
        sku: "",
        condition: "Good",
        qtyTotal: 1,
        qtyAvail: 1,
        dailyRate: 0,
        notes: "",
      });
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to add item");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="h2">Inventory</h2>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {err && (
          <div className="mt-2" style={{ color: "#b91c1c", fontWeight: 600 }}>
            {err}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="h3">Add Item</h3>
        <div className="grid" style={{ gap: 8, maxWidth: 720 }}>
          <div className="row">
            <label style={{ minWidth: 140 }}>Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Category"
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Item name"
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>SKU</label>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              placeholder="SKU"
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>Condition</label>
            <input
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              placeholder="Condition"
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>Qty Total</label>
            <input
              type="number"
              value={form.qtyTotal}
              onChange={(e) =>
                setForm((f) => ({ ...f, qtyTotal: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>Qty Available</label>
            <input
              type="number"
              value={form.qtyAvail}
              onChange={(e) =>
                setForm((f) => ({ ...f, qtyAvail: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>Daily Rate</label>
            <input
              type="number"
              value={form.dailyRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dailyRate: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="row">
            <label style={{ minWidth: 140 }}>Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
            />
          </div>

          <div>
            <button className="btn primary" onClick={addItem} disabled={loading}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="h3">Items</h3>
        {grouped.length === 0 ? (
          <div className="muted">No items yet.</div>
        ) : (
          grouped.map(([cat, arr]) => (
            <div key={cat} className="mb-4">
              <div className="h4">{cat}</div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Condition</th>
                    <th>Total</th>
                    <th>Available</th>
                    <th>Daily Rate</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {arr.map((it, i) => (
                    <tr key={it.id ?? `${cat}-${i}`}>
                      <td>{it.name}</td>
                      <td>{it.sku}</td>
                      <td>{it.condition}</td>
                      <td>{it.qtyTotal}</td>
                      <td>{it.qtyAvail}</td>
                      <td>{Number(it.dailyRate || 0).toFixed(2)}</td>
                      <td>{it.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
