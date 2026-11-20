#!/usr/bin/env python3
"""Builds the Molly-structure Lipoderma pages from "Lipoderma Website NEW.md".

Run from anywhere:  python3 labs/lipoderma-molly/scripts/build.py
The FAQ is parsed straight from the doc so the copy stays word-for-word.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOC = Path.home() / "Downloads" / "Lipoderma Website NEW.md"
V = "20261120m"

NAV = [
    ("index.html", "Home"),
    ("patient.html", "For the Fat Curious"),
    ("provider.html", "For the Fat Experts"),
    ("safety.html", "Safety &amp; Standards"),
    ("faq.html", "Fat Facts"),
    ("receipts.html", "The Receipts"),
]


def esc(s):
    return html.escape(s, quote=False)


def inline(s):
    """Tiny markdown: **bold**, *italic*, [text](url). Input is trusted doc text."""
    s = html.escape(s.strip(), quote=False)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", s)
    return s.replace("****", "")


def head(title, page):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title} — Lipoderma</title>
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#002b63" />
<link rel="preload" as="font" type="font/woff" href="fonts/BodoniFLF-Roman.woff" crossorigin />
<link rel="icon" href="img/logos/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="vendor/leaflet/leaflet.css" />
<link rel="stylesheet" href="css/site.css?v={V}" />
<link rel="stylesheet" href="css/glass.css?v={V}" />
<link rel="stylesheet" href="css/motion.css?v={V}" />
<link rel="stylesheet" href="css/layout.css?v={V}" />
<link rel="stylesheet" href="css/brief.css?v={V}" />
<link rel="stylesheet" href="css/structure.css?v={V}" />
</head>
<body data-page="{page}">
<div class="bg-field" aria-hidden="true"><i></i><i></i><i></i></div>
"""


def header(page):
    links = "\n".join(
        f'      <a href="{href}"{" aria-current=\"page\"" if href == page else ""}>{label}</a>'
        for href, label in NAV
    )
    mobile = "\n".join(
        f'  <a href="{href}"{" aria-current=\"page\"" if href == page else ""}>{label}</a>'
        for href, label in NAV
    )
    return f"""
<header class="site-header" id="site-header">
  <div class="header-inner">
    <a class="brand" href="index.html" aria-label="Lipoderma home">
      <span class="brand-logo" role="img" aria-label="Lipoderma"></span>
    </a>
    <nav class="header-nav" aria-label="Primary">
{links}
    </nav>
    <div class="header-actions">
      <a class="btn" href="patient.html#providers">Find a provider</a>
      <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav" data-menu-toggle>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M1 4h16M1 9h16M1 14h16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</header>

<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile" data-mobile-nav>
{mobile}
  <a href="patient.html#providers">Find a provider</a>
</nav>

<main id="main">
"""


def footer(extra_script=""):
    cols = "\n".join(f'        <a href="{h}">{l}</a>' for h, l in NAV)
    return f"""
</main>

<footer class="site-footer" data-theme="light">
  <div class="wrap">
    <div class="footer-top">
      <div class="footer-brand">
        <img src="img/logos/lipoderma-logo.svg" width="124" height="30" alt="Lipoderma" />
        <p class="footer-tagline">Restore what's been lost.<br><span>Not reinvent what's there.</span></p>
      </div>
      <div class="footer-col">
        <h3>Explore</h3>
{cols}
      </div>
      <div class="footer-col">
        <h3>Britecyte</h3>
        <a href="https://britecyte.com" target="_blank" rel="noopener">Britecyte</a>
        <a href="mailto:brighterlives@britecyte.com">Contact</a>
        <a href="https://www.instagram.com/restorewithlipoderma/" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.youtube.com/@lipoderma" target="_blank" rel="noopener">YouTube</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Britecyte, Inc. All rights reserved.</span>
      <span>Lipoderma® is a registered trademark of Britecyte, Inc. · Frederick, MD</span>
    </div>
  </div>
</footer>

<script type="module" src="js/main.js?v={V}"></script>
{extra_script}</body>
</html>
"""


