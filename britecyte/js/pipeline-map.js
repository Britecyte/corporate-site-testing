/**
 * Interactive pipeline map — node click/hover reveals outline prose.
 */
const PIPE_COPY = {
  lipoderma: {
    title: "Lipoderma®",
    eyebrow: "Cosmetic & Reconstructive · Commercial",
    lead: "Natural rejuvenation starts by restoring what's yours.",
    body: [
      "Lipoderma is a human adipose tissue allograft designed to restore the structural tissue beneath the skin. As it becomes part of the patient's own tissue over time, it helps restore the supportive layer beneath the skin that contributes to natural softness and contour.",
      "Rather than simply filling space, Lipoderma is designed to restore what has been lost—supporting natural rejuvenation from within while helping patients look refreshed, confident, and like themselves again.",
    ],
    link: { href: "https://lipoderma.com", label: "Visit Lipoderma.com →" },
  },
  liposana: {
    title: "Liposana®",
    eyebrow: "Foot & Ankle · Commercial",
    lead: "Restoring cushioning where it's needed most.",
    body: [
      "Liposana is a human adipose tissue allograft designed for the replacement of damaged or diminished fat pads in the foot. The natural fat pad plays a critical role in cushioning the foot, absorbing shock, and protecting underlying structures during walking and standing. Liposana provides clinicians with a ready-to-use option for restoring soft tissue in areas where this natural protection and cushioning has been lost.",
      "Common clinical applications include fat pad atrophy and other associated conditions: metatarsalgia, plantar pre-ulcerative lesions, plantar chronic wounds, Morton’s neuroma, and soft tissue reconstructive procedures.",
    ],
  },
  "brc-oa": {
    title: "BRC-OA",
    eyebrow: "Orthopedics · Clinical",
    lead: "Advancing a new approach to restoring joint function.",
    body: [
      "Osteoarthritis (OA) is the most common form of arthritis and a leading cause of pain and disability worldwide. Current treatment options primarily focus on managing symptoms, while many patients ultimately progress to joint replacement surgery. There remains a significant need for therapies that address the underlying disease process.",
      "BRC-OA is an investigational biologic therapy being developed for the treatment of knee osteoarthritis. Unlike current therapies that primarily focus on symptom management, BRC-OA is designed to address the underlying osteoarthritis pathophysiology.",
      "The U.S. Food and Drug Administration (FDA) has cleared Britecyte's Investigational New Drug (IND) application for BRC-OA, enabling the initiation of a Phase 1/2a clinical trial evaluating its safety and potential in patients with knee osteoarthritis.",
      "Clinical focus includes joint pain and inflammation, restoring mobility and function, and disease modification: delay OA progression or reverse it.",
    ],
  },
  "brc-liver": {
    title: "BRC-Liver",
    eyebrow: "Liver Disease · Preclinical",
    lead: "Advancing a new approach to restoring liver function.",
    body: [
      "BRC-Liver is an investigational biologic therapy being developed for the treatment of metabolic dysfunction-associated steatotic liver disease (MASLD) and its progressive form, metabolic dysfunction-associated steatohepatitis (MASH). It is an engineered adipose therapy comprised of an adipose-derived stem cells and tissue. By leveraging Britecyte's adipose platform technology, BRC-Liver is designed to address adipose dysfunction, a root cause of the complex inflammatory and fibrotic processes that drive disease progression while supporting the liver's natural ability to repair. BRC-Liver has demonstrated reductions in hepatic inflammation and fibrosis in preclinical models of MASLD/MASH.",
      "To advance the BRC-Liver therapy from preclinical into the clinical development phase our current research is focused on understanding BRC-Liver mechanisms of action in MASLD/MASH treatment, optimization of BRC-Liver therapeutic doses and treatment regimen, and optimization of the manufacturing process and testing.",
    ],
  },
  "brc-wound": {
    title: "BRC-Wound",
    eyebrow: "Chronic Wounds · Preclinical",
    lead: "Advancing a new approach to restoring the body's ability to heal.",
    body: [
      "BRC-Wound is an investigational biologic therapy being developed for the treatment of chronic ischemic wounds in peripheral arterial disease (PAD) patients. It is an engineered adipose therapy comprised of an adipose-derived stem cells and tissue. By leveraging Britecyte's adipose platform technology, BRC-Wound is designed to restore the microvasculature and create the biological environment needed to support tissue repair and healing. In preclinical studies, BRC-Wound demonstrated rapid vascularization and accelerated wound closure in a challenging ischemic wound model.",
      "Our current BRC-Wound research focuses include optimization of the therapeutic formulation, optimization of manufacturing and quality testing, and evaluation of next-generation formulations in preclinical ischemic wound models.",
    ],
  },
};

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function detailHtml(key) {
  const item = PIPE_COPY[key];
  if (!item) return "";
  const paras = item.body.map((p) => `<p>${esc(p)}</p>`).join("");
  const link = item.link
    ? `<p class="pipe-detail-link"><a href="${esc(item.link.href)}" target="_blank" rel="noopener noreferrer">${esc(item.link.label)}</a></p>`
    : "";
  return `
    <p class="microtype pipe-detail-eyebrow">${esc(item.eyebrow)}</p>
    <h3 class="font-display pipe-detail-title">${esc(item.title)}</h3>
    <p class="pipe-detail-lead">${esc(item.lead)}</p>
    <div class="pipe-detail-body">${paras}</div>
    ${link}
  `;
}

export function initPipelineMap() {
  const root = document.querySelector("[data-pipe-map]");
  if (!root) return;

  const detail = root.querySelector("[data-pipe-detail]");
  const nodes = Array.from(root.querySelectorAll("[data-pipe-node]"));
  if (!detail || !nodes.length) return;

  detail.innerHTML = nodes
    .map((node) => `<div class="pipe-detail-item" data-pipe-item="${esc(node.dataset.pipeNode)}">${detailHtml(node.dataset.pipeNode)}</div>`)
    .join("");
  const items = Array.from(detail.querySelectorAll("[data-pipe-item]"));

  const setActive = (key) => {
    nodes.forEach((node) => {
      const on = node.dataset.pipeNode === key;
      node.classList.toggle("is-active", on);
      node.setAttribute("aria-pressed", String(on));
    });
    detail.classList.remove("is-updating");
    items.forEach((item) => {
      const on = item.dataset.pipeItem === key;
      item.classList.toggle("is-active", on);
      item.setAttribute("aria-hidden", String(!on));
    });
    detail.dataset.active = key;
    requestAnimationFrame(() => detail.classList.add("is-updating"));
  };

  nodes.forEach((node) => {
    const key = node.dataset.pipeNode;
    node.addEventListener("click", () => setActive(key));
    node.addEventListener("focus", () => setActive(key));
  });

  setActive(nodes[0].dataset.pipeNode);
}
