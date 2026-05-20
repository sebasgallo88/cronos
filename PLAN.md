# Cronos — Plan de Implementación

**Working name del proyecto:** Cronos.
**Repo root:** `/Users/sebasgallo/Cronos project/` (ya existe, vacío).
**Idioma del proyecto:** español primario para todo content (markdown). Código en inglés.
**Owner:** Sebastián Gallo.
**Plan version:** v1 — 2026-05-19.

---

## Cómo leer este plan

Cada fase y cada tarea tiene una etiqueta `[modelo: opus | sonnet | haiku]` con la razón en una línea. La sesión que ejecute este plan **debe** respetar esas anotaciones para optimizar costo/latencia/calidad.

Convenciones de modelo (alineadas con CLAUDE.md del vault del usuario):

- **Opus 4.7** (`claude-opus-4-7`) — decisiones de arquitectura, curación editorial no trivial, SPARQL queries con joins complejos, diseño de D3, debugging estructural, code review de cambios que tocan el shape de los datos.
- **Sonnet 4.6** (`claude-sonnet-4-6`) — implementación de Astro pages/componentes una vez el patrón está claro, scripts ETL siguiendo template, tests, refactors que siguen un patrón ya establecido, documentación derivada.
- **Haiku 4.5** (`claude-haiku-4-5-20251001`) — boilerplate de markdown desde CSV (50 archivos parecidos), lint/format, renames, verificaciones simples, subagents paralelos chicos.

Si la sesión ejecutora no tiene forma de cambiar de modelo, debe **al menos** declarar al inicio de cada fase qué modelo le tocaría idealmente y por qué — así Sebas puede partir la sesión en chunks por modelo si quiere.

---

## 0. Contexto

**Origen:** Sebastián quiere recorrer la historia humana desde el principio y ver en paralelo qué pasaba en distintas geografías/civilizaciones/religiones. Falla actual: difícil mantener en la cabeza qué era contemporáneo a qué (¿Egipto antes o después de Grecia? ¿qué pasaba en América cuando Roma caía? ¿qué hacía Mesopotamia mientras los Han chinos?).

**Problema resuelto:** una sola vista comparable y filtrable de la historia humana — civilizaciones, religiones, figuras y eventos clave — en lanes paralelas con eje temporal compartido. Filtrable por geografía, religión y tipo de civilización. Web-based para acceder desde cualquier dispositivo y eventualmente compartible con otros.

**Forma del proyecto:** Cronos es un proyecto **aparte del vault SG 2nd Brain**. Es un dataset estructurado + software (Astro + D3, deploy a Cloudflare Pages), no un knowledge graph personal. La separación evita ruido para las skills del vault (`/lint`, `/compound`, `/graphify`), permite compartir el repo eventualmente, mantiene clean el git history del vault, y respeta que civilizaciones y figuras históricas no son "personas" o "conceptos" en el sentido que el vault de Sebas usa.

**Por qué no usar una herramienta existente:** ya hay prior art (Histography.io, Running Reality, GeaCron, Chronas, ChronoZoom, plugins de Obsidian) pero ninguna combina las propiedades que Sebas quiere: Histomap-style parallel lanes + cobertura global no-Eurocentric + sources verificables + own-your-data (markdown source of truth) + deploy estático. El nicho existe.

**Restricciones del usuario (CLAUDE.md derivado del vault):**

- Sebas no es developer; debe poder mantener esto solo durante 5+ años.
- Preferencia fuerte por markdown-first sobre DBs.
- Patrón de deploy ya conocido: CF Pages desde markdown estático (vive en `~/SG 2nd brain/💡 Proyectos/Personal Site/` y deploya `sebastiangallo.com`; mismo patrón para `accrety.ai`).
- Primary language del content: español. UI bilingüe deseable.

---

## 1. Objetivos y no-objetivos

### Goals (v1)

1. **Histomap interactivo** estilo lanes horizontales con eje temporal compartido (~5000 BCE → 2026 CE), ~50 polities globalmente distribuidas, ~10 tradiciones religiosas, ~200-500 figuras y ~300-500 eventos.
2. **Filtros funcionales** por: región geográfica, tradición religiosa, tipo de entidad (polity/religion/figure/event), era.
3. **Detail panel** que muestre el markdown rendered de la entidad al click (descripción, fechas, sources).
4. **Datos como markdown** en el repo, con frontmatter como schema; build pipeline genera `cronos-data.json` para el webapp.
5. **No-Eurocentric desde el día 1.** Distribución mínima de las 50 polities: ≥5 cada una en Sub-Sahariana, Américas pre-colombinas, Estepa/Asia central, Sur de Asia, Este de Asia, Sudeste asiático, Medio Oriente, Mediterráneo, Europa.
6. **Sources verificables.** Cada entidad markdown tiene `sources:` frontmatter (URLs, libros, papers).
7. **Deploy a Cloudflare Pages** con dominio definitivo (decisión abierta — ver §13).
8. **Build < 30s, page-load < 2s, interactive < 100ms en desktop moderno.**

### Non-goals (explícitamente fuera de v1)

- Map view / geo-spatial (la mención de geografía es como **filtro**, no como vista).
- Network/influence graph (quién influyó a quién).
- Sistema de usuarios / accounts (es read-only para visitantes; Sebas edita via Git).
- Comentarios / community features.
- Mobile-first edit UX (editar es desde laptop, en markdown).
- Log-scale time axis (linear con zoom-pan v1; log más adelante si hace falta).
- Live Wikidata overlay (se hace ingest, se cachea, se cura — no live query en producción).
- Animaciones / transitions complejas (CSS transitions OK; nada de WebGL).
- Internacionalización full. UI en español como default; "EN" toggle opcional v1.

### Success criteria — cómo sabemos que v1 está done

- [ ] El histomap renderiza 50 polities × 7000 años en < 2s.
- [ ] Filtros region/religion/type cambian la vista en < 100ms.
- [ ] Click en una entidad abre side panel con markdown content + sources clickables.
- [ ] Las 50 polities iniciales pasan el balance check no-Eurocentric (≥5 por macro-región).
- [ ] Build reproduce sin error desde `git clone` en máquina limpia con Node 20+.
- [ ] Deploy en CF Pages con dominio asignado y SSL OK.
- [ ] Sebas puede agregar un evento nuevo editando un `.md`, hacer `npm run build`, ver el evento aparecer.