def pg_hero(eyebrow, title_html, lede=""):
    lede_html = f'\n      <p class="pg-lede reveal">{lede}</p>' if lede else ""
    return f"""
  <header class="pg-hero">
    <div class="wrap">
      <p class="pg-eyebrow reveal">{eyebrow}</p>
      <h1 class="pg-title reveal">{title_html}</h1>{lede_html}
    </div>
  </header>
"""


def panel(inner, cls="", pid=""):
    idattr = f' id="{pid}"' if pid else ""
    return f'\n  <section class="pg-section"{idattr}>\n    <div class="panel reveal {cls}">\n{inner}\n    </div>\n  </section>\n'


def ph(label, note="Image TBD", ar="16/9"):
    return f'<div class="ph" style="--ar:{ar}" role="img" aria-label="Placeholder: {esc(label)}"><span>{esc(label)}<small>{esc(note)}</small></span></div>'


def video(src, caption, cls=""):
    return f"""<figure class="pg-video {cls}">
        <video controls playsinline preload="metadata" src="{src}"></video>
        <figcaption>{caption}</figcaption>
      </figure>"""


# ───────────────────────────── HOME ─────────────────────────────
def page_home():
    out = head("Let's talk about the F** word", "index.html") + header("index.html")
    out += """
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-visual" aria-hidden="true">
      <div class="hero-visual-frame">
        <video class="hero-laura" muted autoplay loop playsinline preload="auto" src="https://media.lipoderma.com/videos/patient-laura.mp4"></video>
      </div>
    </div>
    <button class="hero-sound" type="button" data-hero-sound aria-pressed="false">Sound off</button>
    <div class="hero-glow" aria-hidden="true"></div>

    <div class="hero-inner hero-main">
      <div>
        <h1 class="hero-title reveal" id="hero-title">Let's talk about the F** word.</h1>
        <p class="brief-fat" data-fat-reveal>FAT.</p>

        <div class="hero-dock">
          <p class="hero-lede reveal">
            We've spent decades talking about how to lose it. Maybe it's time we talked about the fat worth keeping.
          </p>
          <div class="path-buttons reveal">
            <a class="btn" href="patient.html">For the fat curious</a>
            <a class="btn btn--ghost" href="provider.html">For the fat experts</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="pg-section pg-section--tall" aria-labelledby="more-title">
    <div class="wrap pg-statement">
      <h2 class="statement-title reveal" id="more-title">There's more to fat <span>than losing it.</span></h2>
      <div class="panel reveal">
        <p>Fat has been something we've been encouraged to lose, reduce, or eliminate. But fat plays an important role in giving our faces their natural contours, softness, and fullness. As we age and lose facial fat, we can begin to look tired or older than we feel.</p>
      </div>
    </div>
  </section>

  <section class="reframe-film" id="reframe" data-theme="light" aria-labelledby="reframe-title">
    <video class="reframe-unbox" autoplay muted loop playsinline preload="auto" src="https://media.lipoderma.com/videos/oh-yeah-unboxing.mp4"></video>
    <div class="reframe-overlay wrap">
      <h2 class="display h2" id="reframe-title">Meet <span>Lipoderma</span>.</h2>
      <p class="reframe-ask">What if the answer to lost fat was simply... fat?</p>
      <p>Lipoderma takes a different approach to natural-looking rejuvenation, using human adipose tissue to restore lost fat where it belongs. Fat for fat.</p>
      <p>Because sometimes, looking like yourself again isn't about changing something. It's about restoring what was there all along.</p>
      <p class="restore-mark">Restore What’s Yours™</p>
    </div>
  </section>

  <section class="pg-section pg-section--tall" aria-labelledby="paths-title">
    <div class="wrap">
      <h2 class="statement-title statement-title--sm reveal" id="paths-title">Where to <span>next?</span></h2>
      <div class="path-cards">
        <a class="path-card panel reveal" href="patient.html">
          <span class="path-card-kicker">Patients</span>
          <h3>For the Fat Curious</h3>
          <p>What changes with time, what Lipoderma is, and what to expect.</p>
          <span class="arrow-link">Start here <span aria-hidden="true">→</span></span>
        </a>
        <a class="path-card panel reveal" href="provider.html">
          <span class="path-card-kicker">Providers</span>
          <h3>For the Fat Experts</h3>
          <p>Your aesthetic toolkit just got a little fatter.</p>
          <span class="arrow-link">Start here <span aria-hidden="true">→</span></span>
        </a>
      </div>
    </div>
  </section>
"""
    script = """<script>
  const fat = document.querySelector('[data-fat-reveal]');
  if (fat) {
    const show = () => fat.classList.add('is-in');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) show();
    else setTimeout(show, 900);
  }
</script>
<script type="module" src="js/motion.js?v=%s"></script>
""" % V
    return out + footer(script)


