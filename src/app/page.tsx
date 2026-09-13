import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { videos: true } });
  const total = await prisma.job.count();
  const delivered = await prisma.job.count({ where: { state: "DELIVERED" } });
  const inProgress = total - delivered;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">EthinX Shortform</h1>
            <p className="text-sm text-zinc-600 mt-1 max-w-xl">
              Turn a business link into 4 short videos. 15 seconds each. Reviewed and ready to post.
            </p>
          </div>
          <Link href="/new" className="inline-flex items-center justify-center bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-zinc-800 transition text-sm whitespace-nowrap">
            + New Campaign
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total jobs</div>
            <div className="text-2xl font-black mt-1">{total}</div>
            <div className="text-xs text-zinc-500">All campaigns</div>
          </div>
          <div className="bg-zinc-900 text-white rounded-xl p-4">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Delivered</div>
            <div className="text-2xl font-black mt-1">{delivered}</div>
            <div className="text-xs text-zinc-400">Ready to post</div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">In progress</div>
            <div className="text-2xl font-black mt-1">{inProgress}</div>
            <div className="text-xs text-zinc-500">Being built</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-semibold">Your campaigns</h2>
          <span className="text-xs text-zinc-500">{jobs.length} shown</span>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-zinc-400 text-sm">No campaigns yet</div>
            <p className="text-xs text-zinc-500 mt-1">Create your first 4-video pack</p>
            <Link href="/new" className="inline-flex mt-4 bg-black text-white px-5 py-2 rounded-xl text-sm font-medium">
              New Campaign
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Job</th>
                    <th className="text-left px-6 py-3 font-medium">Business</th>
                    <th className="text-left px-6 py-3 font-medium">State</th>
                    <th className="text-left px-6 py-3 font-medium">Created</th>
                    <th className="text-right px-6 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-3 font-mono text-xs">
                        <span className="bg-zinc-100 border border-zinc-200 rounded px-2 py-1">{j.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium truncate max-w-[220px]">{j.businessUrl}</div>
                        <div className="text-xs text-zinc-500">{j.primaryService} • {j.targetLocation}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                            j.state === "DELIVERED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : j.state === "ESCALATED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : j.state === "APPROVED"
                              ? "bg-black text-white border-black"
                              : "bg-white text-zinc-700 border-zinc-200"
                          }`}
                        >
                          {j.state}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-zinc-500">{new Date(j.createdAt).toLocaleDateString()} </td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/jobs/${j.id}`} className="inline-flex bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-800">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-zinc-100">
              {jobs.map((j) => (
                <div key={j.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs bg-zinc-100 inline-flex px-2 py-1 rounded border">{j.id.slice(0, 8)}</div>
                      <div className="text-sm font-medium truncate mt-1">{j.businessUrl}</div>
                      <div className="text-xs text-zinc-500">
                        {j.primaryService} • {new Date(j.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex px-2 py-1 rounded-full text-[11px] font-medium border ${
                        j.state === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200" : j.state === "ESCALATED" ? "bg-red-50 text-red-700 border-red-200" : "bg-zinc-50 text-zinc-700 border-zinc-200"
                      }`}
                    >
                      {j.state}
                    </span>
                  </div>
                  <Link href={`/jobs/${j.id}`} className="mt-3 inline-flex w-full justify-center bg-black text-white px-3 py-2 rounded-xl text-sm font-medium">
                    Open job
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-zinc-500 text-center">Simple, safe, human-approved. No surprises. Fail-closed means nothing ships until you approve.</p>
    </div>
  );
}
