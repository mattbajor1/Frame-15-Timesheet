// src/pages/Invoice.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function InvoicePage(){
  const { projectNumber } = useParams();
  const nav = useNavigate();
  const [data,setData]=useState(null);
  const [err,setErr]=useState("");

  const load = useCallback(async ()=>{
    setErr("");
    try{
      const j = await api.buildInvoice(projectNumber);
      setData(j);
    }catch(e){ setErr(e.message); }
  }, [projectNumber]);

  useEffect(()=>{ load(); },[projectNumber, load]);

  const save = async ()=>{
    try{
      const j = await api.saveInvoice(projectNumber);
      alert(`Saved invoice ${j.invoiceId} for ${projectNumber}`);
    }catch(e){ alert(e.message); }
  };

  if(err) return <div className="card">{err}</div>;
  if(!data) return <div className="card">Loading…</div>;

  const P = data.project||{};
  const labor = data.lines.filter(x=>x.type==='labor');
  const equip = data.lines.filter(x=>x.type==='equipment');

  return (
    <div className="grid gap-6">
      <div className="no-print flex gap-2">
        <button className="btn" onClick={()=>nav(-1)}>Back</button>
        <button className="btn" onClick={load}>Refresh</button>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn" onClick={()=>window.print()}>Print / PDF</button>
      </div>

      <div className="card" style={{background:"#fff", color:"#000"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
          <div>
            <div style={{fontWeight:700, fontSize:24}}>INVOICE</div>
            <div style={{marginTop:8}}><strong>Project:</strong> {P.number} — {P.name}</div>
            <div><strong>Client:</strong> {P.client||"—"}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div><strong>Issue:</strong> {data.issueDate}</div>
            <div><strong>Due:</strong> {data.dueDate}</div>
          </div>
        </div>

        <div className="hr" style={{margin:"12px 0"}} />

        {labor.length>0 && (
          <>
            <div style={{fontWeight:600, marginBottom:6}}>Labor</div>
            <table className="table">
              <thead><tr><th>Description</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {labor.map((l,i)=>(
                  <tr key={i}>
                    <td>{l.name} {l.role?`(${l.role})`:""}</td>
                    <td>{l.hours.toFixed(2)}</td>
                    <td>${Number(l.rate).toFixed(2)}/h</td>
                    <td>${Number(l.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr><td colSpan={3} style={{textAlign:"right", fontWeight:600}}>Subtotal (Labor)</td><td style={{fontWeight:600}}>${Number(data.subtotalLabor).toFixed(2)}</td></tr>
              </tbody>
            </table>
            <div className="hr" style={{margin:"12px 0"}} />
          </>
        )}

        {equip.length>0 && (
          <>
            <div style={{fontWeight:600, marginBottom:6}}>Equipment</div>
            <table className="table">
              <thead><tr><th>Description</th><th>Days</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {equip.map((e,i)=>(
                  <tr key={i}>
                    <td>{e.itemName}</td>
                    <td>{e.days}</td>
                    <td>{e.qty}</td>
                    <td>${Number(e.rate).toFixed(2)}/day</td>
                    <td>${Number(e.amount).toFixed(2)}</td>
                  </tr>
                ))}
                <tr><td colSpan={4} style={{textAlign:"right", fontWeight:600}}>Subtotal (Equipment)</td><td style={{fontWeight:600}}>${Number(data.subtotalEquipment).toFixed(2)}</td></tr>
              </tbody>
            </table>
            <div className="hr" style={{margin:"12px 0"}} />
          </>
        )}

        <div style={{display:"flex", justifyContent:"flex-end"}}>
          <table>
            <tbody>
              <tr><td style={{padding:4, textAlign:"right"}}>Subtotal:</td><td style={{padding:4, textAlign:"right"}}>${(data.subtotalLabor+data.subtotalEquipment).toFixed(2)}</td></tr>
              <tr><td style={{padding:4, textAlign:"right"}}>Tax ({data.taxPercent||0}%):</td><td style={{padding:4, textAlign:"right"}}>${Number(data.tax).toFixed(2)}</td></tr>
              <tr><td style={{padding:4, textAlign:"right", fontWeight:700}}>Total:</td><td style={{padding:4, textAlign:"right", fontWeight:700}}>${Number(data.total).toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{marginTop:24, fontSize:12, color:"#333"}}>
          Thank you! Please remit by {data.dueDate}.
        </div>
      </div>
    </div>
  );
}
