export default function FactoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="font-black tracking-tight text-lg">ETHINX <span className="text-sky-600">SHORT-FORM</span></a>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:text-sky-600">Dashboard</a>
            <a href="/new" className="bg-sky-600 text-white px-3 py-1.5 rounded font-medium hover:bg-sky-700">+ New Campaign</a>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      <footer className="max-w-6xl mx-auto px-6 py-6 text-xs text-zinc-500 border-t mt-12">
        EthinX Short-Form • 4×15s • $199 single / $550 four-pack • No subscription • Fail-closed • Max 2 repairs • release_eligible=false blocks delivery
      </footer>
    </>
  );
}