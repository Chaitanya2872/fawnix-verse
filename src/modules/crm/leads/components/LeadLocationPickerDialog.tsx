import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";

type SearchResult = {
  lat: number;
  lon: number;
  label: string;
  state: string | null;
};

const DEFAULT_CENTER = {
  lat: 17.385,
  lon: 78.4867,
};

const ZOOM = 15;

function clampLatitude(value: number) {
  return Math.max(-85.0511, Math.min(85.0511, value));
}

function normalizeLongitude(value: number) {
  if (value < -180) return value + 360;
  if (value > 180) return value - 360;
  return value;
}

function longitudeToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latitudeToTileY(latitude: number, zoom: number) {
  const latRad = (clampLatitude(latitude) * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    2 ** zoom
  );
}

function tileXToLongitude(tileX: number, zoom: number) {
  return (tileX / 2 ** zoom) * 360 - 180;
}

function tileYToLatitude(tileY: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * tileY) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function buildTileRows(latitude: number, longitude: number) {
  const centerTileX = longitudeToTileX(longitude, ZOOM);
  const centerTileY = latitudeToTileY(latitude, ZOOM);
  const startTileX = Math.floor(centerTileX) - 1;
  const startTileY = Math.floor(centerTileY) - 1;
  const totalTiles = 2 ** ZOOM;

  return Array.from({ length: 3 }, (_, rowIndex) =>
    Array.from({ length: 3 }, (_, columnIndex) => {
      const rawTileX = startTileX + columnIndex;
      const wrappedTileX = ((rawTileX % totalTiles) + totalTiles) % totalTiles;
      const tileY = Math.max(0, Math.min(totalTiles - 1, startTileY + rowIndex));

      return {
        key: `${wrappedTileX}-${tileY}`,
        src: `https://tile.openstreetmap.org/${ZOOM}/${wrappedTileX}/${tileY}.png`,
      };
    })
  );
}

async function searchLocations(query: string): Promise<SearchResult[]> {
  const executeSearch = async (searchText: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&dedupe=1&q=${encodeURIComponent(searchText)}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Unable to search locations right now.");
    }

    const payload = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: {
        state?: string;
        state_district?: string;
        county?: string;
      };
    }>;

    return payload.map((result) => ({
      lat: Number(result.lat),
      lon: Number(result.lon),
      label: result.display_name,
      state:
        result.address?.state ??
        result.address?.state_district ??
        result.address?.county ??
        null,
    }));
  };

  const trimmed = query.trim();
  const directResults = await executeSearch(trimmed);
  if (directResults.length > 0 || trimmed.toLowerCase().includes("india")) {
    return directResults;
  }
  return executeSearch(`${trimmed}, India`);
}

async function reverseLookup(latitude: number, longitude: number): Promise<SearchResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Unable to fetch the selected address.");
  }

  const payload = (await response.json()) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      state?: string;
      state_district?: string;
      county?: string;
    };
  };

  return {
    lat: Number(payload.lat),
    lon: Number(payload.lon),
    label: payload.display_name,
    state:
      payload.address?.state ??
      payload.address?.state_district ??
      payload.address?.county ??
      null,
  };
}

function MapCanvas({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number;
  longitude: number;
  onPick: (latitude: number, longitude: number) => void;
}) {
  const rows = useMemo(() => buildTileRows(latitude, longitude), [latitude, longitude]);

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const nextTileX =
          longitudeToTileX(longitude, ZOOM) + ((event.clientX - rect.left) / rect.width - 0.5) * 3;
        const nextTileY =
          latitudeToTileY(latitude, ZOOM) + ((event.clientY - rect.top) / rect.height - 0.5) * 3;

        onPick(tileYToLatitude(nextTileY, ZOOM), normalizeLongitude(tileXToLongitude(nextTileX, ZOOM)));
      }}
      className="relative aspect-[4/3] max-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:max-h-[460px]"
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3">
        {rows.flat().map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-slate-950/5" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="rounded-full bg-red-600 p-1 text-white shadow-lg">
          <MapPin className="h-4 w-4" />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow">
        Click map to point location
      </div>
    </button>
  );
}

