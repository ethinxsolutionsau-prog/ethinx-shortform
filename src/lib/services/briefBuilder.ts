import prisma from "../prisma";
import { CampaignBrief } from "../types";
import { logAudit, transitionJob } from "./audit";
import { getBrandData } from "./collector";

export async function buildBrief(jobId: string): Promise<CampaignBrief> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const brandData = (job.brandData as any) || (await getBrandData(jobId));
  if (!brandData) throw new Error("Brand data not collected");

  const url = new URL(job.businessUrl);
  const domain = url.hostname.replace(/^www\./, "");
  const name = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const brief: CampaignBrief = {
    business: { name, url: job.businessUrl, description: brandData.serviceDescriptions?.[0] || `${job.primaryService} in ${job.targetLocation}` },
    audience: { target_customer: job.targetCustomer, target_location: job.targetLocation },
    desired_action: job.campaignGoal,
    core_service: job.primaryService,
    customer_problem: `Dirty or worn ${job.primaryService.replace(" cleaning", "").toLowerCase()} reducing curb appeal`,
    transformation: `Restored, clean ${job.primaryService} that impresses neighbours`,
    verified_proof: brandData.provenance || [],
    cta: brandData.cta || "Get your free quote",
    brand_colours: brandData.brandColours,
    prohibited_claims: ["guaranteed #1", "cheapest price", "lifetime warranty unless verified"],
    offer: job.offer,
    contact: { phone: brandData.contact?.phone, website: job.businessUrl },
  };

  await prisma.job.update({ where: { id: jobId }, data: { brief: brief as any } });
  await logAudit(jobId, "brief:built", { payload: brief });
  return brief;
}

export async function approveBrief(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  if (!job.brief) throw new Error("No brief to approve");
  await prisma.job.update({
    where: { id: jobId },
    data: { briefApprovedAt: new Date(), state: "SCRIPTING" },
  });
  await logAudit(jobId, "brief:approved", { fromState: "BRIEF_REVIEW", toState: "SCRIPTING" });
}

export async function updateBrief(jobId: string, patch: Partial<CampaignBrief>) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const current = (job.brief as any as CampaignBrief) || (await buildBrief(jobId));
  const updated = { ...current, ...patch };
  await prisma.job.update({ where: { id: jobId }, data: { brief: updated as any } });
  await logAudit(jobId, "brief:updated", { payload: patch });
  return updated;
}