# ───────────────────────────── PATIENT ─────────────────────────────
COMPARE = [
    ("What’s it made of?", ["Hyaluronic acid gel", "PLLA or calcium hydroxylapatite (CaHA)", "Patient’s own fat, approximately 90% adipocytes / 10% ECM", "Donated adipose-derived matrix, 100% ECM", "Donated human adipose tissue, approximately 90% adipocytes / 10% ECM"]),
    ("How does it work?", ["Adds gel-based volume", "Stimulates the body’s natural collagen production over time", "Transfers the patient’s own fat to restore volume", "Provides a matrix that supports tissue remodeling", "Replaces fat with fat, followed by gradual tissue remodeling and host tissue replacement"]),
    ("When will I see results?", ["Immediate", "Gradual, over several weeks to months as collagen production increases", "Immediate volume, with results evolving over several months", "Gradual, over several months", "Immediate volume, with results evolving over several months"]),
    ("How long does it last?", ["Typically 6–18 months", "Typically 12–24 months, depending on product", "Potentially long-lasting, depending on fat survival", "Up to 12–24 months anticipated", "Up to 12–24 months anticipated; longer-term outcomes still being monitored"]),
    ("Will I need more than one session?", ["Maintenance treatments are common", "May require a series or maintenance", "Additional fat transfer may be needed", "Additional treatment may be recommended", "Reassessment at 3–6 months; touch-up may be recommended"]),
    ("Does it require liposuction?", ["No", "No", "Yes", "No", "No"]),
]

BA_PAIRS = [
    ("Midface", "midface-front-beccio"),
    ("Jawline", "jawline-beccio-profile"),
    ("Under-eyes", "under-eyes-woodby"),
    ("Hands", "hands-woodby"),
]


def compare_table():
    heads = ["HA Fillers", "Biostimulators<small>Sculptra / Radiesse</small>", "Autologous Fat Transfer", "Renuva", "Lipoderma"]
    th = "".join(f'<th scope="col"{" class=\"is-lipo\"" if i == 4 else ""}>{h}</th>' for i, h in enumerate(heads))
    rows = ""
    for q, cells in COMPARE:
        tds = "".join(f'<td data-label="{re.sub("<[^>]+>", "", heads[i])}"{" class=\"is-lipo\"" if i == 4 else ""}>{esc(c)}</td>' for i, c in enumerate(cells))
        rows += f'<tr><th scope="row">{esc(q)}</th>{tds}</tr>\n'
    return f"""<div class="table-scroll">
        <table class="compare-table">
          <thead>
            <tr class="group-row"><th></th><th colspan="2">Traditional aesthetic products</th><th colspan="3">Fat-based restoration</th></tr>
            <tr><th scope="col">Comparison</th>{th}</tr>
          </thead>
          <tbody>
{rows}          </tbody>
        </table>
      </div>"""