---

## 2. Decisiones arquitectónicas (con razón)

### D1. Stack: Astro + D3 + Cloudflare Pages

**Astro** porque:
- Markdown nativo con frontmatter parseado automáticamente.
- Islands architecture: el sitio es estático con 0 JS por default, sólo el componente del Histomap hidrata.
- Match con el patrón de deploy que Sebas ya usa (`/deploy-personal-site` y `/deploy-accrety` skills).
- Mantenible solo en 5 años (sintaxis simple, doc estable, no SPA churn).

**D3** porque:
- Único lib con flexibilidad real para multi-lane custom con eje BCE→CE.
- Maneja negative years vía scale custom (no nativo en ningún lib, pero D3 es el más limpio).
- 25k+ stars, 11+ años, no va a desaparecer.
- Bundle modular: import sólo `d3-scale`, `d3-axis`, `d3-selection`, `d3-zoom` (~30 KB gzipped).

**Cloudflare Pages** porque:
- Sebas ya tiene 2 sitios deployados ahí (sebastiangallo.com, accrety.ai).
- Free tier suficiente.
- Git push → auto-deploy.
- Edge global, fast.

**Alternativas descartadas (con razón breve):**
- Vis.js → out-of-the-box lanes pero visual default es feo, custom es trabajo similar a D3 con menos control.
- Observable Plot → más limpio que D3 pero ecosistema más pequeño; en 5 años puede no tener tutorials cuando los necesite.
- React-Chrono / TimelineJS → single-track o storytelling, no parallel lanes.
- Next.js / SvelteKit → overkill para sitio estático.

### D2. Markdown como source of truth, JSON como build artifact

- Cada polity/religion/figure/event es un `.md` con frontmatter.
- Build script (`scripts/build-data.mjs`) lee todos los `.md`, valida frontmatter contra schema, escribe `src/data/cronos.json`.
- El webapp consume el JSON; el markdown es el archivo que Sebas edita.
- Markdown body (debajo del frontmatter) = descripción rica que aparece en el side panel.

**Por qué no un JSON/CSV único como fuente:** editar 500 eventos en un solo JSON es horrible; un archivo por entidad permite git diffs claros, edits paralelos sin merge conflicts, y descripción rica per entidad.

### D3. Bootstrap data sources — combinación de 3

Orden de prioridad:

1. **Cliopatria** (Harvard Dataverse, CC-BY) — 226 polities globales con start/end + GeoJSON, 3400 BCE→2024 CE. Source primario para las 50 polities. NON-Eurocentric por diseño. URL: `https://dataverse.harvard.edu` (search "Cliopatria"); DOI-citable.
2. **Wikidata** (SPARQL endpoint, CC0) — para rulers, founders, religious figures, events. `https://query.wikidata.org/sparql`.
3. **Seshat Global History Databank** (CC-BY, requiere account) — para enriquecer cultural complexity, religion variables. `https://seshatdatabank.info/`.

Cross-reference vía Wikidata Q-numbers como ID canónico cuando exista. Cada `.md` lleva `wikidata: Q12544` cuando aplique.

### D4. Dominio y deployment

Tres opciones (Sebas decide en §13):
- A. **Subdominio**: `cronos.sebastiangallo.com` — reusa zona DNS existente.
- B. **Subpath**: `sebastiangallo.com/cronos` — agregar al sitio personal existente (más fricción de deploy, mezcla concerns).
- C. **Dominio nuevo**: `cronos.app` o similar — más caro, marca propia.

Recomendación: **A (subdominio)** — bajo costo, marca personal asociada, mantenible solo.

### D5. Repositorio Git

- Repo nuevo en `/Users/sebasgallo/Cronos project/`.
- Branch principal: `main`.
- GitHub remote: `gh repo create cronos --private --source=. --remote=origin` (sebas decide private vs public; default private).
- CF Pages conectado al repo: auto-deploy en push a `main`.
- `.gitignore` estándar Node + `node_modules/`, `.astro/`, `dist/`, `.DS_Store`.

### D6. Time axis: linear con zoom-pan

Linear porque:
- Match con cómo la gente piensa cronología.
- Zoom-pan resuelve el problema de "el modernismo aplasta a la prehistoria" — el usuario puede zoom in al período que le interese.
- Log-scale toggle es una feature post-v1 si Sebas la quiere.

Rango por default al abrir: 3000 BCE → 2026 CE. El usuario puede zoom-out a 10000 BCE o zoom-in a una década.

### D7. Lane organization

Lanes agrupadas por **macro-región geográfica**, no por tipo de civilización ni por religión. Razón: la geografía es el invariante más estable; tipo y religión cambian con el tiempo, geografía no.

Macro-regiones canónicas (10):

1. Mediterráneo
2. Europa (post-Roma)
3. Medio Oriente / Mesopotamia / Persia
4. África Sub-Sahariana
5. Norte de África / Egipto (pre-conquista árabe; post se mueve a Medio Oriente conceptualmente, pero por estabilidad geográfica se queda acá)
6. Sur de Asia (India)
7. Este de Asia (China / Corea / Japón)
8. Sudeste Asiático
9. Estepa / Asia Central
10. Américas (Norte / Mesoamérica / Sur)

Cada macro-región es un grupo colapsable. Default: todas expandidas. Religiones aparecen en una **banda separada arriba del histomap**, no dentro de las lanes regionales.

---

## 3. Modelo de datos (schemas completos)

Todos los `.md` viven en `content/` (Astro convention). Estructura:

```
content/
├── polities/
│   ├── roma.md
│   ├── han-china.md
│   ├── imperio-mali.md
│   └── ...
├── religions/
│   ├── cristianismo.md
│   └── ...
├── figures/
│   ├── alejandro-magno.md
│   └── ...
└── events/
    ├── caida-constantinopla-1453.md
    └── ...
```

### 3.1. `polities/*.md` schema

