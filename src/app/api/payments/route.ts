import { NextResponse } from "next/server";

export async function GET() {
  const dodoEnabled = process.env.DODO_ENABLED === "true" || process.env.NEXT_PUBLIC_DODO_ENABLED === "true";
  // Support both single env duplicates: last wins is fourpack, but we expose both
  const paypalSingle = process.env.PAYPAL_LINK_SINGLE || process.env.NEXT_PUBLIC_PAYPAL_LINK_SINGLE || "https://www.paypal.com/ncp/payment/3U2WSMUELZL8Q";
  const paypalFour = process.env.PAYPAL_LINK_FOURPACK || process.env.NEXT_PUBLIC_PAYPAL_LINK_FOURPACK || process.env.PAYPAL_LINK || "https://www.paypal.com/ncp/payment/A4Y67YLZJZQSW";
  const paypalLink = process.env.PAYPAL_LINK || paypalFour;
  return NextResponse.json({
    dodoEnabled,
    dodo: dodoEnabled
      ? { single: 199, fourPack: 550, currency: "AUD", enabled: true }
      : { enabled: false },
    paypal: {
      single: paypalSingle,
      fourPack: paypalFour,
      link: paypalLink,
    },
    bank: {
      name: process.env.BANK_NAME || process.env.NEXT_PUBLIC_BANK_NAME || "Macquarie Bank",
      bsb: process.env.BANK_BSB || process.env.NEXT_PUBLIC_BANK_BSB || "182182",
      account: process.env.BANK_ACCOUNT || process.env.NEXT_PUBLIC_BANK_ACCOUNT || "033667619",
    },
  });
}