def page_patient():
    out = head("For the Fat Curious", "patient.html") + header("patient.html")
    out += pg_hero("For the fat curious", "Some things are worth <span>holding on to.</span>", "The way you see yourself is one of them.")
    out += panel("""      <p>There's something about looking in the mirror and noticing little changes. Maybe your cheeks aren't quite as full. Maybe your face looks a little more tired than you feel. Nothing dramatic. Just subtle changes that add up over time.</p>
      <p>And while we spend so much time talking about our skin, sometimes what's changed isn't the skin at all. It's what's beneath it.</p>""")
    out += panel("""      <h2>Let's talk about <span>fat.</span></h2>
      <p>Facial fat plays an essential role in giving our faces their natural contours, softness, and fullness. Beneath the skin, fat pads provide structural support, helping maintain the smooth transitions that contribute to a naturally refreshed appearance.</p>
      <p>Over time, whether through aging, weight loss, or other factors, these fat pads can diminish or shift, changing the contours we've come to recognize as our own.</p>""")
    out += panel("""      <h2>Meet <span>Lipoderma.</span></h2>
      <p class="ask">What if the answer to lost fat was simply... fat?</p>
      <p>Lipoderma offers a different approach to natural-looking rejuvenation, using human adipose tissue to help restore lost fat and bring back the natural contours, softness, and fullness that make your face uniquely yours.</p>
      <p>The little details that make a face familiar. The ones you've seen in the mirror a thousand times and never really thought twice about. Until one day, you do.</p>
      <p class="restore-mark">Restore What's Yours™</p>""")
    out += panel("""      <h2>Hear it from <span>patients.</span></h2>
      <div class="video-grid">
      """ + video("https://media.lipoderma.com/videos/patient-laura.mp4", "Laura, for patients.") + """
      """ + video("https://media.lipoderma.com/videos/happy-client.mp4", "Happy client. (Needs to be trimmed.)") + """
      </div>
      <p class="muted-note">Patient testimonials and quotes to come.</p>""")
    out += panel("""      <h2>Fat has a glow-up era, <span>too.</span></h2>
      <p class="kicker">What to expect with Lipoderma</p>
      <p>Lipoderma provides immediate volume, but the journey doesn't stop there. As the implanted tissue remodels, results continue to evolve over time.</p>
      <p>Some patients may notice a temporary softening in fullness as the implanted tissue gradually remodels and is replaced by their own tissue. Over time, this natural process contributes to the evolving appearance of the restored area.</p>
      <p><strong>Think of the first 3–6 months as your fat's glow-up era.</strong> Your results are still evolving, and your provider may recommend a touch-up during this time to help optimize fullness and contours.</p>
      <ol class="timeline">
        <li><span>Day 1</span>Immediate volume</li>
        <li><span>Months 1–3</span>Gradual remodeling</li>
        <li><span>Months 3–6</span>Your own tissue takes over</li>
      </ol>
      <div class="ph-slot">""" + ph("Glow-up animation", "Animation TBD", "16/6") + "</div>")

    # Fat looks good on you: before/afters + find a provider + comparison
    figs = ""
    for label, stem in BA_PAIRS:
        figs += f"""        <figure class="ba">
          <div class="ba-pair">
            <div><img src="img/gallery/{stem}-before.webp" alt="{label}, before" loading="lazy" /><span>Before</span></div>
            <div><img src="img/gallery/{stem}-after.webp" alt="{label}, after" loading="lazy" /><span>After</span></div>
          </div>
          <figcaption>{label}</figcaption>
        </figure>
"""
    out += f"""
  <section class="pg-section" id="results">
    <div class="wrap">
      <h2 class="statement-title reveal">Fat looks good <span>on you.</span></h2>
      <div class="panel reveal">
        <h3 class="panel-sub">Before &amp; afters</h3>
        <div class="ba-grid">
{figs}        </div>
      </div>
    </div>
  </section>
"""
    out += panel("""      <h2>Before you fill. <span>Let’s talk fat.</span></h2>
      """ + compare_table(), "panel--wide")

    out += """
  <section class="section section--dark" id="providers" data-theme="light" aria-labelledby="providers-title">
    <div class="wrap">
      <div class="providers-head">
        <div class="providers-intro">
          <h2 class="display h2 reveal" id="providers-title">Find a <span class="serif-italic">provider.</span></h2>
          <p class="muted">Lipoderma is placed only by licensed physicians trained on the product.</p>
        </div>
        <div class="provider-lead reveal">
          <div class="provider-search">
            <label class="visually-hidden" for="provider-search">Search providers</label>
            <input id="provider-search" type="search" placeholder="Provider name, city, state, or ZIP"
                   autocomplete="off" role="combobox" aria-expanded="false" aria-controls="provider-suggest" data-provider-search />
            <button type="button" data-provider-locate>Use my location</button>
          </div>
          <div class="provider-suggest" id="provider-suggest" role="listbox" data-provider-suggest hidden></div>
        </div>
        <p class="provider-status" data-provider-status aria-live="polite"></p>
      </div>
      <div class="provider-shell reveal">
        <div class="provider-map" id="provider-map" data-provider-map></div>
        <div class="provider-list" id="provider-list" data-provider-list></div>
      </div>
    </div>
  </section>
"""
    out += panel("""      <h2>Join The F** <span>Club.</span></h2>
      <p class="kicker">Membership has its perks.</p>
      <form class="club-form" data-club-form>
        <input type="hidden" name="utm_campaign" data-utm-field="utm_campaign" />
        <input type="hidden" name="utm_source" data-utm-field="utm_source" />
        <input type="hidden" name="utm_medium" data-utm-field="utm_medium" />
        <label>Email<input type="email" name="email" required autocomplete="email" /></label>
        <label>Location<input type="text" name="location" required placeholder="City, state, or ZIP" autocomplete="postal-code" /></label>
        <button class="btn" type="submit">Join the club</button>
        <p class="club-ok" data-club-ok role="status" hidden>You're in. We'll be in touch.</p>
      </form>""", "panel--form", "club")
    return out + footer()