```yaml
---
type: polity
id: roma
name: Imperio Romano
name_en: Roman Empire
start_year: -27         # BCE como negativo
end_year: 476           # CE positivo
region: mediterraneo    # uno de los 10 macro-regiones (slug)
capital: Roma           # capital(es) sucesivas como string libre
religion_dominant:      # array de religion ids; vacío si secular
  - religion-romana-tradicional
  - cristianismo        # post-380 CE
predecessors:           # IDs de polities que antecedieron territorialmente
  - republica-romana
successors:             # IDs de polities sucesoras
  - imperio-romano-oriental
  - reinos-germanicos
color: "#8B0000"        # color de la lane (hex)
tags:
  - imperio
  - mediterranean-power
# Opcionales (enriquecidos desde Seshat en F5):
population_peak: 60000000      # opcional
area_peak_km2: 5000000         # opcional
religious_complexity_score: 4  # opcional, 1-5
wikidata: Q2277
sources:
  - https://en.wikipedia.org/wiki/Roman_Empire
  - https://seshatdatabank.info/polity/RomanEmpire
  - "Goldsworthy, Adrian. *The Fall of the West* (2009)"
created: 2026-05-19
updated: 2026-05-19
---

# Imperio Romano

Markdown body con descripción rica. Aparece en el side panel.

## Periodos clave

- Principado (27 BCE - 284 CE)
- Dominado (284 CE - 476 CE)

## Eventos asociados

[autogenerado por build script — lista de events con polities: [roma]]
```

**Validaciones (build-time, hard-fail si no pasan):**

- `start_year` < `end_year`.
- `region` ∈ {mediterraneo, europa, medio-oriente, africa-subsahariana, norte-africa, sur-asia, este-asia, sudeste-asia, estepa, americas}.
- `color` matches `^#[0-9A-Fa-f]{6}$`.
- `sources` no vacío.

### 3.2. `religions/*.md` schema

```yaml
---
type: religion
id: cristianismo
name: Cristianismo
name_en: Christianity
start_year: 30          # aprox. crucifixión
end_year: null          # null = vigente
region_birth: medio-oriente
branch_of: judaismo     # null si tradición raíz
branches:               # tradiciones derivadas
  - catolicismo
  - ortodoxia
  - protestantismo
color: "#8B4513"
wikidata: Q5043
sources:
  - ...
created: 2026-05-19
updated: 2026-05-19
---

Markdown body...
```

### 3.3. `figures/*.md` schema

```yaml
---
type: figure
id: alejandro-magno
name: Alejandro Magno
name_en: Alexander the Great
year_born: -356
year_died: -323
polity:                 # polities con las que está asociado
  - reino-de-macedonia
region: mediterraneo
role: militar           # militar | religioso | filósofo | científico | político | artista
tags:
  - conquistador
wikidata: Q8409
sources:
  - ...
created: 2026-05-19
updated: 2026-05-19
---

Markdown body...
```

### 3.4. `events/*.md` schema

```yaml
---
type: event
id: caida-constantinopla-1453
name: Caída de Constantinopla
year: 1453
year_end: null          # null si evento puntual; valor si rango
polities:               # polities involucradas
  - imperio-romano-oriental
  - imperio-otomano
region: medio-oriente   # región donde ocurrió
category: militar       # militar | político | religioso | científico | cultural | económico | desastre
tags:
  - guerra
wikidata: Q193410
sources:
  - ...
created: 2026-05-19
updated: 2026-05-19
---

Markdown body...
```

### 3.5. JSON output shape (`src/data/cronos.json`)

Generado por `scripts/build-data.mjs`. Forma exacta:

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
    { "id": "mediterraneo", "name": "Mediterráneo", "order": 1 },
    ...
  ],
  "polities": [
    {
      "id": "roma",
      "name": "Imperio Romano",
      "start": -27, "end": 476,
      "region": "mediterraneo",
      "religion_dominant": ["religion-romana-tradicional", "cristianismo"],
      "color": "#8B0000",
      "tags": ["imperio"],
      "body_html": "<h1>Imperio Romano</h1>..."
    },
    ...
  ],
  "religions": [...],
  "figures": [...],
  "events": [...]
}
```

`body_html` se genera con `marked` o `remark-html` a build time (no se hace runtime markdown parse).

---

## 4. Estructura del repo

```
/Users/sebasgallo/Cronos project/
├── PLAN.md                        ← este plan copiado acá al iniciar
├── README.md
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── .gitignore
├── .nvmrc                         ← "20"
├── .editorconfig
├── content/                       ← markdown source of truth
│   ├── polities/
│   ├── religions/
│   ├── figures/
│   └── events/
├── scripts/                       ← ETL + build helpers
│   ├── ingest-cliopatria.mjs      ← descarga + parsea GeoJSON
│   ├── ingest-wikidata.mjs        ← SPARQL queries
│   ├── ingest-seshat.mjs          ← CSV import
│   ├── build-data.mjs             ← markdown → cronos.json
│   ├── validate-frontmatter.mjs   ← schema validation
│   └── lint-balance.mjs           ← check no-Eurocentric balance
├── _sources/                      ← gitignored cache de fuentes
│   ├── cliopatria.geojson
│   ├── wikidata-cache/
│   └── seshat.csv
├── src/
│   ├── components/
│   │   ├── Histomap.astro         ← Astro wrapper
│   │   ├── HistomapCanvas.tsx     ← React island con D3 (Solid/Preact también OK)
│   │   ├── FilterSidebar.tsx
│   │   └── DetailPanel.tsx
│   ├── data/
│   │   └── cronos.json            ← build artifact
│   ├── pages/
│   │   └── index.astro            ← single-page app
│   ├── styles/
│   │   └── global.css
│   └── lib/
│       ├── timeScale.ts           ← d3 scale custom para BCE→CE
│       ├── laneLayout.ts          ← cálculo de lanes
│       └── filters.ts
├── public/
│   ├── favicon.ico
│   └── og-image.png
└── docs/
    ├── data-model.md              ← copia limpia de §3 de este plan
    ├── adding-an-entity.md        ← guía para Sebas
    └── deploy.md                  ← runbook deploy CF Pages
