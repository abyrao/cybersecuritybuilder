/* BC-03 map layout: fixed lanes and site bands, so the room sees the same picture every time. */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const COLW = 104, NODEW = 94, NODEH = 54, ROWH = 88, GUT = 122, BANDGAP = 14, TOP = 44, LANEGAP = 10;
  const SVCW = 140, SVCH = 60;
  const BANDS = [
    { site: "DC1", cols: 6, label: "Primary DC" },
    { site: "DC2", cols: 2, label: "Secondary DC" },
    { site: "CE", cols: 3, label: "Cloud East" },
    { site: "CW", cols: 1, label: "Cloud West" },
    { site: "SaaS", cols: 3, label: "SaaS" },
  ];
  const LANES = [
    { name: "Business services", rows: 1, label: ["Business", "services"] },
    { name: "Applications", rows: 2, label: ["Applications"] },
    { name: "Integration", rows: 1, label: ["Integration"] },
    { name: "Data", rows: 1, label: ["Data"] },
    { name: "Shared services", rows: 1, label: ["Shared", "services"] },
    { name: "Platforms", rows: 1, label: ["Platforms"] },
    { name: "Network", rows: 2, label: ["Network"] },
    { name: "Facilities", rows: 1, label: ["Facilities"] },
  ];
  // explicit order inside a lane and band (keeps related assets close)
  const ORDER = {
    "Business services": ["S01", "S06", "S05", "S07", "S11", "S03", "S04", "S08", "S02", "S09", "S10"],
    "Applications|DC1": ["A02", "A03", "A10", "A01", "A09", "A12", "A18", "A04", "A05", "A06", "A14"],
    "Data|DC1": ["D02", "D01", "D05", "D03"],
    "Shared services|DC1": ["H05", "H01", "H07", "H04", "H06"],
    "Network|DC1": ["N04", "N07", "N01", "N02", "N09", "N10", "C1"],
    "Network|DC2": ["N06", "N05"],
    "Platforms|DC1": ["P01", "P05"],
    "Platforms|DC2": ["P02", "P06"],
    "Applications|CE": ["A07", "A08", "A13", "A19"],
    "Data|CE": ["D04", "D07", "D06"],
  };
  const EXT_ORDER = ["X01", "X07", "X03", "X02", "X05", "X08", "X06"];
  const SHORT = {
    H04: "Admin vault", A14: "AML and sanctions", N07: "Branch SD-WAN", N10: "Backup VPN", N09: "Private cloud link",
    I02: "Service bus", I03: "File transfer", D07: "Fraud features", D04: "Digital DB", H02: "Cloud SSO, MFA",
    H06: "PKI and certs", A08: "Mobile API", A15: "Treasury", A19: "Reg reporting", A16: "Contact center",
    N03: "Edge and DDoS", F1: "Primary DC site", F2: "Secondary DC site", R1: "Cloud East region", R2: "Cloud West region",
    C1: "Street fiber entry", X06: "Sanctions feed", X07: "ATM partner", X08: "Telephony carrier", A10: "ATM switch",
    A02: "Card auth", A03: "Card mgmt", D01: "Core banking DB", P01: "VM cluster DC1", P02: "VM cluster DC2",
    P05: "SAN DC1", P06: "SAN DC2", N04: "Core network DC1", N06: "Core network DC2", N05: "ISP circuits DC2",
    H10: "Backup and vault", H07: "Internal DNS", H01: "Active Directory", H05: "HSM cluster", H08: "Email and chat",
    A11: "Loan origination", A12: "Loan servicing", A18: "General ledger", A06: "ACH gateway", A05: "Wire gateway",
    A04: "Payments hub", A09: "Teller platform", A07: "Online banking", A13: "Fraud detection", A17: "CRM",
    S06: "ATM network", S09: "Treasury, liquidity", S11: "Finance, reporting",
  };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function wrap(text, max) {
    const words = text.split(" "), lines = [""];
    words.forEach((w) => {
      const cur = lines[lines.length - 1];
      if (!cur) lines[lines.length - 1] = w;
      else if ((cur + " " + w).length <= max) lines[lines.length - 1] = cur + " " + w;
      else lines.push(w);
    });
    return lines.slice(0, 2);
  }
  function hShort(h) {
    if (h === null || h === undefined) return "–";
    if (h === 0) return "0";
    if (h < 1) return Math.round(h * 60) + "m";
    return (Math.round(h * 100) / 100) + "h";
  }

  function compute(topology) {
    const pos = {};
    // band x
    let x = GUT;
    const bandX = {};
    BANDS.forEach((b) => { bandX[b.site] = x; b.x = x; b.w = b.cols * COLW; x += b.w + BANDGAP; });
    const extX = x + 16;
    const width = extX + COLW + 12;
    // lane y
    let y = TOP;
    const laneY = {};
    LANES.forEach((l) => { l.y = y; l.h = l.rows * ROWH; laneY[l.name] = l; y += l.h + LANEGAP; });
    const height = y + 4;
    const nodes = topology.nodes;
    // services: spread across all bands
    const svc = ORDER["Business services"];
    const svcEnd = BANDS[BANDS.length - 1].x + BANDS[BANDS.length - 1].w;
    const span = svcEnd - GUT, step = span / svc.length;
    svc.forEach((id, i) => {
      pos[id] = { x: GUT + step * i + (step - SVCW) / 2, y: laneY["Business services"].y + (ROWH - SVCH) / 2 + 2, w: SVCW, h: SVCH, row: 0 };
    });
    // other lanes by band
    LANES.slice(1).forEach((lane, li) => {
      BANDS.forEach((b) => {
        let ids = nodes.filter((n) => n.lane === lane.name && n.site === b.site).map((n) => n.id);
        const ord = ORDER[lane.name + "|" + b.site];
        if (ord) ids = ord.filter((i) => ids.indexOf(i) >= 0).concat(ids.filter((i) => ord.indexOf(i) < 0));
        const rows = [];
        ids.forEach((id, i) => { const r = Math.floor(i / b.cols); (rows[r] = rows[r] || []).push(id); });
        rows.forEach((row, r) => {
          const off = (b.cols - row.length) * COLW / 2;
          row.forEach((id, c) => {
            pos[id] = { x: b.x + off + c * COLW + (COLW - NODEW) / 2, y: lane.y + r * ROWH + (ROWH - NODEH) / 2, w: NODEW, h: NODEH, row: (li + 1) * 10 + r };
          });
        });
      });
    });
    // third parties column, from applications down to network
    const y0 = laneY["Applications"].y, y1 = laneY["Network"].y + laneY["Network"].h;
    const ext = EXT_ORDER.filter((id) => nodes.some((n) => n.id === id));
    const gap = (y1 - y0 - ext.length * NODEH) / (ext.length - 1);
    ext.forEach((id, i) => { pos[id] = { x: extX + (COLW - NODEW) / 2, y: y0 + i * (NODEH + gap), w: NODEW, h: NODEH, row: 99, ext: true }; });
    return { pos, width, height, extX, laneY };
  }

  function curve(a, b) {
    // a, b: {x,y,w,h,ext?}; returns path from dependent a to dependency b
    const acx = a.x + a.w / 2, bcx = b.x + b.w / 2;
    if (b.ext) {
      const sx = a.x + a.w, sy = a.y + a.h / 2, ex = b.x, ey = b.y + b.h / 2, dx = Math.max(40, (ex - sx) * 0.5);
      return `M${sx},${sy} C${sx + dx},${sy} ${ex - dx},${ey} ${ex},${ey}`;
    }
    const aBot = a.y + a.h, bTop = b.y;
    if (bTop > aBot + 2) {
      const dy = (bTop - aBot) * 0.5;
      return `M${acx},${aBot} C${acx},${aBot + dy} ${bcx},${bTop - dy} ${bcx},${bTop}`;
    }
    if (Math.abs(b.y - a.y) < 4) {
      const by = b.y + b.h, lift = 26 + Math.min(40, Math.abs(bcx - acx) * 0.12);
      return `M${acx},${aBot} C${acx},${aBot + lift} ${bcx},${by + lift} ${bcx},${by}`;
    }
    const aTop = a.y, bBot = b.y + b.h, dy = (aTop - bBot) * 0.5;
    return `M${acx},${aTop} C${acx},${aTop - dy} ${bcx},${bBot + dy} ${bcx},${bBot}`;
  }

  function build(topology, svg) {
    const L = compute(topology), P = L.pos;
    svg.setAttribute("viewBox", `0 0 ${L.width} ${L.height}`);
    svg.innerHTML = "";
    const root = el("g", { class: "map-root" }, svg);
    const gBands = el("g", {}, root), gEdges = el("g", {}, root), gNodes = el("g", {}, root);
    // bands
    BANDS.forEach((b, i) => {
      const g = el("g", { class: "band" + (i % 2 ? " alt" : ""), "data-site": b.site }, gBands);
      el("rect", { x: b.x - 4, y: 8, width: b.w + 8, height: L.height - 12, rx: 14 }, g);
      const t = el("text", { x: b.x + 6, y: 30 }, g); t.textContent = b.label;
    });
    const ge = el("g", { class: "band" }, gBands);
    el("rect", { x: L.extX - 4, y: L.laneY["Applications"].y - 32, width: COLW + 8, height: L.laneY["Network"].y + L.laneY["Network"].h - L.laneY["Applications"].y + 40, rx: 14 }, ge);
    const te = el("text", { x: L.extX + 6, y: L.laneY["Applications"].y - 12 }, ge); te.textContent = "Third parties";
    LANES.forEach((l, i) => {
      if (i) el("line", { class: "lane-line", x1: 8, x2: L.width - 4, y1: l.y - LANEGAP / 2, y2: l.y - LANEGAP / 2 }, gBands);
      l.label.forEach((s, j) => {
        const t = el("text", { class: "lane-label", x: 14, y: l.y + l.h / 2 - (l.label.length - 1) * 8 + j * 16 + 4 }, gBands);
        t.textContent = s;
      });
    });
    // edges
    const edges = [];
    topology.nodes.forEach((n) => {
      const a = P[n.id];
      n.deps.forEach((g, gi) => {
        if (typeof g === "string") {
          const p = el("path", { class: "edge hard", d: curve(a, P[g]) }, gEdges);
          edges.push({ el: p, from: n.id, to: g, kind: "hard" });
        } else {
          const mem = g.any.map((m) => P[m]);
          const below = mem.every((m) => m.y > a.y + a.h);
          const fx = a.x + a.w / 2 + (gi - (n.deps.length - 1) / 2) * 10;
          const fy = below ? a.y + a.h + 16 : a.y + a.h + 16;
          const f = { x: fx - 6, y: fy - 6, w: 12, h: 12 };
          const pin = el("path", { class: "edge hard", d: `M${a.x + a.w / 2},${a.y + a.h} L${fx},${fy - 6}` }, gEdges);
          edges.push({ el: pin, from: n.id, to: g.any, kind: "group" });
          g.any.forEach((m, mi) => {
            const p = el("path", { class: "edge " + (mi === 0 ? "hard" : "alt"), d: curve(f, P[m]) }, gEdges);
            edges.push({ el: p, from: n.id, to: m, kind: mi === 0 ? "primary" : "alt", group: g.any });
          });
          const d = el("rect", { class: "fork", x: fx - 6, y: fy - 6, width: 12, height: 12, rx: 2, transform: `rotate(45 ${fx} ${fy})` }, gEdges);
          const lbl = el("text", { class: "fork-label", x: fx + 10, y: fy + 4 }, gEdges);
          lbl.textContent = "sw " + (g.switch ? hShort(g.switch) : "0");
          edges.push({ el: d, from: n.id, to: g.any, kind: "fork" }, { el: lbl, from: n.id, to: g.any, kind: "forklabel" });
        }
      });
      (n.soft || []).forEach((s) => {
        const p = el("path", { class: "edge soft", d: curve(a, P[s]) }, gEdges);
        edges.push({ el: p, from: n.id, to: s, kind: "soft" });
      });
    });
    // nodes
    const nodeEls = {};
    topology.nodes.forEach((n) => {
      const p = P[n.id], svc = n.lane === "Business services";
      const g = el("g", { class: "node" + (svc ? " svc" : "") + (p.ext ? " ext" : ""), "data-id": n.id, transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "aria-label": n.name }, gNodes);
      el("rect", { class: "burst", x: 0, y: 0, width: p.w, height: p.h, rx: 11 }, g);
      el("rect", { class: "box", x: 0, y: 0, width: p.w, height: p.h, rx: 11 }, g);
      el("rect", { class: "prog", x: 6, y: p.h - 4, width: 0, height: 3, rx: 1.5, fill: "#E0A100" }, g);
      const lines = wrap(SHORT[n.id] || n.name, svc ? 15 : 12);
      const nm = el("text", { class: "nm", x: p.w / 2, "text-anchor": "middle" }, g);
      const top = svc ? 24 : 19;
      lines.forEach((ln, i) => {
        const ts = el("tspan", { x: p.w / 2, y: (lines.length === 1 ? top + 6 : top) + i * (svc ? 17 : 14.5) }, nm);
        ts.textContent = ln;
      });
      const meta = el("text", { class: "meta", x: p.w / 2, y: p.h - 8, "text-anchor": "middle" }, g);
      meta.textContent = n.rto == null ? (n.vendor ? "vendor" : "facility") : `RTO ${hShort(n.rto)} · RPO ${hShort(n.rpo)}`;
      let st = "na";
      if (!svc && !n.vendor && n.restore_h) st = !n.last_tested ? "never" : (n.last_tested < "2025-10" ? "stale" : "fresh");
      el("circle", { class: "dot " + st, cx: p.w - 8, cy: 8, r: 4.5 }, g);
      nodeEls[n.id] = { g, meta, prog: g.querySelector(".prog"), base: meta.textContent, w: p.w };
    });
    return { L, P, edges, nodeEls, root, hShort };
  }

  root.Layout = { build, hShort, SHORT, BANDS };
})(window);