# ───────────────────────────── PROVIDER ─────────────────────────────
def page_provider():
    out = head("For the Fat Experts", "provider.html") + header("provider.html")
    out += pg_hero("For the fat experts", "Your aesthetic toolkit just got a <span>little fatter.</span>")
    out += panel("""      <h2>Meet <span>Lipoderma.</span></h2>
      <p>A human adipose tissue allograft offering a different approach to restoring lost adipose tissue, without the need for autologous fat harvesting.</p>""")
    out += panel("""      <h2>Fat for fat. <span>Ready to use.</span></h2>
      <p>Lipoderma offers a convenient option for like-for-like adipose tissue restoration in the face and other smaller-volume applications. Whether addressing adipose tissue loss associated with aging, weight loss, or other factors, Lipoderma expands the aesthetic toolkit with a like-for-like approach to restoring natural contours, softness, and fullness.</p>""")
    out += """
  <section class="pg-section pg-section--tall" aria-labelledby="fifty-title">
    <div class="wrap pg-callout reveal">
      <p class="pg-eyebrow">Availability</p>
      <h2 class="statement-title" id="fifty-title">50 states. <span>One fat solution.</span></h2>
      <p class="callout-copy">The only off-the-shelf adipose tissue allograft available in all 50 states.</p>
    </div>
  </section>
"""
    out += panel("""      <h2>Hear from your <span>peers.</span></h2>
      """ + ph("Provider testimonials", "Provider testimonials? To be confirmed", "16/7"))
    out += panel("""      <h2>Explore the <span>evidence.</span></h2>
      <p>Discover more about Lipoderma's tissue sourcing, safety, and published research.</p>
      <div class="btn-row">
        <a class="btn" href="safety.html">Explore safety</a>
        <a class="btn btn--ghost" href="receipts.html">View receipts</a>
      </div>""")
    out += panel("""      <h2>Ready to bring Lipoderma <span>into your practice?</span></h2>
      <div class="btn-row">
        <a class="btn" href="mailto:brighterlives@britecyte.com?subject=Become%20a%20Lipoderma%20provider">Become a provider</a>
        <a class="btn btn--ghost" href="#" aria-disabled="true">Access provider portal</a>
      </div>
      <p class="muted-note">Portal link to come.</p>""")
    out += """
  <section class="pg-section pg-section--tall" aria-labelledby="pr-title">
    <div class="wrap pg-callout reveal">
      <h2 class="statement-title" id="pr-title">Fat deserves <span>better PR.</span></h2>
      <p class="callout-copy">You’re hired.</p>
    </div>
  </section>
"""
    return out + footer()


