import prisma from "../prisma";

export async function logAudit(jobId: string, action: string, opts: { actor?: string; fromState?: string; toState?: string; payload?: any } = {}) {
  return prisma.auditLog.create({
    data: {
      jobId,
      action,
      actor: opts.actor || "system",
      fromState: opts.fromState,
      toState: opts.toState,
      payload: opts.payload || {},
    },
  });
}

export async function transitionJob(jobId: string, toState: any, actor = "system", payload?: any) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const fromState = job.state;
  // log before
  await logAudit(jobId, `state:${fromState}->${toState}`, { actor, fromState, toState, payload });
  return prisma.job.update({ where: { id: jobId }, data: { state: toState } });
}