```

---

## 5. Fases de ejecución

**Total estimado:** ~3-4 semanas calendario asumiendo Sebas dedica 1-2h/día (no full-time). Cada fase tiene su modelo recomendado y criterios de done.

### F1. Bootstrap del repo + Astro + CI

**Objetivo:** repo Git inicializado, Astro corriendo en dev, deploy a CF Pages funcionando con página placeholder.

**Tareas:**
1. `cd "/Users/sebasgallo/Cronos project"` && `git init` && primer commit con `.gitignore`, `.nvmrc`, `README.md` stub. **[modelo: sonnet]** — sigue patrón estándar.
2. `npm create astro@latest .` con template "Minimal" + TypeScript strict + React integration (`@astrojs/react`). **[modelo: sonnet]**.
3. Configurar `astro.config.mjs` con `output: 'static'`, integración React para los islands del Histomap. **[modelo: sonnet]**.
4. Página `index.astro` con un H1 "Cronos — work in progress". **[modelo: haiku]**.
5. `gh repo create` (Sebas decide private/public — default private). **[modelo: sonnet]** + Sebas confirma.
6. Setup CF Pages: nuevo proyecto en dashboard, conectar al repo, build command `npm run build`, output dir `dist`. **[modelo: sonnet]** + Sebas en CF dashboard.
7. Verificar deploy en `cronos-XXX.pages.dev`. **[modelo: sonnet]**.

**Done:** push a main dispara deploy, página placeholder visible en `*.pages.dev`.

**Estimado:** 2-3 horas.

---

### F2. Schema validation + structure scaffold

**Objetivo:** dejar listas las validaciones de frontmatter y el build script vacío (sin data aún) para que F5 pueda empujar y romper temprano.

**Tareas:**
1. Crear los 4 directorios en `content/` con un README explicando el schema de cada tipo. **[modelo: sonnet]**.
2. Implementar `scripts/validate-frontmatter.mjs` con Ajv + JSON schemas (uno por type). Hard-fail si un campo obligatorio falta o tipo es incorrecto. **[modelo: opus]** — el schema design es load-bearing; opus para no perder edge cases.
3. Implementar `scripts/build-data.mjs` vacío (lee todos los `.md`, log count, escribe JSON con `meta` solo). **[modelo: sonnet]**.
4. Agregar npm scripts: `validate`, `build-data`, `build` (corre validate + build-data + astro build). **[modelo: haiku]**.
5. Crear 1 polity de muestra (`roma.md` con frontmatter completo) para validar el pipeline. **[modelo: sonnet]** — content editorial mínimo.

**Done:** `npm run build` corre sin error con 1 polity y genera `cronos.json` con meta + 1 polity.

**Estimado:** 4-5 horas.

---

### F3. Ingest Cliopatria → markdown skeleton

**Objetivo:** parsear Cliopatria GeoJSON, seleccionar 50 polities balanceadas, generar 50 `.md` skeleton con frontmatter completo y body stub.

**Tareas:**
1. Bajar Cliopatria GeoJSON desde Harvard Dataverse (revisar DOI canónico). Cachear en `_sources/cliopatria.geojson`. **[modelo: sonnet]** + posible review humano del DOI.
2. Implementar `scripts/ingest-cliopatria.mjs` que parsea GeoJSON, agrupa por polity, calcula start/end year y región. **[modelo: opus]** — temporal ambiguity y region assignment requieren judgment.
3. **Curación editorial: selección de las 50.** Esto **no es automatizable** sin sesgo. Modelo opus debe proponer las 50 con balance:
   - ≥5 Sub-Sahariana (Mali, Songhai, Aksum, Great Zimbabwe, Kongo, Ethiopia, Benin, Oyo)
   - ≥5 Américas pre-colombinas (Olmeca, Maya, Tolteca, Azteca, Norte Chico, Chavín, Inca, Mississipi, Cahokia)
   - ≥5 Estepa/Asia Central (Escitas, Xiongnu, Sasánida-influencia, Mongoles, Timúridas, Kazajos)
   - ≥5 Sur de Asia (Maurya, Gupta, Chola, Mughal, Vijayanagara, Maratha)
   - ≥5 Este de Asia (Shang, Zhou, Qin, Han, Tang, Song, Yuan, Ming, Qing, Joseon, periodos japoneses)
   - ≥3 Sudeste Asiático (Funan, Srivijaya, Majapahit, Khmer, Ayutthaya, Dai Viet)
   - ≥5 Medio Oriente (Sumeria, Acadia, Babilonia, Asiria, Persia Aqueménida, Sasánida, Califato Omeya, Abbasí, Selyúcidas, Mamelucos, Otomano, Safávida)
   - ≥4 Mediterráneo (Egipto Antiguo, Minoica, Micénica, Cartago, Grecia clásica, Roma)
   - ≥4 Europa post-Roma (Bizancio, Francos, Sacro Imperio, Inglaterra/UK, Francia, España, Rusia)
   - ≥3 Norte de África / pre-árabe (Egipto faraónico, ya en Mediterráneo; Nubia/Kush, Cartago, Mauretania)

   **Output:** lista commiteada en `docs/polities-curation.md` con razón de inclusión por cada uno. **[modelo: opus]** + Sebas review.
4. Generar 50 `.md` skeleton con frontmatter de Cliopatria + body stub `## TODO: descripción`. Color: paleta autogenerada o curada. **[modelo: haiku]** — boilerplate puro.
5. Correr `npm run validate` para confirmar que los 50 pasan schema. **[modelo: haiku]**.
6. Correr `scripts/lint-balance.mjs` (creado en este paso) que verifica el balance por macro-región. **[modelo: sonnet]**.

**Done:** 50 polities `.md` en `content/polities/`, todos válidos, balance check pasa, `cronos.json` los incluye.

**Estimado:** 1-2 días.

---

### F4. Ingest Wikidata para religiones y figuras

**Objetivo:** generar ~10 `.md` de tradiciones religiosas y ~200 figuras clave desde Wikidata.

**Tareas:**
1. Definir las 10 tradiciones religiosas canónicas: Judaísmo, Cristianismo, Islam, Hinduismo, Budismo, Jainismo, Daoismo, Confucianismo, Zoroastrismo, Religiones indígenas (cluster). **[modelo: opus]** — decisión editorial sensible (qué cuenta como "tradición religiosa"; cómo tratar religiones indígenas pre-cristianas que son cientos).
2. Implementar `scripts/ingest-wikidata.mjs` con SPARQL client. Queries pre-definidos en `scripts/sparql/`:
   - `religions.sparql` — tradiciones con `instance of (P31) → religion (Q9174)` o similar.
   - `religious-founders.sparql` — humanos con `religion founded (P166)`.
   - `rulers-by-polity.sparql` — paramétrico, recibe Wikidata Q-number del polity.
   - `key-figures-by-occupation.sparql` — filósofos, científicos, líderes militares, artistas con `significant person` flag.

   **[modelo: opus]** — escribir SPARQL no trivial requiere razonamiento. Una vez los queries están escritos, **[modelo: sonnet]** para el runner script.