export function LeadLocationPickerDialog({
  open,
  initialLocation,
  initialState,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean;
  initialLocation: string | null;
  initialState: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (projectLocation: string, projectState: string | null) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [addressText, setAddressText] = useState("");
  const [stateText, setStateText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSearchQuery(initialLocation ?? "");
    setAddressText(initialLocation ?? "");
    setStateText(initialState ?? "");
    setResults([]);
    setError(null);

    if (!initialLocation?.trim()) {
      setSelected({
        lat: DEFAULT_CENTER.lat,
        lon: DEFAULT_CENTER.lon,
        label: "",
        state: initialState ?? null,
      });
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    void searchLocations(initialLocation)
      .then((nextResults) => {
        if (cancelled) return;
        setResults(nextResults);
        const firstMatch = nextResults[0];
        setSelected(
          firstMatch ?? {
            lat: DEFAULT_CENTER.lat,
            lon: DEFAULT_CENTER.lon,
            label: initialLocation,
            state: initialState ?? null,
          }
        );
        if (firstMatch) {
          setAddressText(firstMatch.label);
          setStateText(firstMatch.state ?? initialState ?? "");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSelected({
          lat: DEFAULT_CENTER.lat,
          lon: DEFAULT_CENTER.lon,
          label: initialLocation,
          state: initialState ?? null,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setIsSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialLocation, initialState, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 3 || query === addressText.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleSearch();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [addressText, open, searchQuery]);

  if (!open) {
    return null;
  }

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) {
      setError("Enter an address or landmark to search.");
      return;
    }

    setError(null);
    setIsSearching(true);
    try {
      const nextResults = await searchLocations(query);
      setResults(nextResults);
      if (nextResults[0]) {
        const topMatch = nextResults[0];
        setSelected(topMatch);
        setAddressText(topMatch.label);
        setStateText(topMatch.state ?? "");
      } else {
        setError("No matching locations found.");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unable to search location.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleMapPick(latitude: number, longitude: number) {
    setError(null);
    setIsResolvingMap(true);
    try {
      const resolved = await reverseLookup(latitude, longitude);
      setSelected(resolved);
      setAddressText(resolved.label);
      setStateText(resolved.state ?? "");
    } catch (mapError) {
      setSelected({
        lat: latitude,
        lon: longitude,
        label: addressText,
        state: stateText || null,
      });
      setError(mapError instanceof Error ? mapError.message : "Unable to resolve map selection.");
    } finally {
      setIsResolvingMap(false);
    }
  }

  async function handleSave() {
    const projectLocation = addressText.trim();
    if (!projectLocation) {
      setError("Choose a location on the map or search for an address before saving.");
      return;
    }

    setError(null);
    try {
      await onSave(projectLocation, stateText.trim() || null);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save project location.");
    }
  }

  const center = selected ?? {
    lat: DEFAULT_CENTER.lat,
    lon: DEFAULT_CENTER.lon,
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={isSaving ? undefined : onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Edit Project Location</h3>
            <p className="mt-1 text-sm text-slate-500">
              Search a place, then fine-tune it by clicking on the map pin position.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Map Picker</span>
                <span>
                  {center.lat.toFixed(5)}, {center.lon.toFixed(5)}
                </span>
              </div>
              <div className="relative">
                <MapCanvas
                  latitude={center.lat}
                  longitude={center.lon}
                  onPick={(latitude, longitude) => {
                    void handleMapPick(latitude, longitude);
                  }}
                />
                {isResolvingMap ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/75">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resolving address...
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Search a landmark or society first, then click the map to lock the exact project location.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selected location</p>
                  <p className="text-xs text-slate-500">This address will be saved to the lead.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {stateText || "State pending"}
                </span>
              </div>
              <textarea
                rows={4}
                value={addressText}
                onChange={(event) => setAddressText(event.target.value)}
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder="Selected address will appear here"
              />

              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                State
              </label>
              <input
                value={stateText}
                onChange={(event) => setStateText(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder="State / region"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Search Location
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSearch();
                    }
                  }}
                  placeholder="Search by address, area or landmark"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  onClick={() => void handleSearch()}
                  disabled={isSearching}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Search by apartment, landmark, road, or area name. Results update as you type.
              </p>
              <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {results.map((result) => (
                  <button
                    key={`${result.lat}-${result.lon}-${result.label}`}
                    type="button"
                    onClick={() => {
                      setSelected(result);
                      setAddressText(result.label);
                      setStateText(result.state ?? "");
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-sky-100 p-2 text-sky-700">
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{result.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {result.state ?? "State not resolved"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                {!isSearching && results.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Search results will appear here. You can also click directly on the map.
                  </p>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
}
