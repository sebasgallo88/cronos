import { useEffect, useMemo } from 'react';
import type {
  CronosData,
  HistoricalEvent,
  Figure,
  Narrative,
  Polity,
  Religion,
} from '../lib/dataTypes';
import { formatYear } from '../lib/timeScale';

export type SelectedEntity = {
  type: 'polity' | 'religion' | 'figure' | 'event' | 'narrative';
  id: string;
};

interface Props {
  data: CronosData;
  selected: SelectedEntity | null;
  onClose: () => void;
  onSelect: (entity: SelectedEntity) => void;
}

function lookupEntity(
  data: CronosData,
  sel: SelectedEntity,
): Polity | Religion | Figure | HistoricalEvent | Narrative | undefined {
  switch (sel.type) {
    case 'polity':
      return data.polities.find((p) => p.id === sel.id);
    case 'religion':
      return data.religions.find((r) => r.id === sel.id);
    case 'figure':
      return data.figures.find((f) => f.id === sel.id);
    case 'event':
      return data.events.find((e) => e.id === sel.id);
    case 'narrative':
      return data.narratives?.find((n) => n.id === sel.id);
  }
}

function nameOf(data: CronosData, type: SelectedEntity['type'], id: string): string {
  const e = lookupEntity(data, { type, id });
  return e?.name ?? id;
}

function YearRange({ start, end }: { start: number; end: number | null }) {
  if (end == null) {
    return <span className="meta-range">{formatYear(start)} → presente</span>;
  }
  return <span className="meta-range">{formatYear(start)} → {formatYear(end)}</span>;
}

