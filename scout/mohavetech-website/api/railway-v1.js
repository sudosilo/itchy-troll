// Railway visibility feed for the mohave.wtf Railway tab.
// Reads every workspace, project and service on the Railway account and prices this billing period's usage.
const API = "https://backboard.railway.com/graphql/v2";

const MIN_MONTH = 43200;
const PRICE = {
  MEMORY_USAGE_GB: 10 / MIN_MONTH,
  CPU_USAGE: 20 / MIN_MONTH,
  NETWORK_TX_GB: 0.05,
  DISK_USAGE_GB: 0.15 / MIN_MONTH,
  BACKUP_USAGE_GB: 0.15 / MIN_MONTH
};
const MEASURES = Object.keys(PRICE);

async function gql(token, query, variables) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ query, variables: variables || {} })
  });
  const j = await r.json().catch(() => ({}));
  if (j.errors && !j.data) throw new Error(j.errors.map(e => e.message).join("; "));
  if (!j.data) throw new Error("Railway answered " + r.status);
  return j.data;
}

const Q_ME = `query { me { workspaces { id name } } }`;

const Q_CONTEXT = `query C($w: String!) {
  workspace(workspaceId: $w) { id name customer { currentUsage billingPeriod { start end } } }
}`;

const Q_USAGE = `query U($w: String!, $m: [MetricMeasurement!]!, $s: DateTime!, $e: DateTime!) {
  usage(workspaceId: $w, measurements: $m, groupBy: [PROJECT_ID, SERVICE_ID], startDate: $s, endDate: $e) {
    measurement value tags { projectId serviceId }
  }
}`;

const Q_EST = `query E($w: String!, $m: [MetricMeasurement!]!) {
  estimatedUsage(workspaceId: $w, measurements: $m) { measurement estimatedValue projectId }
}`;

const Q_PROJECTS = `query P($w: String) {
  projects(first: 500, workspaceId: $w) {
    edges { node {
      id name createdAt updatedAt
      environments { edges { node { id name } } }
      services { edges { node {
        id name createdAt updatedAt
        serviceInstances { edges { node {
          environmentId sleepApplication source { repo image }
          latestDeployment { status createdAt staticUrl }
        } } }
      } } }
    } }
  }
}`;

function price(m, v) { return (PRICE[m] || 0) * (v || 0); }

async function workspaceData(token, ws) {
  const ctx = await gql(token, Q_CONTEXT, { w: ws.id }).catch(() => ({}));
  const cust = (ctx.workspace && ctx.workspace.customer) || {};
  const bp = cust.billingPeriod || {};
  const start = bp.start || new Date(Date.now() - 30 * 86400000).toISOString();
  const end = new Date().toISOString();
  const [pr, us, es] = await Promise.all([
    gql(token, Q_PROJECTS, { w: ws.id }).catch(() => gql(token, Q_PROJECTS.replace("source { repo image }", ""), { w: ws.id })),
    gql(token, Q_USAGE, { w: ws.id, m: MEASURES, s: start, e: end }).catch(() => ({})),
    gql(token, Q_EST, { w: ws.id, m: MEASURES }).catch(() => ({}))
  ]);
  const d = { projects: pr.projects, usage: us.usage, estimatedUsage: es.estimatedUsage };

  const svcCost = {}, projCost = {}, projEst = {};
  (d.usage || []).forEach(u => {
    const c = price(u.measurement, u.value);
    const p = u.tags && u.tags.projectId, s = u.tags && u.tags.serviceId;
    if (p) projCost[p] = (projCost[p] || 0) + c;
    if (s) svcCost[s] = (svcCost[s] || 0) + c;
  });
  (d.estimatedUsage || []).forEach(u => {
    if (u.projectId) projEst[u.projectId] = (projEst[u.projectId] || 0) + price(u.measurement, u.estimatedValue);
  });

  const projects = ((d.projects && d.projects.edges) || []).map(e => {
    const p = e.node;
    const envs = (p.environments.edges || []).map(x => x.node);
    const prod = envs.find(x => /prod/i.test(x.name)) || envs[0] || {};
    const services = (p.services.edges || []).map(se => {
      const s = se.node;
      const inst = (s.serviceInstances.edges || []).map(x => x.node);
      const main = inst.find(x => x.environmentId === prod.id) || inst[0] || {};
      const dep = main.latestDeployment || {};
      return {
        id: s.id,
        name: s.name,
        repo: (main.source && main.source.repo) || (inst.find(x => x.source && x.source.repo) || {source: {}}).source.repo || null,
        url: "https://railway.com/project/" + p.id + "/service/" + s.id + (main.environmentId ? "?environmentId=" + main.environmentId : ""),
        status: dep.status || "NONE",
        lastDeploy: dep.createdAt || null,
        domain: dep.staticUrl || null,
        sleeping: !!main.sleepApplication,
        updatedAt: s.updatedAt,
        cost: svcCost[s.id] || 0
      };
    }).sort((a, b) => b.cost - a.cost);
    const last = services.reduce((m, s) => (s.lastDeploy && s.lastDeploy > m ? s.lastDeploy : m), "");
    return {
      id: p.id,
      name: p.name,
      workspace: ws.name,
      url: "https://railway.com/project/" + p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      lastDeploy: last || null,
      cost: projCost[p.id] || 0,
      estimate: projEst[p.id] || 0,
      services
    };
  });

  return {
    workspace: {
      id: ws.id,
      name: ws.name,
      currentUsage: typeof cust.currentUsage === "number" ? cust.currentUsage : projects.reduce((t, p) => t + p.cost, 0),
      estimate: projects.reduce((t, p) => t + p.estimate, 0),
      billingStart: bp.start || null,
      billingEnd: bp.end || null
    },
    projects
  };
}

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  const token = process.env.RAILWAY_TOKEN;
  if (!token) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Railway is not connected yet." }));
    return;
  }
  try {
    const me = await gql(token, Q_ME).catch(() => ({}));
    let list = (me.me && me.me.workspaces) || [];
    if (!list.length) list = [{ id: null, name: "Railway" }];
    const all = await Promise.all(list.map(ws => workspaceData(token, ws)));
    if (!all.some(a => a.projects.length)) throw new Error("Railway token works but no projects came back");
    const projects = [].concat(...all.map(a => a.projects)).sort((a, b) => b.cost - a.cost);
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.statusCode = 200;
    res.end(JSON.stringify({ generated: new Date().toISOString(), workspaces: all.map(a => a.workspace), projects }));
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