# ───────────────────────────── SAFETY ─────────────────────────────
def page_safety():
    out = head("Safety & Standards", "safety.html") + header("safety.html")
    out += pg_hero("Safety &amp; standards", "Good fat. <span>High standards.</span>", "Where your fat comes from matters.")
    out += panel("""      <p>Lipoderma is made from donated human adipose tissue. And when it comes to human tissue, there's no room for cutting corners.</p>
      <p>From donor screening and tissue recovery to processing, testing, and distribution, Lipoderma is subject to established standards designed to support tissue quality and safety.</p>""")
    out += panel("""      <h2>Let's talk about where <span>the fat comes from.</span></h2>
      <div class="facility">
        <div class="facility-copy">
          <h3>LifeLink Tissue Bank</h3>
          <p class="where">Tampa, Florida</p>
          <p>With more than 40 years of experience, LifeLink is the largest nonprofit tissue bank in the Southeast and one of the largest in the United States.</p>
          <p>As an <strong>AATB-accredited, FDA-registered tissue bank</strong>, LifeLink maintains rigorous standards for donor screening, tissue recovery, processing, and quality assurance. Its comprehensive donor evaluation process includes medical and social history reviews, infectious-disease testing, and oversight by licensed physician medical directors.</p>
          <p>LifeLink's decades of experience reflect a longstanding commitment to honoring the gift of donation while prioritizing tissue quality and recipient safety.</p>
          <a class="arrow-link" href="https://lifelinktissuebank.org/health-professionals/certifications/" target="_blank" rel="noopener">View LifeLink's certifications &amp; licenses <span aria-hidden="true">→</span></a>
        </div>
        """ + ph("LifeLink facility", "Photo of facility TBD", "4/3") + """
      </div>
      <hr class="facility-rule" />
      <div class="facility">
        <div class="facility-copy">
          <h3>BBG Advanced Therapies</h3>
          <p class="where">Part of BioBridge Global · San Antonio, Texas</p>
          <p>BBG Advanced Therapies is part of the BioBridge Global family of nonprofit organizations, with more than 50 years of collective experience supporting blood, tissue, and advanced therapies.</p>
          <p>As an FDA-registered tissue establishment, BBGAT brings specialized manufacturing and tissue processing capabilities, experienced scientific personnel, and established quality systems.</p>
          <p>BBGAT maintains additional certifications and state tissue banking licenses, reflecting its commitment to quality, safety, and regulatory compliance.</p>
          <a class="arrow-link" href="https://biobridgeglobal.org/certifications/" target="_blank" rel="noopener">View BBG Advanced Therapies' certifications &amp; licenses <span aria-hidden="true">→</span></a>
        </div>
        """ + ph("BBG Advanced Therapies facility", "Photo of facility TBD", "4/3") + """
      </div>""", "panel--wide")
    out += panel("""      <h2>FDA-regulated. <span>Let's get that straight.</span></h2>
      <p>FDA-regulated and FDA-approved aren't the same thing. And that's okay!</p>
      <p>Lipoderma is regulated by the FDA as a human cell and tissue-based product (HCT/P) under Section 361 of the Public Health Service Act.</p>
      <p>Unlike drugs and certain medical devices, products that qualify under this category do not require FDA premarket approval. Instead, they must meet specific regulatory criteria and follow FDA requirements for donor screening, tissue processing, storage, labeling, and distribution.</p>
      <p>The important takeaway? Lipoderma is FDA-regulated, not FDA-approved. That's how qualifying products in this category are regulated.</p>""")
    out += panel("""      <h2>Safety is always <span>in style.</span></h2>
      <p>We take safety seriously. And we believe in being transparent about it.</p>
      <p>Like any procedure involving implanted human tissue, Lipoderma carries potential risks, including infection, inflammatory reactions, and other complications.</p>
      <p>Donor screening, infectious-disease testing, and specialized processing are important safeguards, but no human tissue product or implantation procedure is completely without risk.</p>
      <p>An experienced provider can help determine whether Lipoderma is appropriate and explain what to expect before implantation.</p>""")
    out += panel("""      <h2>Questions? <span>We love a curious mind.</span></h2>
      <p>There's plenty more to know about fat. And we're happy to talk about it.</p>
      <div class="btn-row"><a class="btn" href="faq.html">Explore the fat facts</a></div>""")
    return out + footer()


