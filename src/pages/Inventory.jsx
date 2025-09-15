// src/pages/Inventory.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

export default function InventoryPage(){
  const [items,setItems]=useState([]);
  const [err,setErr]=useState("");
  const [form,setForm]=useState({category:"Cameras", name:"", sku:"", condition:"Good", qtyTotal:1, qtyAvail:1, dailyRate:0, notes:""});

  const load = async ()=>{
    setErr("");
    try{
      const {items} = await api.listInventory();
      setItems(items||[]);
    }catch(e){ setErr(e.message); }
  };
  useEffect(()=>{ load(); },[]);

  const grouped = useMemo(()=>{
    const m=new Map();
    for(const it of items){
      const k=it.category||"Other";
      if(!m.has(k)) m.set(k,[]);
      m.get(k).push(it);
    }
    return [...m.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  },[items]);

  const addItem = async ()=>{
    if(!form.name){ alert("Item name required"); return; }
    try{
      await api.addInventory(form);
      setForm({category:form.category, name:"", sku:"", condition:"Good", qtyTotal:1, qtyAvail:1, dailyRate:0, notes:""});
      await load();
    }catch(e){ alert(e.message); }
  };

  return (
    <div className="grid gap-6">
      <div className="card section-gold">
        <div className="flex items-center justify-between">
          <div><div className="badge badge-gold">Inventory</div><div className="mt-1 text-sm text-gray-400">Studio equipment & supplies</div></div>
          <button className="btn no-print" onClick={load}>Refresh</button>
        </div>
      </div>

      <div className="card">
        <div className="font-semibold mb-2">Add Item</div>
        <div className="grid gap-3" style={{gridTemplateColumns:"repeat(6,minmax(0,1fr))"}}>
          <select className="input" value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}>
            {["Cameras","Lenses","Lighting","Audio","Grip & Support","Production Accessories","Post-Production","Vehicles/Transport","Other"].map(c=><option key={c}>{c}</option>)}
          </select>
          <input className="input" placeholder="Item name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/>
          <input className="input" placeholder="SKU" value={form.sku} onChange={e=>setForm(v=>({...v,sku:e.target.value}))}/>
          <input className="input" placeholder="Condition" value={form.condition} onChange={e=>setForm(v=>({...v,condition:e.target.value}))}/>
          <input className="input" type="number" min="0" placeholder="Qty total" value={form.qtyTotal} onChange={e=>setForm(v=>({...v,qtyTotal:Number(e.target.value)}))}/>
          <input className="input" type="number" min="0" placeholder="Qty avail" value={form.qtyAvail} onChange={e=>setForm(v=>({...v,qtyAvail:Number(e.target.value)}))}/>
          <input className="input" type="number" min="0" step="0.01" placeholder="Daily rate" value={form.dailyRate} onChange={e=>setForm(v=>({...v,dailyRate:Number(e.target.value)}))}/>
          <input className="input" style={{gridColumn:"span 4"}} placeholder="Notes" value={form.notes} onChange={e=>setForm(v=>({...v,notes:e.target.value}))}/>
          <div className="no-print" style={{gridColumn:"span 1"}}><button className="btn btn-primary" onClick={addItem}>Add</button></div>
        </div>
      </div>

      {grouped.map(([cat, arr])=>(
        <div key={cat} className="card section-blue">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">{cat}</div>
            <div className="text-sm text-gray-400">{arr.length} item(s)</div>
          </div>
          <table className="table">
            <thead><tr><th>Name</th><th>SKU</th><th>Qty</th><th>Daily</th><th>Status</th></tr></thead>
            <tbody>
              {arr.map(it=>(
                <tr key={it.itemId}>
                  <td>{it.name}</td>
                  <td className="text-gray-400">{it.sku||"—"}</td>
                  <td>{it.qtyAvail}/{it.qtyTotal}</td>
                  <td>${Number(it.dailyRate||0).toFixed(2)}</td>
                  <td>
                    {it.inUseToday && <span className="badge badge-orange">In Use</span>}
                    {!it.inUseToday && <span className="badge badge-green">Available</span>}
                    {it.nextBooking && <span className="badge badge-blue" style={{marginLeft:8}}>Next: {it.nextBooking}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {err && <div className="card" style={{borderColor:"rgba(239,68,68,.35)", borderWidth:1}}>{err}</div>}
    </div>
  );
}
