/* OC-02 · seeded estate generator: accounts, networks, subnets, storage, firewalls, rules, config, 90-day history.
   Replace with real exports (CSPM, cloud config APIs) later. Pure. */
(function (root) {
  const B = root.B, DAY = 864e5, TODAY = "2026-10-27";
  const T0 = Date.parse(TODAY + "T12:00:00Z");
  const ago = n => new Date(T0 - n * DAY).toISOString().slice(0, 10);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const BUS = [
    { id: "PAY", name: "Payroll", team: "Payroll Platform", cls: "restricted", tier: 1 },
    { id: "CXP", name: "Customer Platform", team: "Customer Platform Eng", cls: "confidential", tier: 1 },
    { id: "DATA", name: "Data & Analytics", team: "Data Engineering", cls: "confidential", tier: 2 },
    { id: "MOB", name: "Mobile", team: "Mobile Backend", cls: "internal", tier: 1 },
    { id: "PTR", name: "Partner Integrations", team: "Partner Integrations", cls: "confidential", tier: 2 },
    { id: "CORP", name: "Corporate IT", team: "Corporate Cloud", cls: "internal", tier: 2 }
  ];
  const STYPES = {
    aws: [["S3 bucket", "object", 30], ["EBS volume", "block", 25], ["EBS snapshot", "snapshot", 15], ["EFS file system", "file", 6], ["FSx file system", "file", 3], ["S3 Glacier vault", "vault", 3], ["AWS Backup vault", "vault", 3]],
    azure: [["Storage account (Blob)", "object", 22], ["Azure Files share", "file", 8], ["Managed disk", "block", 22], ["Disk snapshot", "snapshot", 10], ["Data Lake Storage Gen2", "object", 5], ["Azure NetApp Files volume", "file", 3], ["Recovery Services vault", "vault", 3]],
    gcp: [["Cloud Storage bucket", "object", 28], ["Persistent disk", "block", 24], ["Disk snapshot", "snapshot", 12], ["Filestore instance", "file", 5], ["Backup vault", "vault", 3]],
    oci: [["Object Storage bucket", "object", 24], ["Block volume", "block", 22], ["File Storage file system", "file", 6], ["Archive Storage bucket", "object", 5], ["Pre-authenticated request", "token", 8]],
    alibaba: [["OSS bucket", "object", 26], ["Cloud disk", "block", 24], ["NAS file system", "file", 6], ["Snapshot", "snapshot", 12], ["Hybrid Backup Recovery vault", "vault", 3]],
    ibm: [["Cloud Object Storage bucket", "object", 28], ["Block Storage volume", "block", 22], ["File Storage share", "file", 6], ["Snapshot", "snapshot", 10]]
  };
  const FTYPES = {
    aws: { sg: "Security group", nacl: "Network ACL", fwpolicy: "Network Firewall policy", waf: "WAF web ACL", flowlog: "VPC flow log", vnet: "VPC" },
    azure: { sg: "Network security group", asg: "Application security group", fwpolicy: "Azure Firewall policy", waf: "Application Gateway WAF policy", flowlog: "NSG flow log", vnet: "VNet" },
    gcp: { sg: "VPC firewall rule set", fwpolicy: "Hierarchical firewall policy", waf: "Cloud Armor policy", flowlog: "VPC flow log", vnet: "VPC network" },
    oci: { sg: "Security list", nsg: "Network security group", fwpolicy: "Network Firewall policy", flowlog: "VCN flow log", vnet: "VCN" },
    alibaba: { sg: "Security group", nacl: "Network ACL", fwpolicy: "Cloud Firewall policy", flowlog: "VPC flow log", vnet: "VPC" },
    ibm: { sg: "Security group", nacl: "Network ACL (VPC)", waf: "Cloud Internet Services WAF", flowlog: "Flow log collector", vnet: "VPC" }
  };
  const ACCT_N = { aws: 14, azure: 11, gcp: 7, oci: 6, alibaba: 5, ibm: 5 };
  const BASE_P = { aws: .022, azure: .04, gcp: .036, oci: .07, alibaba: .13, ibm: .13 };
  const CF = { "NET-01": .45, "NET-02": .45, "NET-03": .5, "NET-04": .5, "NET-20": .6, "NET-11": .6, "NET-09": .6, "STG-01": .3, "STG-02": .3, "STG-03": .15, "STG-19": .3, "STG-20": .3, "STG-10": 1.8, "STG-11": 1.8, "STG-21": 1.6, "STG-08": 1.4, "STG-17": 1.5, "NET-07": 0, "NET-15": 1.5, "NET-12": 2.5, "NET-05": .8 };
  const DB = [1433, 1521, 3306, 5432, 6379, 9200, 27017];

  function generate() {
    const r = rng(20261027), pick = a => a[Math.floor(r() * a.length)];
    const accounts = [], networks = [], subnets = [], resources = [];
    let seq = 0; const hex = () => (++seq).toString(16).padStart(5, "0");
    // Accounts
    B.ALL.forEach(cl => { for (let i = 0; i < ACCT_N[cl]; i++) { const bu = BUS[(i + B.ALL.indexOf(cl)) % 6], env = i % 5 === 1 || i % 5 === 3 ? "nonprod" : "prod";
      accounts.push({ id: (bu.id === "PAY" && cl === "aws" && env === "prod" && !accounts.some(a => a.id === "pay-prod")) ? "pay-prod" : bu.id.toLowerCase() + "-" + env + "-" + cl + "-" + (i + 1), cloud: cl, bu: bu.id, env }); } });
    const buOf = id => BUS.find(b => b.id === id);
    // Drift probability for a resource/control
    const pDrift = (res, cid) => BASE_P[res.cloud] * (res.env === "nonprod" ? 1.6 : 1) * (res.deployedBy === "console" ? 1.5 : 1) * (CF[cid] !== undefined ? CF[cid] : 1);
    const sinceDays = () => 3 + Math.floor(Math.pow(r(), 1.6) * 150);
    function storageConfig(res) {
      const cfg = {}, since = {};
      B.CONTROLS.filter(c => c.domain === "storage" && c.kinds.includes(res.kind) && !(c.clouds && !c.clouds.includes(res.cloud))).forEach(c => {
        const drift = r() < pDrift(res, c.id);
        if (c.measure === "binary") cfg[c.id] = !drift;
        else if (c.measure === "min") cfg[c.id] = drift ? pick([0, 1, 3]) : 7 + Math.floor(r() * 24);
        else if (c.measure === "max") cfg[c.id] = c.id === "STG-14" ? (drift ? 120 + Math.floor(r() * 480) : (r() < .5 ? "off" : 20 + Math.floor(r() * 60))) : drift ? Math.round(c.exp * (1.1 + r() * 1.4)) : Math.round(c.exp * (.2 + r() * .7));
        else if (c.measure === "ordinal") cfg[c.id] = drift ? (r() < .5 ? "TLS1.0" : "TLS1.1") : "TLS1.2";
        else if (c.measure === "count") cfg[c.id] = drift ? 1 + Math.floor(r() * 4) : 0;
        if (drift) since[c.id] = ago(sinceDays());
      });
      res.config = cfg; res.since = since;
    }
    const PRIV = ["10.20.0.0/16", "10.40.0.0/16", "10.60.12.0/24", "172.16.0.0/16", "192.168.10.0/24"];
    function sgRules(res) {
      const rules = [], since = {}, web = r() < .3;
      if (res.isDefault) { if (r() < pDrift(res, "NET-05") * 1.5) { rules.push({ port: "all", proto: "all", cidr: pick(PRIV), hit: 5 }); since["NET-05"] = ago(sinceDays()); } res.rules = rules; res.since = since; res.config = {}; return; }
      if (web) { rules.push({ port: 443, proto: "tcp", cidr: "0.0.0.0/0", hit: 0 }); rules.push({ port: 80, proto: "tcp", cidr: "0.0.0.0/0", hit: 1 }); }
      const n = 4 + Math.floor(r() * 9);
      for (let i = 0; i < n; i++) rules.push({ port: pick([8080, 8443, 9000, 5432, 3306, 6379, 22, 443, 2049, 11211]), proto: "tcp", cidr: pick(PRIV), hit: Math.floor(r() * 30) });
      const p = k => r() < pDrift(res, k);
      if (p("NET-01")) { rules.push({ port: 22, proto: "tcp", cidr: "0.0.0.0/0", hit: 2 }); since["NET-01"] = ago(sinceDays()); }
      if (p("NET-02")) { rules.push({ port: 3389, proto: "tcp", cidr: "0.0.0.0/0", hit: 3 }); since["NET-02"] = ago(sinceDays()); }
      if (p("NET-03") && r() < .5) { rules.push({ port: 22, proto: "tcp", cidr: "::/0", v6: true, hit: 4 }); since["NET-03"] = ago(sinceDays()); }
      if (p("NET-04")) { rules.push({ port: pick(DB), proto: "tcp", cidr: pick(["0.0.0.0/0", "34.0.0.0/8", "52.16.0.0/12", "81.2.0.0/16", "198.51.100.0/24"]), hit: 6 }); since["NET-04"] = ago(sinceDays()); }
      if (p("NET-09")) { rules.push({ port: r() < .6 ? "all" : [1024, 65535], proto: "all", cidr: pick(["0.0.0.0/0", "10.0.0.0/8"]), hit: 1 }); since["NET-09"] = ago(sinceDays()); }
      if (p("NET-11")) { rules.push({ port: pick([8080, 9000, 8443]), proto: "tcp", cidr: pick(["0.0.0.0/0", "64.0.0.0/10", "100.64.0.0/10"]), hit: 9 }); since["NET-11"] = ago(sinceDays()); }
      if (p("NET-20")) { rules.push({ port: 22, proto: "tcp", cidr: pick(["45.0.0.0/8", "62.128.0.0/12", "91.198.0.0/16"]), hit: 12 }); since["NET-20"] = ago(sinceDays()); }
      if (p("NET-12")) { const k = 1 + Math.floor(r() * 7); for (let i = 0; i < k; i++) rules.push({ port: pick([8081, 7001, 5000, 6000]), proto: "tcp", cidr: pick(PRIV), hit: 91 + Math.floor(r() * 300) }); since["NET-12"] = ago(sinceDays()); }
      res.rules = rules; res.since = since; res.config = { "NET-17": !p("NET-17") }; if (!res.config["NET-17"]) since["NET-17"] = ago(sinceDays());
    }
    function naclRules(res) { const rules = [{ port: 443, proto: "tcp", cidr: "0.0.0.0/0", hit: 0 }, { port: [1024, 65535], proto: "tcp", cidr: "10.0.0.0/8", hit: 0 }], since = {};
      if (r() < pDrift(res, "NET-06") * 1.5) { rules.push({ port: pick([22, 3389]), proto: "tcp", cidr: "0.0.0.0/0", hit: 3 }); since["NET-06"] = ago(sinceDays()); }
      if (r() < pDrift(res, "NET-11")) { rules.push({ port: 8080, proto: "tcp", cidr: "0.0.0.0/0", hit: 3 }); since["NET-11"] = ago(sinceDays()); }
      res.rules = rules; res.since = since; res.config = {}; }

    accounts.forEach(acc => {
      const bu = buOf(acc.bu), nNets = 3 + (r() < .6 ? 1 : 0);
      const base = { account: acc.id, cloud: acc.cloud, bu: bu.id, team: bu.team, env: acc.env, tier: bu.tier };
      // Storage
      const types = STYPES[acc.cloud], tot = types.reduce((a, t) => a + t[2], 0), nS = 22 + Math.floor(r() * 9);
      for (let i = 0; i < nS; i++) { let x = r() * tot, t = types[0]; for (const ty of types) { x -= ty[2]; if (x <= 0) { t = ty; break; } }
        const cls = r() < .15 ? pick(["internal", "public", "confidential"]) : bu.cls;
        const res = Object.assign({ id: acc.cloud + "-" + t[1] + "-" + hex(), domain: "storage", type: t[0], kind: t[1], classification: cls, deployedBy: r() < .7 ? "module" : "console", privateEndpoint: r() < .3 }, base);
        res.name = acc.id.split("-").slice(0, 2).join("-") + "-" + t[0].split(" ")[0].toLowerCase().replace(/[()]/g, "") + "-" + res.id.slice(-4);
        storageConfig(res); resources.push(res); }
      // Networks, subnets, firewalls
      const ft = FTYPES[acc.cloud];
      for (let n = 0; n < nNets; n++) {
        const net = Object.assign({ id: acc.cloud + "-vnet-" + hex(), domain: "network", type: ft.vnet, kind: "vnet", classification: bu.cls, deployedBy: r() < .75 ? "module" : "console", lb: r() < .35 }, base);
        net.name = acc.id.split("-").slice(0, 2).join("-") + "-" + ["core", "app", "data", "edge"][n] + "-" + ft.vnet.toLowerCase().split(" ")[0];
        const nSub = 3 + (r() < .55 ? 1 : 0); net.subnets = nSub; for (let s = 0; s < nSub; s++) subnets.push({ id: net.id + "-sn" + s, network: net.id });
        const cfg = {}, since = {}, p = k => r() < pDrift(net, k);
        ["NET-10", "NET-13", "NET-14", "NET-15", "NET-16", "NET-18"].forEach(k => { cfg[k] = !p(k); if (!cfg[k]) since[k] = ago(sinceDays()); });
        cfg["NET-07"] = true; net.config = cfg; net.since = since; networks.push(net); resources.push(net);
        const sgs = 2 + Math.floor(r() * 3);
        for (let g = 0; g <= sgs; g++) { const kindName = (acc.cloud === "oci" && g % 2) ? ft.nsg : ft.sg;
          const sg = Object.assign({ id: acc.cloud + "-sg-" + hex(), domain: "network", type: kindName, kind: "sg", network: net.id, classification: bu.cls, deployedBy: r() < .7 ? "module" : "console", isDefault: g === 0, jit: r() < .2 }, base);
          sg.name = g === 0 ? "default" : net.name.replace(/-(vpc|vnet|vcn)$/, "") + "-" + pick(["app", "db", "web", "batch", "mgmt", "api"]) + "-sg-" + sg.id.slice(-3);
          sgRules(sg); resources.push(sg); }
        if (ft.nacl) { const na = Object.assign({ id: acc.cloud + "-nacl-" + hex(), domain: "network", type: ft.nacl, kind: "nacl", network: net.id, name: net.name + "-acl", classification: bu.cls, deployedBy: "module" }, base); naclRules(na); resources.push(na); }
        if (ft.asg && r() < .5) resources.push(Object.assign({ id: acc.cloud + "-asg-" + hex(), domain: "network", type: ft.asg, kind: "asg", network: net.id, name: net.name + "-asg", classification: bu.cls, deployedBy: "module", config: {}, since: {} }, base));
        // flow log object (created below unless planted as missing)
        const fl = Object.assign({ id: acc.cloud + "-fl-" + hex(), domain: "network", type: ft.flowlog, kind: "flowlog", network: net.id, name: net.name + "-flowlog", classification: bu.cls, deployedBy: "module" }, base);
        const ret = acc.cloud === "azure" ? 30 : (r() < pDrift(fl, "NET-08") * 1.5 ? pick([7, 14, 30]) : pick([90, 180, 365]));
        fl.config = { "NET-08": ret }; fl.since = ret < 90 ? { "NET-08": ago(sinceDays()) } : {}; net._fl = fl;
      }
      if (ft.fwpolicy) { const fp = Object.assign({ id: acc.cloud + "-fwp-" + hex(), domain: "network", type: ft.fwpolicy, kind: "fwpolicy", name: acc.id + "-fw-policy", classification: bu.cls, deployedBy: "module" }, base);
        fp.rules = [{ port: 443, proto: "tcp", cidr: "0.0.0.0/0", hit: 0 }]; fp.since = {}; fp.config = {}; if (r() < BASE_P[acc.cloud] * 2) { fp.rules.push({ port: "all", proto: "all", cidr: "0.0.0.0/0", hit: 2 }); fp.since["NET-09"] = ago(sinceDays()); } resources.push(fp); }
      if (ft.waf && r() < .7) { const w = Object.assign({ id: acc.cloud + "-waf-" + hex(), domain: "network", type: ft.waf, kind: "waf", name: acc.id + "-waf", classification: bu.cls, deployedBy: "module" }, base);
        w.config = { "NET-19": !(r() < BASE_P[acc.cloud] * 4) }; w.since = w.config["NET-19"] ? {} : { "NET-19": ago(sinceDays()) }; resources.push(w); }
    });

    // Planted: 23 networks without flow logs (weighted to Alibaba, IBM, Oracle)
    const noFl = networks.slice().sort((a, b) => (({ alibaba: 0, ibm: 1, oci: 2, gcp: 3, azure: 4, aws: 5 })[a.cloud] - ({ alibaba: 0, ibm: 1, oci: 2, gcp: 3, azure: 4, aws: 5 })[b.cloud]) || a.id.localeCompare(b.id));
    const missing = new Set(); for (let i = 0; i < noFl.length && missing.size < 23; i += 2) missing.add(noFl[i].id);
    networks.forEach(n => { if (missing.has(n.id)) { n.config["NET-07"] = false; n.since["NET-07"] = ago(40 + (n.subnets * 11)); } else resources.push(n._fl); delete n._fl; });

    // Planted: payroll production network with 14 security groups open on SSH and RDP for 97 days
    const payAcc = accounts.find(a => a.id === "pay-prod"), payNet = Object.assign({ id: "aws-vnet-payroll", domain: "network", type: "VPC", kind: "vnet", account: payAcc.id, cloud: "aws", bu: "PAY", team: "Payroll Platform", env: "prod", tier: 1, classification: "restricted", deployedBy: "module", lb: true, name: "vpc-payroll-prod", subnets: 4,
      config: { "NET-07": true, "NET-10": true, "NET-13": true, "NET-14": true, "NET-15": true, "NET-16": true, "NET-18": true }, since: {} });
    networks.push(payNet); resources.push(payNet); for (let s = 0; s < 4; s++) subnets.push({ id: payNet.id + "-sn" + s, network: payNet.id });
    resources.push(Object.assign({}, payNet, { id: "aws-fl-payroll", type: "VPC flow log", kind: "flowlog", name: "vpc-payroll-prod-flowlog", network: payNet.id, config: { "NET-08": 365 }, since: {} }));
    const tiers = ["web", "app", "batch", "api", "calc", "export", "report"];
    for (let i = 0; i < 14; i++) resources.push({ id: "aws-sg-pay" + String(i + 1).padStart(2, "0"), domain: "network", type: "Security group", kind: "sg", network: payNet.id, account: payAcc.id, cloud: "aws", bu: "PAY", team: "Payroll Platform", env: "prod", tier: 1, classification: "restricted", deployedBy: "console", isDefault: false, jit: false, name: "payroll-" + tiers[i % 7] + "-sg-" + (i + 1),
      rules: [{ port: 443, proto: "tcp", cidr: "10.20.0.0/16", hit: 0 }, { port: 22, proto: "tcp", cidr: "0.0.0.0/0", hit: 1, note: "TEMP vendor migration" }, { port: 3389, proto: "tcp", cidr: "0.0.0.0/0", hit: 1, note: "TEMP vendor migration" }],
      config: { "NET-17": true }, since: { "NET-01": "2026-07-22", "NET-02": "2026-07-22" }, planted: "payroll" });
    // Planted: partner range /8 on PostgreSQL (Azure)
    const ptr = accounts.find(a => a.cloud === "azure" && a.bu === "PTR" && a.env === "prod");
    resources.push({ id: "azure-sg-ptr-edi", domain: "network", type: "Network security group", kind: "sg", network: networks.find(n => n.account === ptr.id).id, account: ptr.id, cloud: "azure", bu: "PTR", team: "Partner Integrations", env: "prod", tier: 2, classification: "confidential", deployedBy: "module", isDefault: false, jit: false, name: "nsg-partner-edi",
      rules: [{ port: 443, proto: "tcp", cidr: "10.40.0.0/16", hit: 0 }, { port: 5432, proto: "tcp", cidr: "45.0.0.0/8", hit: 2, note: "Partner EDI range" }], config: { "NET-17": true }, since: { "NET-04": "2026-09-02" }, planted: "partner" });
    // Planted: public website bucket under an approved exception
    const corp = accounts.find(a => a.cloud === "aws" && a.bu === "CORP" && a.env === "prod");
    const www = { id: "aws-object-www", domain: "storage", type: "S3 bucket", kind: "object", account: corp.id, cloud: "aws", bu: "CORP", team: "Corporate Cloud", env: "prod", tier: 2, classification: "public", deployedBy: "module", privateEndpoint: false, name: "corp-www-static-site", planted: "www" };
    www.config = { "STG-01": false, "STG-02": false, "STG-03": true, "STG-04": true, "STG-06": 200, "STG-07": "TLS1.2", "STG-08": true, "STG-10": true, "STG-12": 14, "STG-16": 0, "STG-17": true, "STG-21": true };
    www.since = { "STG-01": "2025-03-04", "STG-02": "2025-03-04" }; resources.push(www);
    // Known-good reference bucket (K1)
    resources.push({ id: "aws-object-gold", domain: "storage", type: "S3 bucket", kind: "object", account: payAcc.id, cloud: "aws", bu: "PAY", team: "Payroll Platform", env: "prod", tier: 1, classification: "restricted", deployedBy: "module", privateEndpoint: true, name: "payroll-ledger-archive", planted: "gold",
      config: { "STG-01": true, "STG-02": true, "STG-03": true, "STG-04": true, "STG-05": true, "STG-06": 180, "STG-07": "TLS1.2", "STG-08": true, "STG-10": true, "STG-11": true, "STG-12": 30, "STG-15": true, "STG-16": 0, "STG-17": true, "STG-18": true, "STG-21": true }, since: {} });

    const exceptions = [{ id: "EX-01", resource: "aws-object-www", controls: ["STG-01", "STG-02"], until: "2027-01-31", by: "Cloud security lead", reason: "Public static website, by design" }];
    return { today: TODAY, accounts, networks, subnets, resources, exceptions, BUS, rngSeed: 20261027 };
  }
  root.ES = { generate, BUS, STYPES, FTYPES, TODAY, ago };
})(typeof window !== "undefined" ? window : globalThis);
