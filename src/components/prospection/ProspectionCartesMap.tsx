import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { ProspectionCommune } from "@/data/prospectionCommunes";
import type { ProspectionCommuneState } from "@/lib/prospection/api";
import type { ProspectionCommuneWithGeo } from "@/lib/prospection/geo";
import { joinCommunesWithGeoAsync } from "@/lib/prospection/geo";
import {
  colorForMapValue,
  DIMMED_COLOR,
  HIGHLIGHT_RING,
  mapValueLabel,
  normalizePrestataireName,
} from "@/lib/prospection/mapColors";
import type { ProspectionMapColorMode } from "@/lib/prospection/mapTypes";
import { Loader2 } from "lucide-react";

const IDF_CENTER: [number, number] = [48.85, 2.35];
const IDF_BOUNDS = L.latLngBounds([48.12, 1.45], [49.25, 3.55]);

export type ProspectionMapCommune = ProspectionCommuneWithGeo & {
  state: ProspectionCommuneState;
  color: string;
  dimmed: boolean;
  selected: boolean;
  label: string;
};

function communeLayerStyle(commune: ProspectionMapCommune): L.PathOptions {
  return {
    fillColor: commune.dimmed ? DIMMED_COLOR : commune.color,
    fillOpacity: commune.dimmed ? 0.2 : commune.selected ? 0.78 : 0.6,
    color: commune.selected ? HIGHLIGHT_RING : commune.dimmed ? "#94a3b8" : "#ffffff",
    weight: commune.selected ? 3 : commune.dimmed ? 0.75 : 1.25,
    opacity: commune.dimmed ? 0.5 : 0.95,
  };
}

function communeKeysFingerprint(communes: ProspectionMapCommune[]): string {
  return communes
    .map((c) => c.key)
    .sort()
    .join("|");
}

type MapCommunePolygonsProps = {
  communes: ProspectionMapCommune[];
  onCommuneSelect: (commune: ProspectionMapCommune) => void;
};

function MapCommunePolygons({ communes, onCommuneSelect }: MapCommunePolygonsProps) {
  const map = useMap();
  const groupRef = useRef<L.FeatureGroup | null>(null);
  const layersRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const communesByKeyRef = useRef<Map<string, ProspectionMapCommune>>(new Map());
  const onSelectRef = useRef(onCommuneSelect);
  const boundsFittedForRef = useRef("");

  onSelectRef.current = onCommuneSelect;
  communesByKeyRef.current = new Map(communes.map((c) => [c.key, c]));

  const communeKeys = useMemo(() => communeKeysFingerprint(communes), [communes]);

  useEffect(() => {
    const group = L.featureGroup();
    const layers = new Map<string, L.GeoJSON>();

    for (const commune of communes) {
      const layer = L.geoJSON(commune.geometry, {
        style: communeLayerStyle(commune),
      });

      layer.bindTooltip(
        `<strong>${commune.ville}</strong><br/>${commune.label || "Non renseigné"}`,
        { sticky: true, direction: "top", opacity: 0.95 },
      );

      layer.on("click", () => {
        const current = communesByKeyRef.current.get(commune.key);
        if (current) onSelectRef.current(current);
      });

      layer.on("mouseover", () => {
        const current = communesByKeyRef.current.get(commune.key);
        if (!current) return;
        layer.setStyle({
          weight: current.selected ? 3 : 2.5,
          fillOpacity: current.dimmed ? 0.3 : current.selected ? 0.85 : 0.75,
        });
      });

      layer.on("mouseout", () => {
        const current = communesByKeyRef.current.get(commune.key);
        if (!current) return;
        layer.setStyle(communeLayerStyle(current));
      });

      layers.set(commune.key, layer);
      group.addLayer(layer);
    }

    groupRef.current = group;
    layersRef.current = layers;
    map.addLayer(group);

    if (communeKeys !== boundsFittedForRef.current) {
      boundsFittedForRef.current = communeKeys;
      if (communes.length > 0) {
        map.fitBounds(group.getBounds().pad(0.03), { maxZoom: 11 });
      } else {
        map.fitBounds(IDF_BOUNDS);
      }
    }

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
      layersRef.current.clear();
    };
    // communeKeys suffit : les géométries ne changent que si le filtre change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- communes lu à la volée quand communeKeys change
  }, [map, communeKeys]);

  useEffect(() => {
    for (const commune of communes) {
      const layer = layersRef.current.get(commune.key);
      if (!layer) continue;
      layer.setStyle(communeLayerStyle(commune));
      layer.getTooltip()?.setContent(
        `<strong>${commune.ville}</strong><br/>${commune.label || "Non renseigné"}`,
      );
    }
  }, [communes]);

  return null;
}

type Props = {
  communes: ProspectionCommune[];
  stateMap: Record<string, ProspectionCommuneState>;
  colorMode: ProspectionMapColorMode;
  highlightedPrestataires: Set<string>;
  selectedCommuneKey: string | null;
  onCommuneSelect: (commune: ProspectionCommune) => void;
};

export function ProspectionCartesMap({
  communes,
  stateMap,
  colorMode,
  highlightedPrestataires,
  selectedCommuneKey,
  onCommuneSelect,
}: Props) {
  const [geocodedCommunes, setGeocodedCommunes] = useState<ProspectionCommuneWithGeo[]>([]);
  const [geoLoading, setGeoLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGeoLoading(true);
    void joinCommunesWithGeoAsync(communes).then((result) => {
      if (!cancelled) {
        setGeocodedCommunes(result);
        setGeoLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [communes]);

  const mapCommunes = useMemo((): ProspectionMapCommune[] => {
    const hasHighlight = highlightedPrestataires.size > 0;

    return geocodedCommunes.map((commune) => {
      const state = stateMap[commune.key] ?? {
        status: "todo" as const,
        gestion: "" as const,
        prestataire: "",
        contact: "",
        contacts: [],
        notes: "",
      };
      const prestataire = normalizePrestataireName(state.prestataire);
      const dimmed =
        hasHighlight &&
        colorMode === "prestataire" &&
        (!prestataire || !highlightedPrestataires.has(prestataire));

      return {
        ...commune,
        state,
        color: colorForMapValue(colorMode, state),
        dimmed,
        selected: commune.key === selectedCommuneKey,
        label: mapValueLabel(colorMode, state),
      };
    });
  }, [geocodedCommunes, stateMap, colorMode, highlightedPrestataires, selectedCommuneKey]);

  const handleCommuneSelect = useMemo(
    () => (commune: ProspectionMapCommune) => {
      onCommuneSelect(commune);
    },
    [onCommuneSelect],
  );

  if (geoLoading) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-border/70 bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg border border-border/70">
      <MapContainer
        center={IDF_CENTER}
        zoom={9}
        className="h-full w-full"
        style={{ minHeight: 420, background: "#f1f5f9" }}
        scrollWheelZoom
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCommunePolygons communes={mapCommunes} onCommuneSelect={handleCommuneSelect} />
      </MapContainer>
      <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
        Cliquez sur une commune pour la modifier
      </p>
    </div>
  );
}
