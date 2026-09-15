import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateEnterpriseInquiry } from "@/lib/intake";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const result = validateEnterpriseInquiry(await request.json().catch(()=>null));
  if(!result.success) return NextResponse.json({message:"Check the highlighted answers.",errors:result.errors},{status:400});
  try {
    const inquiry = await prisma.enterpriseInquiry.create({
      data: {
        businessName: result.data.businessName,
        contactName: result.data.contactName,
        email: result.data.email,
        phone: result.data.phone,
        website: result.data.website,
        details: result.data,
      },
    });
    return NextResponse.json({ inquiryId: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error("enterprise_inquiry_failed", error);
    return NextResponse.json({ message: "Your inquiry could not be saved. Please try again." }, { status: 503 });
  }
}