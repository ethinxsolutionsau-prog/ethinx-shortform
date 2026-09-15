import SalesPage from "@/components/SalesPage";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function Home({ searchParams }: { searchParams?: SearchParams }) {
  const tracking: Record<string, string> = {};
  for (const key of Object.keys(searchParams ?? {})) {
    if (!key.startsWith("utm_")) continue;
    const value = searchParams![key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) tracking[key] = first;
  }

  return <SalesPage tracking={Object.keys(tracking).length ? tracking : undefined} />;
}