3. Curación de las figuras: max 5-10 por polity para no inflar. **[modelo: opus]** + Sebas.
4. Generar `.md` skeleton para 10 religions + ~200 figures. **[modelo: haiku]**.
5. Validate + lint-balance check (asegurar figuras balanceadas geográficamente). **[modelo: haiku]**.

**Done:** 10 religions + ~200 figures en `content/`, todos válidos, distribución geográfica balanceada.

**Estimado:** 2-3 días.

---

### F5. Ingest Seshat + manual events

**Objetivo:** enriquecer polities con cultural complexity desde Seshat; agregar ~300 eventos clave.

**Tareas:**
1. Crear account en Seshat, descargar CSV. **[modelo: sonnet]** + Sebas.
2. Implementar `scripts/ingest-seshat.mjs` que joinea Seshat polities con nuestras 50 (fuzzy match por name + start_year). **[modelo: opus]** — fuzzy match es donde se pierden datos sin querer.
3. Update frontmatter de polities con campos enriquecidos (opcional, no obligatorio v1): `population_peak`, `area_peak_km2`, `religious_complexity_score`. **[modelo: sonnet]**.
4. **Curación manual de ~300 eventos.** Sebas elige los que le importan en colaboración. Categorías: militares (batallas pivotales), políticos (fundaciones/caídas), religiosos (concilios, hijras, reformas), científicos (descubrimientos), culturales (obras, traducciones), económicos (rutas comerciales abiertas/cerradas), desastres (pestes, sequías que tumbaron civilizaciones). Mix de auto-pull desde Wikidata (events con `point in time` cerca de polities relevantes) + edits manuales de Sebas. **[modelo: opus]** para selección + **[haiku]** para boilerplate.
5. Validate.

**Done:** ~300 events `.md`, polities enriquecidas, todo válido.

**Estimado:** 3-5 días (Sebas en el loop de selección).

---

### F6. Build script markdown → JSON (final)

**Objetivo:** `build-data.mjs` produce el JSON final con `body_html` rendered.

**Tareas:**
1. Agregar markdown → HTML rendering (lib: `marked` con `marked-gfm-heading-id` para anclas). **[modelo: sonnet]**.
2. Generar `body_html` por entidad. **[modelo: sonnet]**.
3. Computar lista de cross-references (events de cada polity, figures de cada polity, polities de cada religion). **[modelo: sonnet]**.
4. Output `src/data/cronos.json` minified si > 500 KB. **[modelo: haiku]**.

**Done:** `cronos.json` final con todas las entidades + body_html + cross-refs.

**Estimado:** 4-6 horas.

---

### F7. D3 Histomap canvas v0 (single track, sin filtros)

**Objetivo:** un componente React (island Astro) que renderiza UNA lane horizontal con eventos como dots y polity bars. Sin filtros aún. Probar zoom-pan.

**Tareas:**
1. Crear `src/lib/timeScale.ts` con `d3.scaleLinear` adaptado a years (negative incluido). Tick formatter custom: `-500 → "500 BCE"`, `1500 → "1500 CE"`. **[modelo: opus]** — load-bearing primitive.
2. Implementar `src/components/HistomapCanvas.tsx` que:
   - Carga `cronos.json` (import directo, Astro lo embebe).
   - Renderiza 1 polity como barra coloreada con `d3-selection` + SVG.
   - Tiene zoom-pan con `d3-zoom`.
   - Tiene eje superior con ticks formateados.
   **[modelo: opus]** para diseño inicial; refactors **[sonnet]**.
3. Integrar en `pages/index.astro` con `client:visible` directive. **[modelo: sonnet]**.
4. Verificar performance: zoom suave, sin reflow visible. **[modelo: sonnet]** test + **[opus]** si requiere perf optimization.

**Done:** página local muestra 1 lane con Roma, zoom-pan funciona, eje con ticks BCE/CE correctos.

**Estimado:** 1-2 días.

---

### F8. D3 Histomap multi-lane + grouping por región + filtros

**Objetivo:** todas las 50 lanes visibles, agrupadas por macro-región (colapsables), con filter sidebar funcional.

**Tareas:**
1. Layout multi-lane: cálculo de Y-position por polity dentro de su región-grupo. `src/lib/laneLayout.ts`. **[modelo: opus]** — algoritmo no trivial (overlap detection si hace falta sub-lanes dentro de una región).
2. Grupos colapsables: header por región, click para colapsar/expandir, persiste en localStorage. **[modelo: sonnet]**.
3. Filter sidebar (`FilterSidebar.tsx`):
   - Toggle por macro-región (10 checkboxes).
   - Toggle por tradición religiosa (10 checkboxes).
   - Toggle por tipo (polity/religion-band/figure-dot/event-dot).
   - Range filter por era (slider).
   **[modelo: opus]** para diseño UX + **[sonnet]** para impl.
4. Reactivity: filtros mutan estado React → Histomap re-renderiza solo los entries visibles. **[modelo: opus]** — performance load-bearing con 1000+ entries.
5. Religion bands arriba del histomap (Y separado). **[modelo: sonnet]**.
6. Figure dots en su año de nacimiento, posicionados sobre la lane de su polity primario. **[modelo: sonnet]**.
7. Event dots en su año, sobre la lane de la primera polity en `polities[]`. **[modelo: sonnet]**.

**Done:** vista completa con 50 lanes + religiones banda + figuras + eventos. Filtros cambian la vista en < 100ms.

**Estimado:** 3-4 días.

---

### F9. Side panel detail view

**Objetivo:** click en cualquier entidad abre side panel con markdown body rendered + sources.

**Tareas:**
1. `DetailPanel.tsx` con estado: `selectedEntity | null`. **[modelo: sonnet]**.
2. Click handler en histomap → set selectedEntity. **[modelo: sonnet]**.
3. Renderiza `body_html`, lista `sources` como links, lista cross-refs (eventos del polity, figuras, etc.). **[modelo: sonnet]**.
4. Panel slide-in animation con CSS. **[modelo: haiku]**.
5. Escape key + click outside = close. **[modelo: haiku]**.

