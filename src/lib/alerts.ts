import { appendFile } from "fs/promises";
import { resolve } from "path";

const LOG_PATH = resolve("/tmp/enterprise-inquiries.log");
const ALERT_EMAIL = "hello@ethinx.solutions";

export async function sendEnterpriseAlerts(payload: Record<string, unknown>) {
  const status: { logged: boolean; email: string } = { logged: false, email: "not_configured" };
  const line = JSON.stringify({ at: new Date().toISOString(), to: ALERT_EMAIL, ...payload });
  try {
    await appendFile(LOG_PATH, line + "\n", "utf8");
    status.logged = true;
  } catch (e) {
    console.error("enterprise_inquiry_log_failed", e);
  }
  console.log("enterprise_inquiry", line);
  const hook = process.env.ENTERPRISE_EMAIL_WEBHOOK_URL;
  if (hook) {
    status.email = "attempted";
    try {
      const response = await fetch(hook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "enterprise_inquiry", to: ALERT_EMAIL, ...payload }),
        signal: AbortSignal.timeout(8000),
      });
      status.email = response.ok ? "sent" : `failed_${response.status}`;
    } catch (e: any) {
      status.email = "failed";
      console.error("enterprise_inquiry_email_failed", e?.message);
    }
  }
  return status;
}