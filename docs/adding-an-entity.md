# Cómo agregar una entidad nueva a Cronos

Guía paso a paso para vos (o cualquier futuro contributor) que quiera agregar **una polity, religion, figure o event** al histomap. Todo es markdown editable a mano; no hay panel admin ni base de datos.

---

## Resumen del flujo

```
1. Editás (o creás) un .md en content/{type}/.
2. Corres `npm run validate` para chequear schema.
3. Corres `npm run build` para regenerar cronos.json + dist/.
4. `git commit + git push` → CF Pages auto-deploys.
5. Sitio en cronos.sebastiangallo.com refleja el cambio en ~1 min.
```

Tiempo estimado: **3-5 minutos** una vez que agarrás el ritmo.

---

## Paso 0 — Decidir qué tipo de entidad

| Si agregás... | Carpeta | Ejemplo de ID |
|---|---|---|
| Imperio / reino / civilización | `content/polities/` | `imperio-bizantino` |
| Tradición religiosa | `content/religions/` | `cristianismo` |
| Persona histórica | `content/figures/` | `mansa-musa` |
| Evento puntual / rango corto | `content/events/` | `caida-constantinopla-1453` |

**Naming convention del ID:**
- Lowercase, kebab-case (guiones), ASCII sin tildes.
- El filename = id + `.md`. Si pongo `id: cleopatra-vii` el archivo debe ser `cleopatra-vii.md`.
- Si dudás, mirá `docs/data-model.md` o un .md existente del mismo tipo.

---

## Paso 1 — Crear el archivo

### Opción A: copiar de un existente

```bash
# Si vas a agregar una polity nueva, copiá una existente como template:
cp content/polities/roma.md content/polities/imperio-bizantino.md
# Después editás el frontmatter + body.
```

### Opción B: arrancar de cero

Mirá `docs/data-model.md` para el schema completo. Lo esencial por tipo:

**polity:**
```yaml
---
type: polity
id: imperio-bizantino
name: Imperio Bizantino                    # ES obligatorio
name_en: Byzantine Empire                  # EN opcional
start_year: 330                            # BCE negativo, CE positivo
end_year: 1453
region: mediterraneo                       # uno de los 10 macro-regiones
capital: Constantinopla                    # string libre
religion_dominant:                         # ids de religions/ (opcional)
  - cristianismo
predecessors: [roma]                       # ids de polities/ (opcional)
successors: []                             # idem
color: "#6A1B9A"                           # hex obligatorio
tags: [imperio, continuidad-romana]
wikidata: Q42968                           # opcional
sources:                                   # ≥1 obligatorio
  - https://es.wikipedia.org/wiki/Imperio_bizantino
created: '2026-05-20'
updated: '2026-05-20'
---

# Imperio Bizantino

Markdown libre acá. Encabezados ##, listas, **negrita**, *cursiva*,
[links](https://example.com), código `inline`. Aparece en el side panel
cuando alguien hace click en la lane.
```

**figure:**
```yaml
---
type: figure
id: mansa-musa
name: Mansa Musa
name_en: Mansa Musa
year_born: 1280
year_died: 1337
polity: [imperio-mali]                     # array de polity ids
region: africa-subsahariana
role: politico                             # militar | religioso | filosofo | cientifico | politico | artista
tags: [mansa, oro, hayy]
sources: [https://es.wikipedia.org/wiki/Mansa_Musa]
created: '2026-05-20'
updated: '2026-05-20'
---

# Mansa Musa

Body markdown...
```

**event:**
```yaml
---
type: event
id: caida-constantinopla-1453
name: Caída de Constantinopla
year: 1453
year_end: null                             # null = puntual; integer si rango
polities: [imperio-bizantino, imperio-otomano]
region: medio-oriente
category: militar                          # militar | politico | religioso | cientifico | cultural | economico | desastre
tags: [mehmed-ii, fin-bizancio]
sources: [https://es.wikipedia.org/wiki/Caída_de_Constantinopla]
created: '2026-05-20'
updated: '2026-05-20'
---
```

**religion:**
```yaml
---
type: religion
id: cristianismo
name: Cristianismo
name_en: Christianity
start_year: 30
end_year: null                             # null = vigente
region_birth: medio-oriente
branch_of: judaismo                        # null si tradición raíz
branches: [catolicismo, ortodoxia, protestantismo]
color: "#8B4513"
tags: [abrahamica, monoteismo]
sources: [https://es.wikipedia.org/wiki/Cristianismo]
created: '2026-05-20'
updated: '2026-05-20'
---
```

---

## Paso 2 — Validar

```bash
npm run validate
```

Si pasa, ves:

```
[validate-frontmatter] scanned 285 files | counts: {"polity":50,"religion":10,"figure":125,"event":100}
[validate-frontmatter] OK
```

Si falla, vas a ver el archivo y el campo problemático:

```
ERROR: events/mi-nuevo-evento.md (event): /year_end must be ≤ year_end... etc.
```