**Done:** click → panel con info rica.

**Estimado:** 1 día.

---

### F10. Deploy a CF Pages con dominio definitivo

**Objetivo:** sitio en `cronos.sebastiangallo.com` (o el dominio que Sebas elija en §13).

**Tareas:**
1. Confirmar dominio con Sebas. **[Sebas]**.
2. Configurar custom domain en CF Pages. **[modelo: sonnet]** + Sebas en CF dashboard.
3. Verificar SSL OK, redirects OK, sitemap.xml + robots.txt. **[modelo: sonnet]**.
4. Crear `og-image.png` (Pillow + system fonts; ver memoria `feedback_nano_banana_fallback`). **[modelo: sonnet]**.
5. Lighthouse audit: target ≥90 perf, ≥95 a11y. **[modelo: opus]** para fixes si falla.

**Done:** sitio live en dominio definitivo, lighthouse pasa thresholds.

**Estimado:** 2-4 horas.

---

### F11. Polish + iteración de contenido

**Objetivo:** v1 ready to share.

**Tareas:**
1. README con screenshot + descripción + cómo contribuir. **[modelo: sonnet]**.
2. `docs/adding-an-entity.md` con paso a paso para que Sebas (o un futuro contributor) agregue un polity/figure/event. **[modelo: sonnet]**.
3. Smoke test full: agregar 1 event nuevo en markdown, `npm run build`, ver que aparezca. **[modelo: haiku]**.
4. Iteración de contenido: Sebas revisa entidades, mejora descripciones, corrige errores. **Ongoing**, no termina nunca realmente. **[Sebas + Opus en bucle conversacional cuando tenga dudas históricas]**.

**Done:** v1 publicado, Sebas puede mantenerlo solo.

**Estimado:** ongoing.

---

## 6. Blind spots y cómo cada uno se mitiga

| Blind spot | Mitigación específica en este plan |
|---|---|
| **Eurocentric data bias** | Cliopatria (globally curated) como source primaria, no Wikipedia categories. Curación deliberada con cuotas mínimas por macro-región (§5/F3). Lint script `lint-balance.mjs` falla el build si la distribución se rompe. |
| **Periodización confusa** ("Medieval" no aplica global) | Años absolutos son primary. Named eras solo como filtros opcionales, no como lane organizers. Lanes agrupadas por **geografía** (estable) no por era. |
| **Causality illusion** | Cero auto-lines entre lanes. Eventos de contacto/comercio (Silk Road, Columbian Exchange) son anotaciones explícitas via `event` entities, no líneas inferidas. |
| **Religion-as-category breaks** | Religiones son banda separada arriba, no atributo de polity. Una polity puede tener múltiples religion_dominant a lo largo del tiempo (array). |
| **Resolution problem** (evento vs era) | Zoom-pan: events solo visibles cuando zoom > umbral (ej. < 200 años visibles); eras siempre visibles. |
| **Living history cutoff** | Cutoff = today (`new Date().getFullYear()`). Default range termina en `today`. |
| **Citations missing** | `sources:` frontmatter obligatorio. Si vacío, build falla. Side panel renderiza sources como links/refs. |
| **Multi-script / non-Latin names** | `name` (es) + `name_en` (en) como obligatorios. `name_native` opcional (字 / ⲏⲅⲩⲡⲧⲟⲥ / etc.). UI usa `name` por default; toggle EN. |
| **Temporal ambiguity** ("¿cuándo cayó Roma?") | `start_year` y `end_year` son la "official line"; uncertainty se documenta en el body markdown. Posible futuro: `start_year_range: [-30, -25]` (out of v1). |

---

## 7. Stack técnico detallado

### Dependencias principales

```json
{
  "dependencies": {
    "astro": "^4.x",
    "@astrojs/react": "^3.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "d3-scale": "^4.x",
    "d3-selection": "^3.x",
    "d3-axis": "^3.x",
    "d3-zoom": "^3.x",
    "d3-array": "^3.x"
  },
  "devDependencies": {
    "@types/d3-scale": "^4.x",
    "@types/d3-selection": "^3.x",
    "@types/d3-axis": "^3.x",
    "@types/d3-zoom": "^3.x",
    "@types/react": "^18.x",
    "ajv": "^8.x",
    "gray-matter": "^4.x",
    "marked": "^12.x",
    "typescript": "^5.x"
  }
}
```

### Node / runtime

- Node 20 LTS (file `.nvmrc`: `20`).
- TypeScript strict.
- ESM only.

