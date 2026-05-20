import type { CronosData, RegionId } from '../lib/dataTypes';
import type { EntityTypeFilter, FilterState } from '../lib/filters';

interface Props {
  data: CronosData;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

const TYPE_LABELS: Record<EntityTypeFilter, string> = {
  polity: 'Polities',
  religion: 'Religiones',
  figure: 'Figuras',
  event: 'Eventos',
};

export default function FilterSidebar({ data, filters, onChange, onReset }: Props) {
  const toggleRegion = (id: RegionId) => {
    const next = new Set(filters.regions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, regions: next });
  };
  const toggleReligion = (id: string) => {
    const next = new Set(filters.religions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...filters, religions: next });
  };
  const toggleType = (t: EntityTypeFilter) => {
    onChange({ ...filters, types: { ...filters.types, [t]: !filters.types[t] } });
  };
  const setEraStart = (v: number) => {
    onChange({ ...filters, eraRange: [v, Math.max(v + 1, filters.eraRange[1])] });
  };
  const setEraEnd = (v: number) => {
    onChange({ ...filters, eraRange: [Math.min(filters.eraRange[0], v - 1), v] });
  };

  const [domainLo, domainHi] = data.meta.time_range;
  const [eraLo, eraHi] = filters.eraRange;

  return (
    <aside className="filter-sidebar">
      <div className="sidebar-header">
        <h2>Filtros</h2>
        <button className="reset-btn" onClick={onReset} aria-label="Resetear filtros">
          Reset
        </button>
      </div>

      <details open className="filter-group">
        <summary>Macro-regiones <span className="count">({filters.regions.size}/{data.regions.length})</span></summary>
        <ul>
          {data.regions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((r) => (
              <li key={r.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.regions.has(r.id)}
                    onChange={() => toggleRegion(r.id)}
                  />
                  <span>{r.name}</span>
                </label>
              </li>
            ))}
        </ul>
      </details>

      <details open className="filter-group">
        <summary>Religiones <span className="count">({filters.religions.size}/{data.religions.length})</span></summary>
        <ul>
          {data.religions
            .slice()
            .sort((a, b) => a.start_year - b.start_year)
            .map((rel) => (
              <li key={rel.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.religions.has(rel.id)}
                    onChange={() => toggleReligion(rel.id)}
                  />
                  <span className="color-swatch" style={{ background: rel.color }} aria-hidden />
                  <span>{rel.name}</span>
                </label>
              </li>
            ))}
        </ul>
      </details>

      <details open className="filter-group">
        <summary>Tipos</summary>
        <ul>
          {(Object.keys(TYPE_LABELS) as EntityTypeFilter[]).map((t) => (
            <li key={t}>
              <label>
                <input
                  type="checkbox"
                  checked={filters.types[t]}
                  onChange={() => toggleType(t)}
                />
                <span>{TYPE_LABELS[t]}</span>
              </label>
            </li>
          ))}
        </ul>
      </details>

      <details open className="filter-group era">
        <summary>Era</summary>
        <div className="era-range">
          <div className="era-row">
            <label htmlFor="era-start">Desde</label>
            <input
              id="era-start"
              type="range"
              aria-label="Año de inicio del rango temporal visible"
              min={domainLo}
              max={domainHi}
              step={50}
              value={eraLo}
              onChange={(e) => setEraStart(Number(e.target.value))}
            />
            <span className="era-val">{eraLo < 0 ? `${Math.abs(eraLo)} BCE` : `${eraLo}`}</span>
          </div>
          <div className="era-row">
            <label htmlFor="era-end">Hasta</label>
            <input
              id="era-end"
              type="range"
              aria-label="Año final del rango temporal visible"
              min={domainLo}
              max={domainHi}
              step={50}
              value={eraHi}
              onChange={(e) => setEraEnd(Number(e.target.value))}
            />
            <span className="era-val">{eraHi < 0 ? `${Math.abs(eraHi)} BCE` : `${eraHi}`}</span>
          </div>
        </div>
      </details>
    </aside>
  );
}
