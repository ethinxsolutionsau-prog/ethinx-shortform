import type { Metadata } from "next";
import Link from "next/link";
import styles from "./marketing.module.css";

export const metadata: Metadata = {
  title: "EthinX | Short-form video for local business",
  description: "Reviewed 15-second video ads for Australian local-service businesses. One video for $199 AUD or a four-video campaign for $550 AUD.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.market}>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <LinkLogo />
        <nav aria-label="Main navigation"><a href="#example">Example</a><a href="#pricing">Pricing</a><a href="#process">Process</a><a href="#faq">FAQ</a><Link className="nav-cta" href="/new?pack=four">Start a brief</Link></nav>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer"><div><LinkLogo /><p>Short-form advertising built with evidence, restraint and a human review.</p></div><div><a href="/question">Written questions</a><a href="/enterprise">Enterprise</a><a href="/privacy">Privacy</a></div><p>© {new Date().getFullYear()} EthinX Solutions. Adelaide, Australia.</p></footer>
    </div>
  );
}

function LinkLogo() {
  return <Link className="brand" href="/" aria-label="EthinX home"><span>ETHINX</span><small>SHORT-FORM</small></Link>;
}