Los errores más comunes:
- **`required` field falta**: agregá el campo. Ver el ejemplo del tipo.
- **`region` desconocida**: tiene que ser uno de los 10 (ver `docs/data-model.md`).
- **`color` no es hex**: formato `#XXXXXX` (6 dígitos hexa).
- **`sources` vacío**: poner ≥1 URL o referencia.
- **`id` ≠ filename**: el `id:` del frontmatter debe coincidir con el filename sin `.md`.
- **`start_year > end_year`** (polity) o equivalentes (figure, event).

Las **warnings** (no errors) son por cross-refs a entidades que no existen todavía — no rompen el build, sólo te avisan. Si querés strict mode: `npm run validate -- --strict`.

---

## Paso 3 — Build completo

```bash
npm run build
```

Este script encadena:

1. `npm run validate` (otra vez, defensivo).
2. `npm run build-data` (regenera `src/data/cronos.json`).
3. `astro build` (compila dist/).

Output esperado:

```
[build-data] wrote src/data/cronos.json: 50p + 10r + 125f + 100e (range -10000 → 2026, 226 KB, pretty)
[build] ✓ Completed in 19ms.
[build] Complete!
```

---

## Paso 4 — Probar local (opcional)

```bash
npm run preview   # sirve dist/ en localhost:4321
```

Abrí http://localhost:4321 y verificá que tu entidad aparezca.

---

## Paso 5 — Commit + push

```bash
git add content/{type}/{id}.md
git commit -m "content: agregar {type} {id}"
git push origin main
```

CF Pages detecta el push y deploya en ~1 min. Refrescá `cronos.sebastiangallo.com` para ver el cambio en producción.

---

## Casos especiales

### Agregar 50 polities a la vez (batch)

Edita `scripts/lib/polities-seed.mjs` agregando entries al `POLITIES_SEED` array, luego:

```bash
npm run ingest:cliopatria       # respeta archivos existentes
npm run validate
npm run lint-balance -- --strict   # confirma que cuotas no-Eurocentric siguen OK
```

### Agregar religiones / figures / events en batch

Edita `scripts/lib/religions-seed.mjs`, `figures-seed.mjs`, `events-seed.mjs` respectivamente, luego:

```bash
npm run ingest:wikidata
npm run validate
```

### Editar el body de una entidad existente

El body markdown está debajo de la línea `---` que cierra el frontmatter. Editar directo en el `.md`. `npm run build` regenera `body_html` con `marked`.

### Cambiar el color de una polity

Editar el campo `color` en el frontmatter de `content/polities/{id}.md`. Hex format obligatorio (#RRGGBB). El histomap toma el nuevo color en el próximo build.

### Renombrar una entidad

1. `git mv content/{type}/{old-id}.md content/{type}/{new-id}.md`.
2. Editar el `id:` field en el frontmatter para que coincida con el nuevo filename.
3. **Buscar referencias en otros archivos** (predecessors, successors, religion_dominant, polity, polities) y actualizar:
   ```bash
   grep -r "{old-id}" content/
   ```
4. Validar + build.

### Borrar una entidad

```bash
git rm content/{type}/{id}.md
grep -r "{id}" content/   # buscar refs colgantes
# eliminar las refs en otros frontmatters
npm run validate
```

---

## Anatomía rápida del repo

```
content/                  ← markdown source of truth
  polities/               ← imperios, reinos, ciudades-estado
  religions/              ← tradiciones religiosas
  figures/                ← personas históricas
  events/                 ← eventos puntuales
scripts/
  validate-frontmatter.mjs  ← Ajv schema check
  build-data.mjs            ← genera src/data/cronos.json
  lint-balance.mjs          ← cuota no-Eurocentric ≥5/región
  ingest-cliopatria.mjs     ← regen polities desde seed
  ingest-wikidata.mjs       ← regen religions/figures/events desde seeds
  ingest-seshat.mjs         ← stub Seshat enrichment
  lib/                      ← seeds + helpers compartidos
src/
  data/cronos.json          ← build artifact (gitignored)
  pages/index.astro         ← entry point
  components/               ← HistomapApp, FilterSidebar, HistomapCanvas, DetailPanel
  lib/                      ← timeScale, laneLayout, filters, dataTypes
docs/
  data-model.md             ← schema canónico
  polities-curation.md      ← reasoning de las 50 polities v1
  religions-curation.md     ← reasoning de las 10 religions v1
  figures-curation.md       ← reasoning de las ~125 figures v1
  events-curation.md        ← reasoning de los ~100 events v1
  adding-an-entity.md       ← este archivo
  ACTION_ITEMS_FOR_SEBAS.md ← cosas pendientes
```

---

## Si algo se rompe

1. `npm run validate -- --strict` para ver TODOS los issues (incl. warnings).
2. `git status` y `git diff` para ver qué cambió.
3. Revisar el último commit que sí buildeaba: `git log --oneline`.
4. Si nada, ping a Claude — pegale el output del error.

---

*Última edición: 2026-05-20 (F11, sesión autónoma).*