# ───────────────────────────── FAQ (parsed from the doc) ─────────────────────────────
def parse_faq():
    lines = DOC.read_text(encoding="utf-8").splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith("**1. Let's Talk Fat"))
    end = next(i for i, l in enumerate(lines) if l.startswith("**THE RECEIPTS"))
    block = [l.rstrip() for l in lines[start:end]]
    groups, group, item = [], None, None
    for raw in block:
        s = raw.strip()
        if not s:
            continue
        m = re.match(r"^\*\*(\d)\. (.+?)\*\*$", s)
        if m:
            group = {"num": m.group(1), "title": m.group(2), "sub": "", "items": []}
            groups.append(group)
            item = None
            continue
        if group is None:
            continue
        if re.match(r"^\*\*.+\*\*(\s*\*\*.+\*\*)*$", s) and not s.startswith("**Fat looks good"):
            q = " ".join(re.findall(r"\*\*(.+?)\*\*", s))
            item = {"q": q.strip(), "a": []}
            group["items"].append(item)
            continue
        if s.startswith("**Fat looks good"):
            break
        if item is None:
            group["sub"] = s.strip("*")
        else:
            item["a"].append(s)
    return groups


def page_faq():
    groups = parse_faq()
    out = head("Fat Facts", "faq.html") + header("faq.html")
    out += pg_hero("Fat facts", "Let's get the <span>Fat Facts.</span>", "Big questions. Real answers. No beating around the F word.")
    out += panel("""      <p class="kicker">Fat deserves better PR. And we're here to set the record straight.</p>
      <p>From what Lipoderma actually is to where the fat comes from and what to expect, we've got answers to the questions worth asking.</p>
      <nav class="faq-jump" aria-label="FAQ sections">
""" + "\n".join(f'        <a href="#faq-{g["num"]}"><span>{g["num"]}</span>{esc(g["title"])}</a>' for g in groups) + "\n      </nav>")
    for g in groups:
        items = ""
        for it in g["items"]:
            paras = "\n".join(f"                <p>{inline(p)}</p>" for p in it["a"])
            items += f"""            <div class="faq-item">
              <button class="faq-q" aria-expanded="false">{esc(it['q'])} <i aria-hidden="true"></i></button>
              <div class="faq-a"><div>
{paras}
              </div></div>
            </div>
"""
        out += f"""
  <section class="pg-section" id="faq-{g['num']}">
    <div class="panel reveal faq-panel" data-faq>
      <p class="faq-num">{g['num']}</p>
      <h2>{esc(g['title'].rstrip('.'))}<span>.</span></h2>
      <p class="kicker">{inline(g['sub'])}</p>
      <div class="faq-list">
{items}      </div>
    </div>
  </section>
"""
    out += """
  <p class="pg-foot reveal">Fat looks good on you. · <a href="patient.html#providers">Find a provider</a></p>
"""
    return out + footer()


# ───────────────────────────── RECEIPTS ─────────────────────────────
def page_receipts():
    out = head("The Receipts", "receipts.html") + header("receipts.html")
    out += pg_hero("The receipts", "Show us the <span>receipts.</span>", "Published research on Lipoderma.")
    cards = ""
    for name in ["Beccio", "Chernoff 1", "Danilkovitch", "Chernoff 2"]:
        cards += f"""        <li class="receipt">
          <h3>{name}</h3>
          <p class="muted-note">Citation, abstract, and link to come.</p>
        </li>
"""
    out += panel(f"""      <ol class="receipts">
{cards}      </ol>""")
    out += panel("""      <h2>Patient <span>testimonials.</span></h2>
      <div class="video-grid">
      """ + video("https://media.lipoderma.com/videos/patient-laura.mp4", "Laura, for patients.") + """
      """ + video("https://media.lipoderma.com/videos/happy-client.mp4", "Happy client.") + """
      </div>""", "panel--wide")
    return out + footer()


def main():
    pages = {
        "index.html": page_home,
        "patient.html": page_patient,
        "provider.html": page_provider,
        "safety.html": page_safety,
        "faq.html": page_faq,
        "receipts.html": page_receipts,
    }
    for name, fn in pages.items():
        (ROOT / name).write_text(fn(), encoding="utf-8")
        print("wrote", name)


if __name__ == "__main__":
    main()
