import prisma from "../prisma";
import { BrandData, Provenance, AssetManifest } from "../types";
import { logAudit, transitionJob } from "./audit";

// Mock collector - in production would scrape website + socials
export async function runCollector(jobId: string): Promise<BrandData> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  await transitionJob(jobId, "COLLECTING");

  // Simulate website scan - derive brand data from businessUrl
  const url = new URL(job.businessUrl);
  const domain = url.hostname.replace(/^www\./, "");
  const businessName = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const now = new Date().toISOString();
  const provenance: Provenance[] = [
    { claim: `${businessName} provides ${job.primaryService}`, source_url: job.businessUrl, captured_at: now, verified: true },
    { claim: `Serves ${job.targetLocation}`, source_url: job.businessUrl, captured_at: now, verified: true },
    { claim: `Offer: ${job.offer}`, source_url: job.businessUrl, captured_at: now, verified: true },
  ];

  // Only add phone if provided in intake (CRITICAL RULE: never invent contact)
  if (job.phone) {
    provenance.push({ claim: `Phone: ${job.phone}`, source_url: job.businessUrl, captured_at: now, verified: true });
  }

  const brandData: BrandData = {
    logo: undefined,
    brandColours: ["#0EA5E9", "#111827", "#F59E0B"], // extracted or default
    fonts: ["Inter", "Montserrat"],
    serviceDescriptions: [`Professional ${job.primaryService} for ${job.targetCustomer} in ${job.targetLocation}`],
    beforeAfterMedia: [],
    testimonials: [],
    locationsServed: [job.targetLocation],
    cta: "Get your free quote",
    contact: { phone: job.phone || undefined, website: job.businessUrl },
    offers: [job.offer],
    differentiators: [`Trusted ${job.primaryService} specialists`, `Serving ${job.targetLocation}`],
    provenance,
    capturedAt: now,
  };

  // Create mock assets manifests (website images)
  const mockAssets: AssetManifest[] = [
    {
      asset_id: `logo-${jobId}`,
      source_url: `${job.businessUrl}/logo.png`,
      type: "logo",
      usage: job.assetPermissionConfirmed ? "approved" : "private_mockup_only",
      quality_score: 0.85,
    },
    {
      asset_id: `hero-${jobId}`,
      source_url: `${job.businessUrl}/images/hero.jpg`,
      type: "image",
      usage: job.assetPermissionConfirmed ? "approved" : "private_mockup_only",
      dimensions: { width: 1920, height: 1080 },
      quality_score: 0.9,
    },
  ];

  // Save brandData to job
  await prisma.job.update({
    where: { id: jobId },
    data: { brandData: brandData as any, state: "BRIEF_REVIEW" },
  });

  // Save asset manifests
  for (const m of mockAssets) {
    await prisma.asset.create({
      data: {
        jobId,
        assetId: m.asset_id,
        sourceUrl: m.source_url,
        type: m.type,
        usage: m.usage,
        dimensions: m.dimensions as any,
        qualityScore: m.quality_score,
        provenance: provenance as any,
        manifest: m as any,
      },
    });
  }

  await logAudit(jobId, "collector:completed", { payload: { brandData, assets: mockAssets } });

  return brandData;
}

export async function getBrandData(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  return job?.brandData as BrandData | null;
}