export default function DetailPanel({ data, selected, onClose, onSelect }: Props) {
  // Escape para cerrar
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, onClose]);

  const entity = useMemo(() => (selected ? lookupEntity(data, selected) : null), [data, selected]);
  if (!selected || !entity) return null;

  const sel = selected;

  // Meta line por tipo
  const metaLines: Array<{ label: string; value: React.ReactNode }> = [];
  if (sel.type === 'narrative') {
    const n = entity as Narrative;
    metaLines.push({ label: 'Rango', value: <YearRange start={n.start_year} end={n.end_year} /> });
    metaLines.push({ label: 'Duración', value: `${n.end_year - n.start_year} años` });
    if (n.audio_duration_sec) {
      const min = Math.floor(n.audio_duration_sec / 60);
      const sec = Math.round(n.audio_duration_sec % 60);
      metaLines.push({ label: 'Audio', value: `${min}:${String(sec).padStart(2, '0')} · voz ${n.audio_voice ?? '—'}` });
    }
    if (n.audio_word_count) metaLines.push({ label: 'Palabras', value: n.audio_word_count.toLocaleString('es') });
    metaLines.push({ label: 'Generada', value: `${n.generated_at} · ${n.generated_by}` });
    if (n.sources_used) {
      const counts: string[] = [];
      if (n.sources_used.polity_ids?.length) counts.push(`${n.sources_used.polity_ids.length}p`);
      if (n.sources_used.event_ids?.length) counts.push(`${n.sources_used.event_ids.length}e`);
      if (n.sources_used.figure_ids?.length) counts.push(`${n.sources_used.figure_ids.length}f`);
      if (counts.length) metaLines.push({ label: 'Entidades usadas', value: counts.join(' · ') });
    }
  }
  if (sel.type === 'polity') {
    const p = entity as Polity;
    metaLines.push({ label: 'Macro-región', value: data.regions.find((r) => r.id === p.region)?.name ?? p.region });
    metaLines.push({ label: 'Rango', value: <YearRange start={p.start_year} end={p.end_year} /> });
    if (p.capital) metaLines.push({ label: 'Capital', value: p.capital });
    if (p.population_peak) metaLines.push({ label: 'Población pico', value: p.population_peak.toLocaleString('es') });
    if (p.area_peak_km2) metaLines.push({ label: 'Área pico (km²)', value: p.area_peak_km2.toLocaleString('es') });
    if (p.religious_complexity_score) metaLines.push({ label: 'Complejidad religiosa', value: `${p.religious_complexity_score}/5` });
  }
  if (sel.type === 'religion') {
    const r = entity as Religion;
    metaLines.push({ label: 'Región de origen', value: data.regions.find((reg) => reg.id === r.region_birth)?.name ?? r.region_birth });
    metaLines.push({ label: 'Rango', value: <YearRange start={r.start_year} end={r.end_year} /> });
    if (r.branch_of) metaLines.push({ label: 'Tradición raíz', value: nameOf(data, 'religion', r.branch_of) });
    if (r.branches?.length) metaLines.push({ label: 'Tradiciones derivadas', value: r.branches.map((b) => nameOf(data, 'religion', b)).join(', ') });
  }
  if (sel.type === 'figure') {
    const f = entity as Figure;
    metaLines.push({ label: 'Macro-región', value: data.regions.find((r) => r.id === f.region)?.name ?? f.region });
    metaLines.push({
      label: 'Vida',
      value: (
        <span className="meta-range">
          {formatYear(f.year_born)} → {f.year_died != null ? formatYear(f.year_died) : 'presente'}
        </span>
      ),
    });
    metaLines.push({ label: 'Rol', value: f.role });
    if (f.polity?.length) {
      metaLines.push({
        label: 'Polities asociadas',
        value: (
          <span>
            {f.polity.map((pid, i) => (
              <span key={pid}>
                {i > 0 && ', '}
                <button className="ref-link" onClick={() => onSelect({ type: 'polity', id: pid })}>
                  {nameOf(data, 'polity', pid)}
                </button>
              </span>
            ))}
          </span>
        ),
      });
    }
  }
  if (sel.type === 'event') {
    const ev = entity as HistoricalEvent;
    metaLines.push({ label: 'Macro-región', value: data.regions.find((r) => r.id === ev.region)?.name ?? ev.region });
    metaLines.push({
      label: 'Fecha',
      value:
        ev.year_end != null && ev.year_end !== ev.year
          ? <YearRange start={ev.year} end={ev.year_end} />
          : <span className="meta-range">{formatYear(ev.year)}</span>,
    });
    metaLines.push({ label: 'Categoría', value: ev.category });
    if (ev.polities?.length) {
      metaLines.push({
        label: 'Polities involucradas',
        value: (
          <span>
            {ev.polities.map((pid, i) => (
              <span key={pid}>
                {i > 0 && ', '}
                <button className="ref-link" onClick={() => onSelect({ type: 'polity', id: pid })}>
                  {nameOf(data, 'polity', pid)}
                </button>
              </span>
            ))}
          </span>
        ),
      });
    }
  }
  if ('tags' in entity && entity.tags?.length) {
    metaLines.push({
      label: 'Tags',
      value: (
        <span className="tag-list">
          {entity.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </span>
      ),
    });
  }
  if ('wikidata' in entity && entity.wikidata) {
    metaLines.push({
      label: 'Wikidata',
      value: (
        <a href={`https://www.wikidata.org/wiki/${entity.wikidata}`} target="_blank" rel="noreferrer">
          {entity.wikidata}
        </a>
      ),
    });
  }

  // Cross-refs específicos
  const polity = sel.type === 'polity' ? (entity as Polity) : null;
  const religion = sel.type === 'religion' ? (entity as Religion) : null;
  const narrative = sel.type === 'narrative' ? (entity as Narrative) : null;

  return (
    <>
      <div className="panel-backdrop" onClick={onClose} aria-hidden />
      <aside className="detail-panel" role="dialog" aria-labelledby="detail-title">
        <header>
          <div>
            <span className="panel-type">{sel.type}</span>
            <h2 id="detail-title">{entity.name}</h2>
            {'name_en' in entity && entity.name_en && entity.name_en !== entity.name && (
              <p className="name-en">{entity.name_en}</p>
            )}
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Cerrar panel">×</button>
        </header>

        <dl className="meta-list">
          {metaLines.map((line, i) => (
            <div key={i} className="meta-row">
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>

        {narrative?.audio_url && (
          <div className="narrative-audio-block">
            <audio
              src={narrative.audio_url}
              controls
              preload="metadata"
              className="narrative-audio"
            >
              Tu navegador no soporta el elemento audio HTML5.
            </audio>
          </div>
        )}

        {entity.body_html && (
          <div className={`panel-body ${narrative ? 'narrative-body' : ''}`} dangerouslySetInnerHTML={{ __html: entity.body_html }} />
        )}

        {polity && (polity.event_ids?.length || polity.figure_ids?.length) && (
          <section className="cross-refs">
            {polity.figure_ids?.length ? (
              <div>
                <h3>Figuras asociadas ({polity.figure_ids.length})</h3>
                <ul className="ref-list">
                  {polity.figure_ids.map((fid) => {
                    const fig = data.figures.find((f) => f.id === fid);
                    if (!fig) return null;
                    return (
                      <li key={fid}>
                        <button className="ref-link" onClick={() => onSelect({ type: 'figure', id: fid })}>
                          {fig.name} <span className="ref-meta">({formatYear(fig.year_born)} · {fig.role})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {polity.event_ids?.length ? (
              <div>
                <h3>Eventos asociados ({polity.event_ids.length})</h3>
                <ul className="ref-list">
                  {polity.event_ids
                    .map((eid) => data.events.find((e) => e.id === eid))
                    .filter((e): e is HistoricalEvent => Boolean(e))
                    .sort((a, b) => a.year - b.year)
                    .map((ev) => (
                      <li key={ev.id}>
                        <button className="ref-link" onClick={() => onSelect({ type: 'event', id: ev.id })}>
                          {ev.name} <span className="ref-meta">({formatYear(ev.year)} · {ev.category})</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </section>
        )}

        {religion && (religion.polity_ids?.length || religion.figure_ids?.length) && (
          <section className="cross-refs">
            {religion.polity_ids?.length ? (
              <div>
                <h3>Polities con esta tradición ({religion.polity_ids.length})</h3>
                <ul className="ref-list">
                  {religion.polity_ids.map((pid) => {
                    const p = data.polities.find((pp) => pp.id === pid);
                    if (!p) return null;
                    return (
                      <li key={pid}>
                        <button className="ref-link" onClick={() => onSelect({ type: 'polity', id: pid })}>
                          {p.name} <span className="ref-meta">({formatYear(p.start_year)} → {formatYear(p.end_year)})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {religion.figure_ids?.length ? (
              <div>
                <h3>Figuras asociadas ({religion.figure_ids.length})</h3>
                <ul className="ref-list">
                  {religion.figure_ids.map((fid) => {
                    const f = data.figures.find((ff) => ff.id === fid);
                    if (!f) return null;
                    return (
                      <li key={fid}>
                        <button className="ref-link" onClick={() => onSelect({ type: 'figure', id: fid })}>
                          {f.name} <span className="ref-meta">({formatYear(f.year_born)} · {f.role})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </section>
        )}

        {entity.sources?.length ? (
          <section className="sources">
            <h3>Sources</h3>
            <ul>
              {entity.sources.map((src, i) => {
                const isUrl = /^https?:\/\//.test(src);
                return (
                  <li key={i}>
                    {isUrl ? (
                      <a href={src} target="_blank" rel="noreferrer">{src}</a>
                    ) : (
                      <span>{src}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </aside>
    </>
  );
}
