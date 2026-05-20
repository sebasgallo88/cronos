import { useCallback, useEffect, useState } from 'react';
import HistomapCanvas from './HistomapCanvas';
import FilterSidebar from './FilterSidebar';
import DetailPanel, { type SelectedEntity } from './DetailPanel';
import { defaultFilterState, type FilterState } from '../lib/filters';
import type { CronosData } from '../lib/dataTypes';

const COLLAPSED_KEY = 'cronos.collapsedRegions.v1';

interface Props {
  data: CronosData;
}

export default function HistomapApp({ data }: Props) {
  const [filters, setFilters] = useState<FilterState>(() => defaultFilterState(data));
  const [selected, setSelected] = useState<SelectedEntity | null>(null);

  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsedRegions]));
    } catch {
      // ignore (private mode, quota, etc.)
    }
  }, [collapsedRegions]);

  const handleToggleRegion = useCallback((regionId: string) => {
    setCollapsedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFilters(defaultFilterState(data));
    setCollapsedRegions(new Set());
  }, [data]);

  return (
    <div className="histomap-app">
      <FilterSidebar
        data={data}
        filters={filters}
        onChange={setFilters}
        onReset={handleReset}
      />
      <div className="histomap-main">
        <HistomapCanvas
          data={data}
          filters={filters}
          collapsedRegions={collapsedRegions}
          onToggleRegion={handleToggleRegion}
          onSelect={(e) => setSelected(e as SelectedEntity)}
        />
      </div>
      <DetailPanel
        data={data}
        selected={selected}
        onClose={() => setSelected(null)}
        onSelect={setSelected}
      />
    </div>
  );
}
