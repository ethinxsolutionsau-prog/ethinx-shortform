export type OfferId = "single" | "four";

export type Offer = {
  id: OfferId;
  name: string;
  price: number;
  currency: "AUD";
  videos: number;
  checkoutUrl: string;
  featured: boolean;
};

const offers: Record<OfferId, Offer> = {
  single: {
    id: "single",
    name: "One production video",
    price: 199,
    currency: "AUD",
    videos: 1,
    checkoutUrl: process.env.PAYPAL_LINK_SINGLE || "https://www.paypal.com/ncp/payment/3U2WSMUELZL8Q",
    featured: false,
  },
  four: {
    id: "four",
    name: "Four-video campaign",
    price: 550,
    currency: "AUD",
    videos: 4,
    checkoutUrl: process.env.PAYPAL_LINK_FOURPACK || "https://www.paypal.com/ncp/payment/A4Y67YLZJZQSW",
    featured: true,
  },
};

export function getOffer(id: string): Offer {
  if (id !== "single" && id !== "four") throw new Error(`Unknown offer: ${id}`);
  return offers[id];
}

type LeadInput = { businessName: string; contactName: string; email: string; website: string };

export type LeadValidation =
  | { success: true; data: LeadInput }
  | { success: false; errors: Partial<Record<keyof LeadInput, string>> };

export function validateLead(input: LeadInput): LeadValidation {
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  const businessName = input.businessName.trim();
  const contactName = input.contactName.trim();
  const email = input.email.trim().toLowerCase();
  const website = input.website.trim();

  if (!businessName) errors.businessName = "Enter your business name.";
  if (!contactName) errors.contactName = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  let normalisedWebsite = website;
  try {
    const parsed = new URL(website);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    normalisedWebsite = parsed.toString();
  } catch {
    errors.website = "Enter a complete website address, including https://.";
  }

  if (Object.keys(errors).length) return { success: false, errors };
  return { success: true, data: { businessName, contactName, email, website: normalisedWebsite } };
}
