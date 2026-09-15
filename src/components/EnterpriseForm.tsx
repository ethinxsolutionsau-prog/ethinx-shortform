"use client";
import { FormEvent, useState } from "react";

export default function EnterpriseForm() {
  const [state, setState] = useState<"idle"|"busy"|"done">("idle");
  const [errors, setErrors] = useState<Record<string,string>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("busy"); setErrors({}); const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(form.entries());
    payload.services = form.getAll("services"); payload.privacyConsent = form.has("privacyConsent");
    const response = await fetch("/api/enterprise", { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { setErrors(data.errors || { form: data.message }); setState("idle"); return; }
    setState("done");
  }
  if (state === "done") return <div className="success-panel"><p className="eyebrow">Inquiry received</p><h1>Thank you. Your brief is in the priority queue.</h1><p>EthinX has your written scope and can assess it without a callback. You will receive a response by email.</p><form action="/"><button className="button button-outline">Return home</button></form></div>;
  const f=(name:string,label:string,type="text")=><label className="field"><span>{label}</span><input name={name} type={type} required aria-invalid={!!errors[name]}/>{errors[name]&&<small>{errors[name]}</small>}</label>;
  const a=(name:string,label:string,help:string)=><label className="field field-wide"><span>{label}</span><textarea name={name} rows={4} placeholder={help} required aria-invalid={!!errors[name]}/>{errors[name]&&<small>{errors[name]}</small>}</label>;
  return <form className="intake-form" onSubmit={submit}><div className="form-intro"><p className="eyebrow">Enterprise / ongoing</p><h1>Describe the system you want to build.</h1><p>For more than four videos, recurring production, managed posting, multiple locations or integrations. Written questions only—no callback booking.</p></div>
    <fieldset><legend>1. Business and contact</legend><div className="field-grid">{f("businessName","Business name")}{f("contactName","Your name")}{f("email","Email","email")}{f("phone","Mobile number","tel")}{f("website","Website","url")}{f("locations","Locations or service areas")}</div></fieldset>
    <fieldset><legend>2. Required volume and services</legend><div className="field-grid">{f("monthlyVolume","How many videos each month?")}{f("cadence","Preferred publishing cadence")}</div><div className="choice-row">{[["video","Video production"],["managed-posting","Managed posting"],["strategy","Campaign strategy"],["integrations","CRM / automation"],["multi-location","Multiple locations"]].map(([v,l])=><label className="choice" key={v}><input type="checkbox" name="services" value={v}/>{l}</label>)}</div>{errors.services&&<p className="field-error">{errors.services}</p>}</fieldset>
    <fieldset><legend>3. Commercial context</legend><div className="field-grid">{a("goals","What commercial result should this system create?","Include target services, customer types and success measures.")}{a("currentMarketing","What are you doing now?","Channels, frequency, paid campaigns, results and constraints.")}{a("integrations","Which tools must connect?","Website, CRM, Postiz, booking platform, analytics or reporting.")}{f("budget","Expected monthly budget")}{f("timeline","Desired start date or deadline")}{a("notes","Anything else we should know?","Approvals, compliance, brand structure, stakeholders or procurement needs.")}</div></fieldset>
    <fieldset><legend>4. Permission</legend><label className="choice"><input type="checkbox" name="privacyConsent"/> I consent to EthinX storing and using this information to assess and respond to this inquiry.</label>{errors.privacyConsent&&<p className="field-error">{errors.privacyConsent}</p>}</fieldset>
    {errors.form&&<p className="form-error">{errors.form}</p>}<button className="button button-gold submit-button" disabled={state==="busy"}>{state==="busy"?"Sending securely…":"Send Enterprise inquiry"}</button>
  </form>;
}