### Build / dev commands (package.json scripts)

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "npm run validate && npm run build-data && astro build",
    "build-data": "node scripts/build-data.mjs",
    "validate": "node scripts/validate-frontmatter.mjs",
    "lint-balance": "node scripts/lint-balance.mjs",
    "ingest:cliopatria": "node scripts/ingest-cliopatria.mjs",
    "ingest:wikidata": "node scripts/ingest-wikidata.mjs",
    "ingest:seshat": "node scripts/ingest-seshat.mjs",
    "preview": "astro preview"
  }
}
```

### Deploy

- CF Pages: build command `npm run build`, output dir `dist/`.
- Build env: `NODE_VERSION = 20`.
- Domain: TBD (ver §13).

---

## 8. Esquemas SPARQL preparados

Estos queries van en `scripts/sparql/`. Listos para que F4 los use:

### `religions.sparql`

```sparql
SELECT ?religion ?religionLabel ?inception ?founderLabel ?wikipedia WHERE {
  ?religion wdt:P31/wdt:P279* wd:Q9174 .  # instance of religion or subclass
  OPTIONAL { ?religion wdt:P571 ?inception . }
  OPTIONAL { ?religion wdt:P112 ?founder . }
  OPTIONAL { ?wikipedia schema:about ?religion ; schema:isPartOf <https://en.wikipedia.org/> . }
  FILTER NOT EXISTS { ?religion wdt:P279+ wd:Q1530 } # exclude sub-sects narrowly defined
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
}
LIMIT 50
```

### `rulers-by-polity.sparql` (paramétrico)

```sparql
# Replace POLITY_QID con el Q-number del polity (ej: wd:Q2277 para Imperio Romano)
SELECT ?ruler ?rulerLabel ?start ?end WHERE {
  ?ruler wdt:P39 ?position .
  ?position wdt:P1001 POLITY_QID .  # applies to jurisdiction
  OPTIONAL { ?ruler wdt:P580 ?start . }
  OPTIONAL { ?ruler wdt:P582 ?end . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
}
ORDER BY ?start
LIMIT 30
```

### `key-figures.sparql` (paramétrico por field)

```sparql
# Replace FIELD_QID con: wd:Q4964182 (philosopher), wd:Q2462658 (general), wd:Q170790 (mathematician), etc.
SELECT ?person ?personLabel ?born ?died ?countryLabel WHERE {
  ?person wdt:P106 FIELD_QID .  # occupation
  ?person wdt:P569 ?born .
  OPTIONAL { ?person wdt:P570 ?died . }
  OPTIONAL { ?person wdt:P27 ?country . }
  FILTER (?born < "1900-01-01"^^xsd:dateTime)  # historical figures only v1
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
}
ORDER BY DESC(?born)
LIMIT 100
```

**Gotchas para queries Wikidata:**

- Date BCE en Wikidata se representa con años negativos en datetime — algunos clients fallan; usar string parsing.
- Rate limit: 5 queries paralelas máximo, agregar `User-Agent` header.
- Cachear todo en `_sources/wikidata-cache/` con key = hash del query.

---

## 9. UI/UX spec

### Layout (desktop, 1280+ px)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Cronos                                  [ES|EN]  [?] [GitHub]          │
├─────────────────┬──────────────────────────────────────────────────────┤
│                 │  ─── Religiones (banda) ────────────────────────     │
│  FILTROS        │  ════ Cristianismo ═══════════════════════════       │
│                 │  ══ Budismo ════════════════════════════             │
│  ▼ Regiones     │  ─────────────────────────────────────────────       │
│   ☑ Mediterráneo│                                                      │
│   ☑ Europa      │  ▼ Mediterráneo                                      │
│   ☑ M. Oriente  │    ███ Egipto faraónico ······●··●····              │
│   ☑ ...         │    ███ Roma ·······●····●····●··●····               │
│                 │  ▼ Europa                                            │
│  ▼ Religiones   │    ███ Bizancio ···············●····●··             │
│   ☑ ...         │    ███ Franco ··········●····●···                   │
│                 │  ▶ M. Oriente (colapsado)                            │
│  ▼ Tipo         │  ▼ Sub-Sahariana                                     │
│   ☑ Polities    │    ███ Mali ········●··●····                        │
│   ☑ Religiones  │    ███ Songhai ··········●··●·                      │
│   ☑ Figuras     │  ...                                                 │
│   ☑ Eventos     │                                                      │
│                 │  ─── Eje temporal ─────────────────────────         │
│  ▼ Era          │  -3000 BCE  -1000  0  1000 CE  2000                │
│   [══════]      │                                                      │
└─────────────────┴──────────────────────────────────────────────────────┘
```

### Layout (mobile, < 768 px)

- Filter sidebar colapsa a un drawer (hamburger top-right).
- Histomap mantiene scroll horizontal nativo.
- Side panel ocupa pantalla completa al click.

### Interacciones

- **Hover sobre polity bar**: tooltip con nombre + años.
- **Click sobre polity bar**: side panel se abre con detail.
- **Click sobre event dot**: side panel del event.
- **Click sobre region header**: colapsa/expande grupo.
- **Drag horizontal**: pan en time axis.
- **Wheel / pinch**: zoom in/out en time axis (no en Y).
- **Shift+wheel**: scroll vertical entre lanes (cuando no caben todas).
- **Escape**: cierra side panel.
- **Search bar** (Cmd+K): salta a entidad por nombre.

### Colores

- Cada macro-región tiene una paleta base (los polities de esa región son variaciones).
- Religion bands: colores propios (Cristianismo marrón, Islam verde, Budismo dorado, etc.).
- Event dots: por categoría (militar rojo, religioso púrpura, científico azul, etc.).
- Modo claro y oscuro (CSS vars, toggle en header).

### Accesibilidad

- Keyboard navigation full.
- ARIA labels en lanes, dots, filtros.
- Contrast ratio ≥ 4.5:1 en text.
- Screen reader: las entidades son listas semánticas (no solo SVG sin labels).

---

## 10. Deployment runbook (para `docs/deploy.md`)

### Primer deploy

1. `gh repo create cronos --private --source=. --remote=origin --push`.
2. CF Pages dashboard → Create project → Connect GitHub → seleccionar `cronos`.
3. Build settings:
   - Framework preset: Astro (auto-detect).
   - Build command: `npm run build`.
   - Output directory: `dist`.
   - Node version env var: `NODE_VERSION = 20`.
4. Deploy. Verificar en `cronos-XXX.pages.dev`.
5. Custom domain: agregar el dominio confirmado en F1/§12 (recomendado: `cronos.sebastiangallo.com` — subdominio reusa la zona DNS existente y CF setea CNAME automático). Si Sebas eligió otro dominio en §12, ajustar acá.

### Deploys subsecuentes

- `git push origin main` → auto-deploy en ~1-2 min.
- Preview deployments en branches.

### Rollback

- CF Pages dashboard → Deployments → click sobre deploy anterior → "Rollback".

---

## 11. Verificación / criterios de done end-to-end

Al terminar F11, correr esta checklist:

- [ ] `git clone` en máquina limpia + `nvm use && npm install && npm run build` produce `dist/` sin error.
- [ ] `dist/` tiene `index.html` + `_astro/*.js` + `assets/cronos.json`.
- [ ] Sitio en dominio definitivo carga en < 2s desktop, < 3s mobile (Lighthouse).
- [ ] 50 polities visibles, agrupadas en 10 macro-regiones, balance check pasa.
- [ ] 10 tradiciones religiosas en banda superior.
- [ ] ~200 figuras y ~300 eventos visibles al zoom adecuado.
- [ ] Filtros cambian vista en < 100ms.
- [ ] Click en cualquier entidad abre side panel con markdown body + sources.
- [ ] Side panel cross-refs (events del polity, etc.) funcionan.
- [ ] Mobile: filter drawer, side panel fullscreen, scroll horizontal del histomap.
- [ ] Sebas puede agregar 1 event nuevo (crear `.md`, build, deploy) en < 5 min.
- [ ] No-Eurocentric balance ≥ cuota por macro-región.

---

## 12. Decisiones tomadas (resueltas 2026-05-19, inicio de sesión de ejecución)

Las 4 open questions originales se cerraron al inicio de la sesión de ejecución vía `AskUserQuestion`:

1. **Nombre final:** **Cronos** (working confirmado).
2. **Dominio:** **`cronos.sebastiangallo.com`** (subdominio sobre la zona DNS existente; CNAME automático en CF Pages).
3. **Repo:** **Privado** en GitHub v1; revisitar post-F11 si se decide abrir contributors.
4. **Color palette:** **Autogenerada algorítmica** (HSL distribuida por macro-región con variaciones de luminosidad/saturación por polity). Curación cultural se difiere a v2.

---

## 13. Guía para la sesión que ejecute este plan

**Cómo arrancar la sesión:**

1. Abrir Claude Code en `/Users/sebasgallo/Cronos project/`.
2. Copiar este plan a `PLAN.md` del repo (Sebas hace el `cp` o le pide a Claude que lo lea desde `/Users/sebasgallo/.claude/plans/hello-hello-i-am-swirling-waffle.md`).
3. Sesión lee `PLAN.md`, levanta las 4 open questions de §12.
4. Sebas responde, sesión actualiza PLAN.md con las decisiones tomadas.
5. Sesión ejecuta F1 → F11 en orden.

**Reglas duras para la sesión ejecutora:**

- **Modelo por fase**: respetar las anotaciones `[modelo: X]`. Si solo hay un modelo disponible en la sesión, anunciar al inicio de cada fase cuál sería el ideal y por qué.
- **No skip de fases.** F2 (schema validation) antes de F3 (ingest) es load-bearing: si valida después, hay rework garantizado.
- **Curación editorial = bucle conversacional con Sebas.** F3, F4, F5 tienen pasos donde el modelo propone y Sebas confirma o vetoa. Ejecutar **con** Sebas, no para él.
- **No-Eurocentric check obligatorio en cada ingest.** `npm run lint-balance` debe pasar antes de pasar a la siguiente fase.
- **Confirmación antes de cualquier acción destructiva**: `gh repo create`, deploy a producción, `rm -rf` de cualquier directorio. Sebas confirma.
- **Cada commit con mensaje claro** describiendo qué fase del plan ejecuta. Ejemplo: `F3: ingest 50 polities from Cliopatria with balance check`.
- **Plan es vivo**: si algo no funciona como está descrito, la sesión actualiza `PLAN.md` con la corrección antes de seguir, no improvisa silenciosamente.

**Cuándo escalar a Sebas (no decidir solo):**

- Cualquier decisión que afecte el shape de los datos.
- Cualquier curación editorial (qué polities incluir, qué figures, qué events).
- Cualquier elección de color, dominio, o naming user-facing.
- Cualquier cambio al stack técnico (cambiar de D3 a otra lib, etc.).
- Cualquier costo (CF Pages free tier debería cubrir; si requiere paid, escalar).

**Qué NO necesita confirmar Sebas:**

- Boilerplate code (npm scripts, .gitignore, README sections estándar).
- Refactors internos que no cambian behavior.
- Tests.
- Documentación derivada del plan.

---

## 14. Estimaciones agregadas

| Fase | Modelo dominante | Tiempo calendario | Tiempo activo Sebas |
|---|---|---|---|
| F1 Bootstrap | sonnet | 0.5 día | 30 min |
| F2 Schema + scaffold | opus + sonnet | 0.5 día | 15 min |
| F3 Cliopatria → 50 polities | opus + haiku | 1-2 días | 2-4 hrs (curación) |
| F4 Wikidata religions + figures | opus + sonnet | 2-3 días | 2-3 hrs (curación) |
| F5 Seshat + events | opus + Sebas | 3-5 días | 6-10 hrs (selección eventos) |
| F6 Build script final | sonnet | 0.5 día | — |
| F7 D3 v0 single track | opus + sonnet | 1-2 días | review 30 min |
| F8 Multi-lane + filtros | opus + sonnet | 3-4 días | review 1 hr |
| F9 Side panel | sonnet | 1 día | review 15 min |
| F10 Deploy | sonnet + Sebas | 0.5 día | 1 hr (dashboard CF) |
| F11 Polish + content iter | sonnet + Sebas | ongoing | ongoing |
| **TOTAL** | | **~3-4 semanas calendario** | **~15-25 hrs Sebas activo** |

---

## 15. Riesgos y plan de contingencia

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cliopatria DOI cambia o se cae | Baja | Alta | Cachear GeoJSON en `_sources/` (committed); plan B: scrape directo de Wikipedia "List of historical states". |
| Wikidata SPARQL rate-limits | Media | Media | Cache por query hash; throttle 1 query/s; runs nocturnos si hace falta. |
| D3 zoom performance lag con 1000+ events | Media | Alta | Virtualization: solo renderizar entries en viewport visible. Si falla → switch a Canvas en lugar de SVG (más rework). |
| Curación editorial toma mucho más que estimado | Alta | Media | F3-F5 son las fases más bottlenecked en Sebas; estimar conservador (5 días F5). Es OK si toma 2-3 semanas; la app funciona con datos parciales. |
| CF Pages free tier no alcanza | Muy baja | Baja | Free tier: 500 builds/mes, 1 build concurrente, bandwidth ilimitado. Sitio estático = nunca debería ser issue. |
| Sebas pierde interés / proyecto queda sin terminar | Media | Alta | F1-F3 ya entregan valor: con 50 polities visibles ya hay un proto usable. No esperar v1 perfecto antes de gozarlo. |

---

## 16. Estado actual del plan

- **Sesión actual:** brainstorming + plan v1 redactado.
- **Próximo paso:** Sebas revisa, aprueba o pide cambios.
- **Si aprueba:** copiar este archivo a `/Users/sebasgallo/Cronos project/PLAN.md`, abrir sesión nueva ahí, ejecutar F1.

---

*Fin del plan. Versión 1, 2026-05-19.*
