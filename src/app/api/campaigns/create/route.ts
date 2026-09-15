import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { IntakeSchema } from "@/lib/validators";
import { logAudit } from "@/lib/services/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IntakeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid intake", details: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    const pack = (body.pack === "single" ? "single" : "four") as "single" | "four";
    const price = pack === "single" ? 199 : 550;

    const job = await prisma.job.create({
      data: {
        businessUrl: data.business_url,
        campaignGoal: data.campaign_goal,
        targetLocation: data.target_location,
        targetCustomer: data.target_customer,
        primaryService: data.primary_service,
        offer: data.offer,
        pack,
        price,
        outputFormats: data.output_formats,
        assetPermissionConfirmed: data.asset_permission_confirmed,
        instagramUrl: data.instagram_url,
        facebookUrl: data.facebook_url,
        phone: data.phone,
        landingUrl: data.landing_url,
        brandRestrictions: data.brand_restrictions,
        voicePreference: data.voice_preference,
        musicPreference: data.music_preference,
        state: "INTAKE",
      },
    });

    await logAudit(job.id, "intake:created", { payload: data });

    return NextResponse.json({ jobId: job.id, job }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
