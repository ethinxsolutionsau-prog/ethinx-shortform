"use client";
import { useCallback, useState } from "react";

type Job = { id: string; state: string; releaseEligible: boolean; businessUrl: string; videos: Array<{id:string;angle:string;status:string;filePath?:string}>; qaResults: Array<{id:string;videoId?:string|null;passed:boolean;checks:any[];visual:any[];transcript:any}>; auditLogs: Array<{id:string;action:string;createdAt:string}> };
const angles = ["PROBLEM","PROOF","OFFER","DIRECT"];
export default function ProductionControl() {
  const [id,setId]=useState("");
  const [job,setJob]=useState<Job|null>(null);
  const [working,setWorking]=useState("");
  const [error,setError]=useState("");
  const [delivery,setDelivery]=useState("");
  const load=useCallback(async (jobId:string) => {
    const response=await fetch("/api/jobs/"+encodeURIComponent(jobId),{cache:"no-store"});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"Unable to load job");
    setJob(data.job);
  },[]);
  async function operate(action:string, body?:any) {
    const jobId=id.trim(); if(!jobId || working) return;
    setWorking(action);setError("");
    try {
      if(action==="load") {await load(jobId);return;}
      if(action==="approve" && !window.confirm("Approve this four-video package for customer delivery?")) return;
      if(action==="deliver" && !window.confirm("Package approved videos for customer delivery?")) return;
      const res=await fetch("/api/jobs/"+encodeURIComponent(jobId)+"/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});
      const result=await res.json();
      if(!res.ok) throw new Error(result.error||action+" failed");
      if(action==="deliver") setDelivery(result.zipPath||"Delivery created");
      await load(jobId);
    } catch(e:any) {setError(e.message||"Request failed");}
    finally {setWorking("");}
  }
  const summary=job?.qaResults.find(q=>q.videoId==null);
  return <main style={{maxWidth:1050,margin:"auto",padding:24,fontFamily:"system-ui",color:"#e7eaf2",background:"#0e1423",minHeight:"100vh"}}>
    <header><small style={{color:"#e6bd76"}}>ETHINX SOLUTIONS · VIDEOFORGE ONLY</small><h1>15-Second Production Control</h1><p>Four bespoke vertical advertisements · render → inspect → approve → deliver</p></header>
    <section style={{display:"flex",gap:10,flexWrap:"wrap",margin:"24px 0"}}>
      <input aria-label="VideoForge job ID" placeholder="Existing VideoForge job ID" value={id} onChange={e=>setId(e.target.value)} style={{padding:12,flex:1,minWidth:220,color:"#111"}}/>
      <button disabled={!!working||!id.trim()} onClick={()=>operate("load")}>Load job</button>
    </section>
    {error && <p role="alert" style={{color:"#ff9898"}}>{error}</p>}
    {job && <>
      <section style={{padding:18,background:"#1b2740",borderRadius:12,marginBottom:18}}>
        <h2>{job.businessUrl}</h2><p>State: <strong>{job.state}</strong> · Release eligible: <strong>{job.releaseEligible?"YES":"NO"}</strong></p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button disabled={!!working} onClick={()=>operate("render")}>Render four MP4s</button>
          <button disabled={!!working||!job.videos.length} onClick={()=>operate("qa")}>Run QA</button>
          <button disabled={!!working||job.state!=="HUMAN_REVIEW"} onClick={()=>operate("approve",{decision:"approve",approvedBy:"operator"})}>Approve</button>
          <button disabled={!!working||job.state!=="APPROVED"||!job.releaseEligible} onClick={()=>operate("deliver")}>Create delivery ZIP</button>
          <button disabled={!!working} onClick={()=>operate("load")}>Refresh</button>
        </div>
        {working && <p aria-live="polite">Executing {working}…</p>}
        {delivery && <p>Delivery output: {delivery} (server path; do not share this path with customers)</p>}
      </section>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
        {angles.map(angle=>{
          const video=job.videos.find(v=>v.angle===angle);
          const qa=job.qaResults.find(q=>q.videoId===video?.id);
          return <article key={angle} style={{background:"#1b2740",padding:16,borderRadius:12}}>
            <h3>{angle}</h3>
            <p>MP4: {video?.status||"Not rendered"}</p>
            <p>QA: {qa?.passed===true?"Reported pass":qa?"FAILED":"Pending"}</p>
            {!!qa && <details><summary>Inspect QA checks</summary>{[...(Array.isArray(qa.checks)?qa.checks:[]),...(Array.isArray(qa.visual)?qa.visual:[]),...(qa.transcript?[qa.transcript]:[])].map((c:any,i:number)=><p key={i} style={{color:c.passed?"#b2f5cc":"#ffaaaa"}}>{c.passed?"✓":"✗"} {c.name}: {c.details}</p>)}</details>}
          </article>;
        })}
      </div>
      <section style={{marginTop:20,padding:16,background:"#1b2740",borderRadius:12}}>
        <h3>Aggregate quality gate</h3><p>{summary?.passed?"QA reports PASS — approval additionally verifies real evidence":summary?"BLOCKED — QA failed":"No aggregate QA yet"}</p>
        <h3>Recent audit events</h3>{job.auditLogs.slice(-8).reverse().map(a=><p key={a.id}>{a.action} · {new Date(a.createdAt).toLocaleString("en-AU")}</p>)}
      </section>
    </>}
    <footer style={{marginTop:32,color:"#a3aec4"}}>Separate from FacelessForge. No automatic publishing. Use operator-approved production only.</footer>
  </main>;
}
