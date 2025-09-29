import fetch from "node-fetch";

const GP_KEY = process.env.GOOGLE_PLACES_KEY;
const OTM_KEY = process.env.OPENTRIPMAP_KEY;
const CITY = process.env.CITY_NAME || "";
const WIKI_LANG = (process.env.WIKI_LANG || "en").toLowerCase();
const WIKI_RADIUS = Number(process.env.WIKI_RADIUS || 500);


function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripDiacritics(s = "") {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function variants(name, city, lat, lon) {
  const n = name?.trim() || "";
  const nc = stripDiacritics(n);
  const cityPart = city ? `, ${city}` : "";
  const v = [
    n,
    `${n}${cityPart}`,
    `${n} ${city}`,
    nc,
    `${nc}${cityPart}`,
    `${nc} ${city}`,
  ].filter(Boolean);
  return [...new Set(v)];
}

export async function googlePlaceId({ name, lat, lon }) {
  if (!GP_KEY) return null;

  const qs = variants(name, CITY, lat, lon);
  const bias = lat && lon ? `point:${lat},${lon}` : undefined;

  for (const q of qs) {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    );
    url.searchParams.set("input", q);
    url.searchParams.set("inputtype", "textquery");
    url.searchParams.set("fields", "place_id,name,geometry");
    if (bias) url.searchParams.set("locationbias", bias);
    url.searchParams.set("key", GP_KEY);

    const r = await fetch(url);
    if (!r.ok) continue;
    const j = await r.json();
    const cand = j?.candidates?.[0];
    if (cand?.place_id) return cand.place_id;
    await sleep(120);
  }

  if (lat && lon) {
    for (const q of qs) {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
      );
      url.searchParams.set("query", q);
      url.searchParams.set("location", `${lat},${lon}`);
      url.searchParams.set("radius", "800"); // ~0.8 km
      url.searchParams.set("key", GP_KEY);

      const r = await fetch(url);
      if (!r.ok) continue;
      const j = await r.json();
      const cand = j?.results?.[0];
      if (cand?.place_id) return cand.place_id;
      await sleep(120);
    }
  }

  console.warn(`googlePlaceId: no match for "${name}" (CITY="${CITY}")`);
  return null;
}

export async function googlePlaceStats(place_id) {
  if (!GP_KEY || !place_id) return { user_ratings_total: 0, rating: 0 };
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", place_id);
  url.searchParams.set("fields", "rating,user_ratings_total,types");
  url.searchParams.set("key", GP_KEY);

  const r = await fetch(url);
  if (!r.ok) {
    console.warn(`googlePlaceStats: HTTP ${r.status} for ${place_id}`);
    return { user_ratings_total: 0, rating: 0, types: [] };
  }
  const j = await r.json();
  const res = j?.result || {};
  return {
    user_ratings_total: res.user_ratings_total || 0,
    rating: res.rating || 0,
    types: Array.isArray(res.types) ? res.types : [],
  };
}

export async function wikiNearestPage({ lat, lon, name }) {
  const api = `https://${WIKI_LANG}.wikipedia.org/w/api.php`;

  const tryGeo = async (radius) => {
    const url = new URL(api);
    url.searchParams.set("action", "query");
    url.searchParams.set("list", "geosearch");
    url.searchParams.set("gscoord", `${lat}|${lon}`);
    url.searchParams.set("gsradius", String(radius));
    url.searchParams.set("gslimit", "1");
    url.searchParams.set("format", "json");
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const page = j?.query?.geosearch?.[0];
    return page ? { pageid: page.pageid, title: page.title } : null;
  };

  if (lat && lon) {
    const p = await tryGeo(WIKI_RADIUS);
    if (p) return p;
    const p2 = await tryGeo(1000);
    if (p2) return p2;
  }

  const candidates = variants(name, CITY);
  for (const q of candidates) {
    const url = new URL(api);
    url.searchParams.set("action", "opensearch");
    url.searchParams.set("search", q);
    url.searchParams.set("limit", "1");
    url.searchParams.set("namespace", "0");
    url.searchParams.set("format", "json");
    const r = await fetch(url);
    if (!r.ok) continue;
    const j = await r.json();
    const title = j?.[1]?.[0];
    if (title) return { pageid: undefined, title };
  }

  console.warn(
    `wikiNearestPage: no page for "${name}" (CITY="${CITY}", lang=${WIKI_LANG})`
  );
  return null;
}

export async function wikiPageviews30d(pageTitle) {
  if (!pageTitle) return 0;
  const lang = WIKI_LANG || "en";
  const title = encodeURIComponent(String(pageTitle).replace(/ /g, "_"));
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 24 * 3600 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/all-agents/${title}/daily/${fmt(
    start
  )}/${fmt(end)}`;

  const r = await fetch(url);
  if (!r.ok) {
    console.warn(`wikiPageviews30d: HTTP ${r.status} for "${pageTitle}"`);
    return 0;
  }
  const j = await r.json();
  return (j.items || []).reduce((s, it) => s + (it.views || 0), 0);
}


/**
 * OTM often has broad coverage; we attempt fuzzy name matching by diacritics.
 */
export async function openTripInfo({ lat, lon, name }) {
  if (!OTM_KEY) return 0;
  if (lat == null || lon == null) return 0;

  const u = new URL("https://api.opentripmap.com/0.1/en/places/radius");
  u.searchParams.set("radius", "600");
  u.searchParams.set("lon", String(lon));
  u.searchParams.set("lat", String(lat));
  u.searchParams.set("limit", "10");
  u.searchParams.set("apikey", OTM_KEY);

  const r = await fetch(u);
  if (!r.ok) {
    console.warn(`openTripRate: HTTP ${r.status} for "${name}"`);
    // return 0;
    return { rate: 0, kinds: "" };
  }
  const j = await r.json();
  if (!Array.isArray(j?.features)) return { rate: 0, kinds: "" };

  const target = stripDiacritics(String(name || "").toLowerCase());
  const cand = j.features.find((f) => {
    const nm = stripDiacritics(String(f.properties?.name || "").toLowerCase());
    return nm.includes(target) || target.includes(nm);
  });

  return {
    rate: cand?.properties?.rate || 0,
    kinds: cand?.properties?.kinds || "",
  };
}
