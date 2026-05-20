# Cronos — Modelo de datos

Copia limpia y consolidada del schema (PLAN.md §3). Documento de referencia para que cualquiera (vos o un contributor futuro) entienda la forma de los datos sin tener que leer todo el PLAN.

**Source of truth:** los `.md` en `content/`. **Build artifact:** `src/data/cronos.json` (generado por `npm run build-data`).

---

## Macro-regiones canónicas

Las polities se agrupan en **lanes** por macro-región. Las 10 son fijas en v1:

| id | Nombre |
|---|---|
| `mediterraneo` | Mediterráneo |
| `europa` | Europa (post-Roma) |
| `medio-oriente` | Medio Oriente / Mesopotamia / Persia |
| `norte-africa` | Norte de África / Egipto |
| `africa-subsahariana` | África Sub-Sahariana |
| `sur-asia` | Sur de Asia (India) |
| `este-asia` | Este de Asia (China / Corea / Japón) |
| `sudeste-asia` | Sudeste Asiático |
| `estepa` | Estepa / Asia Central |
| `americas` | Américas (Norte / Mesoamérica / Sur) |

---

## Tipos de entidad

Cada entidad es un `.md` con frontmatter YAML + body markdown. Hay 4 tipos:

### `polity` (en `content/polities/`)

Imperios, reinos, califatos, ciudades-estado, federaciones, polities nómades.

```yaml
---
type: polity                        # const
id: roma                            # slug = filename sin .md, lowercase kebab
name: Imperio Romano                # ES, obligatorio
name_en: Roman Empire               # EN, opcional
name_native: ''                     # opcional (script original)
start_year: -27                     # BCE negativo, CE positivo, integer
end_year: 476                       # start_year < end_year (validado)
region: mediterraneo                # uno de los 10 macro-regiones
capital: Roma                       # libre (capitales sucesivas OK)
religion_dominant:                  # ids de content/religions/
  - religion-romana-tradicional
  - cristianismo
predecessors: [republica-romana]    # ids de polities
successors: [imperio-romano-oriental, reinos-germanicos]
color: "#8B0000"                    # hex, obligatorio
tags: [imperio, mediterranean-power]
# Opcionales (enriquecidos desde Seshat):
population_peak: 60000000           # integer ≥ 0
area_peak_km2: 5000000              # integer ≥ 0
religious_complexity_score: 4       # 1-5
wikidata: Q2277                     # opcional, formato Q\d+
sources:                            # array de strings, ≥1
  - https://en.wikipedia.org/wiki/Roman_Empire
created: '2026-05-19'               # ISO date string
updated: '2026-05-19'
---
```

**Validaciones de polity (hard-fail):**
- `start_year` < `end_year`.
- `region` ∈ las 10 macro-regiones.
- `color` matchea `^#[0-9A-Fa-f]{6}$`.
- `sources` no vacío.
- `id` matchea filename.
- `id` único entre polities.

### `religion` (en `content/religions/`)

Tradiciones religiosas. Renderizadas como banda separada arriba del histomap.

```yaml
---
type: religion
id: cristianismo
name: Cristianismo
name_en: Christianity
start_year: 30                      # aprox.
end_year: null                      # null = vigente
region_birth: medio-oriente
branch_of: judaismo                 # id de otra religion, o null si raíz
branches:                           # ids de religiones derivadas
  - catolicismo
  - ortodoxia
  - protestantismo
color: "#8B4513"
tags: [abrahamica]
wikidata: Q5043
sources: [https://en.wikipedia.org/wiki/Christianity]
created: '2026-05-19'
updated: '2026-05-19'
---
```

### `figure` (en `content/figures/`)

Personas históricas individuales. Renderizadas como dots sobre la lane de su polity primaria.

```yaml
---
type: figure
id: alejandro-magno
name: Alejandro Magno
name_en: Alexander the Great
year_born: -356
year_died: -323                     # null si todavía vivo
polity:                             # array de polity ids
  - reino-de-macedonia
region: mediterraneo
role: militar                       # militar | religioso | filosofo | cientifico | politico | artista
tags: [conquistador]
wikidata: Q8409
sources: [https://en.wikipedia.org/wiki/Alexander_the_Great]
created: '2026-05-19'
updated: '2026-05-19'
---
```

### `event` (en `content/events/`)

Eventos puntuales o rangos cortos. Renderizadas como dots con categoría.

```yaml
---
type: event
id: caida-constantinopla-1453
name: Caída de Constantinopla
year: 1453
year_end: null                      # null = puntual; integer si rango
polities:                           # ids de polities involucradas
  - imperio-romano-oriental
  - imperio-otomano
region: medio-oriente
category: militar                   # militar | politico | religioso | cientifico | cultural | economico | desastre
tags: [guerra]
wikidata: Q193410
sources: [https://en.wikipedia.org/wiki/Fall_of_Constantinople]
created: '2026-05-19'
updated: '2026-05-19'
---
```

---

## Output JSON shape (`src/data/cronos.json`)

Generado por `scripts/build-data.mjs`. Forma:

```json
{
  "meta": {
    "generated_at": "2026-05-19T...",
    "polity_count": 52,
    "religion_count": 10,
    "figure_count": 387,
    "event_count": 412,
    "time_range": [-5000, 2026]
  },
  "regions": [
    { "id": "mediterraneo", "name": "Mediterráneo", "name_en": "Mediterranean", "order": 1 },
    "..."
  ],
  "polities": [
    {
      "id": "roma",
      "name": "Imperio Romano",
      "start_year": -27, "end_year": 476,
      "region": "mediterraneo",
      "religion_dominant": ["religion-romana-tradicional", "cristianismo"],
      "color": "#8B0000",
      "tags": ["imperio"],
      "body_html": "<h1>Imperio Romano</h1>...",
      "..." : "(resto del frontmatter)"
    }
  ],
  "religions": ["..."],
  "figures": ["..."],
  "events": ["..."]
}
```

`body_html` se renderiza con `marked` en F6.

---

## Validación

```bash
npm run validate              # warnings OK, exit 0 a menos que haya schema/cross-field errors
npm run validate -- --strict  # warnings → errors
npm run lint-balance          # cuotas no-Eurocentric mínimas
```

**Cross-fields validados:**
- polity: `start_year < end_year`
- religion: si `end_year != null`, `start_year ≤ end_year`
- figure: si `year_died != null`, `year_born ≤ year_died`
- event: si `year_end != null`, `year ≤ year_end`

**Cross-refs (warnings, no errors):**
- polity.religion_dominant → religion ids deben existir
- polity.predecessors / successors → polity ids
- religion.branch_of / branches → religion ids
- figure.polity → polity ids
- event.polities → polity ids

Warnings no rompen el build (porque las entidades referenciadas pueden estar pending de ingest). `--strict` los promueve a errors.
