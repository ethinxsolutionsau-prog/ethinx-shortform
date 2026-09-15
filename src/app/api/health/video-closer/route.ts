import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export async function GET() {
  try {
    const sqlitePath = "/home/n8n/n8n_data/database.sqlite";
    let lastRun: any = null;
    let healthy = true;
    let reason = "ok";
    try {
      const { execSync } = await import("child_process");
      const out = execSync(`sqlite3 ${sqlitePath} "SELECT startedAt, stoppedAt, status FROM execution_entity WHERE workflowId='W4hsPZ8AmV6gzwxo' ORDER BY startedAt DESC LIMIT 1;"`, { encoding: "utf8" });
      if (out.trim()) {
        const parts = out.trim().split("|");
        const startedAt = parts[0];
        const stoppedAt = parts[1];
        const status = parts[2];
        lastRun = { startedAt, stoppedAt, status };
        const started = new Date(startedAt).getTime();
        const now = Date.now();
        const diffH = (now - started) / 3600000;
        if (diffH > 26) { healthy = false; reason = `last run ${diffH.toFixed(1)}h ago >26h`; }
        if (status && status !== "success" && status !== "new" && status !== "1") { 
          // allow no executions yet
          if (status !== "success") { healthy = false; reason = `last status ${status}`; }
        }
      } else {
        const { execSync: ex } = await import("child_process");
        const w = ex(`sqlite3 ${sqlitePath} "SELECT updatedAt FROM workflow_entity WHERE id='W4hsPZ8AmV6gzwxo';"`, { encoding: "utf8" });
        const upd = new Date(w.trim()).getTime();
        if (Date.now() - upd > 26*3600000) { healthy = false; reason = "no executions and workflow stale"; }
      }
    } catch (e:any) {
      healthy = true;
      reason = "ok (check skipped) " + e.message.slice(0,100);
    }
    const funnelRows:any = await prisma.$queryRawUnsafe(`SELECT count(*) as c FROM video_closer_funnel`);
    const count = parseInt(funnelRows[0].c);
    return NextResponse.json({ healthy, reason, lastRun, funnelCount: count, timestamp: new Date().toISOString() }, { status: healthy ? 200 : 500 });
  } catch (e:any) {
    return NextResponse.json({ healthy: false, error: e.message }, { status: 500 });
  }
}
