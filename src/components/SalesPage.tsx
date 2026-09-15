import React from "react";
import Link from "next/link";
import { getOffer } from "@/lib/sales";

const four = getOffer("four");
const single = getOffer("single");

type Tracking = Record<string, string>;

function purchaseHref(pack: "single" | "four", tracking?: Tracking): string {
  const params = new URLSearchParams({ pack });
  if (tracking) {
    for (const [key, value] of Object.entries(tracking)) {
      if (key.startsWith("utm_") && value) params.set(key, value);
    }
  }
  return `/new?${params.toString()}`;
}

const outcomes = [
  ["Attention", "A sharp opening built for the first three seconds."],
  ["Proof", "Your real work, credentials and customer evidence—never invented."],
  ["Offer", "A clear reason for the right customer to act today."],
  ["Action", "One focused next step: call, enquire, book or request a quote."],
];

const faqs = [
  ["What do you need from me?", "Answer a guided set of questions and share any logo, photos or footage you own. The more context you provide, the stronger the result."],
  ["Will you publish it automatically?", "No. Nothing is published without approval. Your videos are reviewed and delivered ready for your chosen platforms."],
  ["Is this a subscription?", "No. The $199 and $550 offers are one-off purchases. Ongoing and higher-volume work is available through Enterprise."],
  ["Can you guarantee leads?", "No honest studio can guarantee a particular result. We create a strong, clear advertising asset using verified business information."],
];

function OfferCard({ offer, tracking }: { offer: typeof four; tracking?: Tracking }) {
  return (
    <article className={`offer-card ${offer.featured ? "offer-card-featured" : ""}`}>
      {offer.featured && <span className="offer-badge">Best value</span>}
      <p className="eyebrow">{offer.videos === 4 ? "Complete campaign" : "Start focused"}</p>
      <h3>{offer.name}</h3>
      <div className="price"><span>$</span>{offer.price}<small>AUD</small></div>
      <p>{offer.videos === 4 ? "Four distinct 15-second angles: problem, proof, offer and direct response." : "One polished 15-second vertical video built around your strongest angle."}</p>
      <ul className="check-list">
        <li>Question-led creative brief</li>
        <li>Human-reviewed production</li>
        <li>Captions and platform-ready delivery</li>
        <li>No subscription</li>
      </ul>
      <Link className={offer.featured ? "button button-gold" : "button button-outline"} href={purchaseHref(offer.id, tracking)}>
        Choose {offer.videos === 4 ? "four videos" : "one video"}
      </Link>
    </article>
  );
}

export default function SalesPage({ tracking }: { tracking?: Tracking }) {
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">Short-form advertising for local business</p>
          <h1>Short-form video that <em>earns attention.</em></h1>
          <p className="hero-lede">EthinX turns what makes your business valuable into concise, reviewed 15-second ads—built to move viewers from scrolling to enquiry.</p>
          <div className="hero-actions">
            <Link className="button button-gold" href={purchaseHref("four", tracking)}>Get four videos — $550</Link>
            <a className="text-link" href="#example">Watch a real example <span aria-hidden="true">↓</span></a>
          </div>
          <div className="trust-row" aria-label="Offer assurances">
            <span>Australian business</span><span>Human reviewed</span><span>No subscription</span>
          </div>
        </div>
        <div className="hero-panel" aria-hidden="true">
          <span className="panel-kicker">ETHINX / SHORT-FORM</span>
          <div className="panel-number">15</div>
          <span className="panel-unit">SECONDS</span>
          <div className="signal-lines"><i /><i /><i /><i /></div>
          <p>One idea. One audience. One action.</p>
        </div>
      </section>

      <section id="example" className="demo-section section-shell">
        <div className="section-heading">
          <p className="eyebrow">Made for a real local business</p>
          <h2>See what fifteen seconds can do.</h2>
          <p>A direct-response concept built for a mechanic: immediate context, a recognisable customer problem and a clear action.</p>
        </div>
        <div className="demo-grid">
          <div className="video-frame">
            <video controls playsInline preload="metadata" poster="/demo/03-team.jpg">
              <source src="https://videos.ethinx.solutions/teasers/5f4eec3da3.mp4" type="video/mp4" />
              Your browser does not support video playback.
            </video>
          </div>
          <div className="outcome-stack">
            {outcomes.map(([title, copy], index) => <div className="outcome" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section section-shell">
        <div className="section-heading centered">
          <p className="eyebrow">Simple one-off pricing</p>
          <h2>Start with the campaign that fits.</h2>
          <p>Both options use the same controlled production process. Four videos give you more angles to test for substantially less per video.</p>
        </div>
        <div className="offers"><OfferCard offer={four} tracking={tracking} /><OfferCard offer={single} tracking={tracking} /></div>
      </section>

      <section id="process" className="process-section section-shell">
        <div className="section-heading"><p className="eyebrow">Clear from brief to delivery</p><h2>A considered process. No callbacks required.</h2></div>
        <ol className="process-grid">
          <li><span>01</span><h3>Answer the questions</h3><p>Tell us about your customer, offer, proof, brand and what must never be claimed.</p></li>
          <li><span>02</span><h3>Complete payment</h3><p>Use secure PayPal checkout for your selected one-off package.</p></li>
          <li><span>03</span><h3>Review the direction</h3><p>We verify the brief, source the right assets and keep unsupported claims out.</p></li>
          <li><span>04</span><h3>Receive your videos</h3><p>Your reviewed files arrive ready for vertical social platforms.</p></li>
        </ol>
      </section>

      <section className="trust-section">
        <div className="section-shell trust-grid">
          <div><p className="eyebrow">Built with restraint</p><h2>Your reputation matters more than filling a frame.</h2></div>
          <ul className="trust-list"><li>Verified business claims only</li><li>Customer-owned or appropriately licensed assets</li><li>Human approval before delivery</li><li>Nothing published automatically</li></ul>
        </div>
      </section>

      <section id="faq" className="faq-section section-shell">
        <div className="section-heading"><p className="eyebrow">Before you begin</p><h2>Useful answers, upfront.</h2></div>
        <div className="faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="enterprise-section section-shell">
        <div><p className="eyebrow">More than four videos?</p><h2>Build an ongoing content system.</h2><p>For recurring production, multiple locations, managed posting or custom integrations, send us the full picture in writing.</p></div>
        <Link className="button button-outline" href="/enterprise">Explore Enterprise</Link>
      </section>

      <section className="final-cta section-shell">
        <p className="eyebrow">Ready when you are</p><h2>Give your next customer something worth stopping for.</h2>
        <div className="hero-actions"><Link className="button button-gold" href={purchaseHref("four", tracking)}>Start the four-video brief</Link><Link className="text-link" href="/question">Ask a written question</Link></div>
      </section>
    </>
  );
}