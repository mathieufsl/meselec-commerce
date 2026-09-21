import type { ProspectionCommune } from "@/data/prospectionCommunes";

export type ProspectionCommuneContour = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export type ProspectionCommuneWithGeo = ProspectionCommune & {
  lat: number;
  lng: number;
  geometry: ProspectionCommuneContour;
};

type ContourMap = Record<string, ProspectionCommuneContour>;

const contoursCache = new Map<string, ContourMap>();
let geoCache: Record<string, { lat: number; lng: number }> | null = null;

function extractDeptCode(departement: string): string {
  const m = departement.match(/\((\d{2,3}[AB]?)\)$/);
  return m?.[1] ?? "";
}

async function loadGeoIndex() {
  if (geoCache) return geoCache;
  const mod = await import("@/data/prospectionCommunesGeo");
  geoCache = mod.PROSPECTION_COMMUNES_GEO;
  return geoCache;
}

async function loadDeptContours(deptCode: string): Promise<ContourMap> {
  const cached = contoursCache.get(deptCode);
  if (cached) return cached;

  const res = await fetch(`/prospection-contours/${deptCode}.json`);
  if (!res.ok) throw new Error(`Contours ${deptCode}: ${res.status}`);
  const data = (await res.json()) as ContourMap;
  contoursCache.set(deptCode, data);
  return data;
}

export async function joinCommunesWithGeoAsync(
  communes: ProspectionCommune[],
): Promise<ProspectionCommuneWithGeo[]> {
  if (communes.length === 0) return [];

  const geo = await loadGeoIndex();
  const deptCodes = [...new Set(communes.map((c) => extractDeptCode(c.departement)).filter(Boolean))];
  const contourMaps = await Promise.all(deptCodes.map((code) => loadDeptContours(code)));
  const contours: ContourMap = Object.assign({}, ...contourMaps);

  const result: ProspectionCommuneWithGeo[] = [];
  for (const commune of communes) {
    const coords = geo[commune.key];
    const geometry = contours[commune.key];
    if (coords && geometry) {
      result.push({ ...commune, ...coords, geometry });
    }
  }
  return result;
}
