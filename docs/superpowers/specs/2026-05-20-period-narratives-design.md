# Period Narratives — Diseño

**Fecha:** 2026-05-20
**Estado:** aprobado por Sebas, listo para implementation
**Trigger:** comentario de Sebas pidiendo feature de explicación temporal por interfaz, generado localmente sin tokens online.

---

## 1. Goal

El usuario selecciona un rango temporal sobre el eje del histomap (brush horizontal), y obtiene una **narrativa histórica estructurada en español** explicando qué ocurrió en ese período: civilizaciones presentes, transiciones pivotales, estado final, y contrapunto con otras regiones del mundo. La narrativa viene en **texto + audio** y se sirve **estática** desde el sitio (no hay LLM en runtime).

Non-goals v1:
- Filtros del sidebar NO afectan la narrativa (siempre global).
- No habilitamos chat/Cmd+K en v1 — solo brush.
- No hay per-region narratives v1.
- No hay download del audio v1.

---

## 2. Arquitectura

```
┌──── Build-time (en Mac de Sebas) ──────────────────┐
│                                                     │
│  scripts/narrate.mjs                                │
│    1. Para cada (start, end) en GRID:               │
│         - Construye prompt con eventos/polities     │
│           del período (slice de cronos.json)         │
│         - Llama Ollama → Qwen 2.5 14B                │
│         - Parsea respuesta en 4 secciones            │
│         - Escribe content/narratives/{slug}.md       │
│    2. Para cada narrativa:                          │
│         - Concatena el body en plain text           │
│         - say -v Sandy -o public/narratives/audio/  │
│           {slug}.aiff → ffmpeg → {slug}.mp3          │
│                                                     │
│  scripts/build-data.mjs (ya existe):                │
│    - Detecta content/narratives/*.md                │
│    - Agrega narratives[] al cronos.json              │
│                                                     │
│  npm run narrate:bake   ← regen todas las narrativas │
│  npm run narrate:custom -- -1000 0  ← una sola       │
│                                                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼  git commit + push + deploy
┌──── Runtime (visitor browser) ─────────────────────┐
│                                                     │
│  cronos.json incluye narratives[]:                  │
│    { slug, start_year, end_year, label,             │
│      body_html, audio_url, generated_at }            │
│                                                     │
│  HistomapCanvas:                                    │
│    - d3-brush sobre el eje temporal                 │
│    - Range selection visual (translucent shaded)    │
│    - On brush end: snap a narrativa más cercana     │
│    - Botón flotante "Explicar este período"         │
│      → onSelect({type:'narrative', id: slug})        │
│                                                     │
│  DetailPanel:                                       │
│    - Renderiza body_html                            │
│    - <audio controls src={audio_url}> inline        │
│    - Stats del período: # polities activas,         │
│      # eventos, regiones cubiertas                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. Grid pre-computada

30 narrativas, alineadas con cómo los humanos piensan periodos:

**BCE (milenios):** 9 narrativas
- [-5000, -4000] "Quinto milenio BCE"
- [-4000, -3000] "Cuarto milenio BCE"
- [-3000, -2000] "Tercer milenio BCE"
- [-2000, -1500] "Bronce medio"
- [-1500, -1000] "Bronce tardío"
- [-1000, -500] "Edad de Hierro temprana"
- [-500, -300] "Era clásica"
- [-300, -100] "Helenismo"
- [-100, 100] "Bisagra de eras"

**CE (siglos clusterizados):** 19 narrativas
- [100, 300] "Imperio romano y los grandes imperios"
- [300, 500] "Cristianización + caída de Occidente"
- [500, 700] "Inicio del islam + alta Edad Media temprana"
- [700, 900] "Califatos + Carolingio + Tang"
- [900, 1100] "Reconfiguración euroasiática"
- [1100, 1300] "Mongoles + Cruzadas + universidades"
- [1300, 1450] "Pestes + crisis"
- [1450, 1550] "Caída de Constantinopla + descubrimientos"
- [1550, 1650] "Imperios coloniales + Reforma"
- [1650, 1750] "Absolutismos + Ilustración"
- [1750, 1850] "Revoluciones"
- [1850, 1900] "Modernidad industrial"

12 + 9 = ~21 narrativas iniciales. Si Sebas quiere más resolución después, agregamos.

Actualizo: aim 21-25 narrativas, build time estimado ~5 min (12s × 25).

Cada narrativa tiene un `slug` deterministic: `period-{start}-{end}` con BCE indicado por negativo (`period--3000--2000`, `period-1450-1550`). Lo normalizamos para filename: `period-3000bce-2000bce.md`, `period-1450ce-1550ce.md`.

---

## 4. Prompt template

```
Estás escribiendo una narrativa histórica para Cronos, un histomap
interactivo de la historia humana.

PERÍODO: {start_year_pretty} → {end_year_pretty} ({duration} años)

DATA DISPONIBLE (de los 50 polities + 10 religions + 125 figures
+ 99 events curados en Cronos):

Polities activas al INICIO del período:
{list_polities_active_at start}

Polities que TERMINAN durante el período:
{list_polities_ending_in_range}

Polities que SE FUNDAN durante el período:
{list_polities_starting_in_range}

Religiones presentes:
{list_religions_active}

Figuras notables (year_born en el rango):
{list_figures_in_range}

Eventos pivotales:
{list_events_in_range}

ESTRUCTURA OBLIGATORIA — escribí 4 secciones tituladas EXACTAMENTE así:

## Al inicio del período
(~150 palabras: ¿qué civilizaciones existían? ¿qué religiones
predominaban? Si la data es sparse — milenios antiguos —
contextualizá con conocimiento general.)

## Eventos y transiciones pivotales
(~250 palabras: ¿qué cambió durante el período? Batallas,
fundaciones, caídas, cismas. Mencioná las figuras notables si
encajan en el flujo.)

## Al cerrar el período
(~150 palabras: ¿cuál era el panorama al final? Quién quedó en pie,
quién había desaparecido.)

## Mientras tanto en otras regiones
(~200 palabras: contrapunto explícito. Si la sección anterior se
enfocó en Mediterráneo/Europa, hablá de Asia / Américas / África.
Si se enfocó en Asia, hablá de Mediterráneo / etc. Forzá una
visión global, no-Eurocentric.)

REGLAS:
- Español rioplatense neutro (vos no usar, evitar regionalismos).
- Sin emojis. Sin tablas. Sin imágenes. Sin H1.
- Sin metadiscurso ("este texto cubre..."). Empezá directo.
- Fechas siempre BCE / CE explícito.
- Si la data Cronos no cubre algo importante del período, mencionalo
  con tu propio conocimiento — sos un narrador, no un compilador.
- Largo total: 600-900 palabras.
```

---

## 5. Markdown output schema

Nueva entidad `narrative` con su propio schema Ajv:

```yaml
---
type: narrative
id: period-1000bce-500bce          # slug deterministic
label: Edad de Hierro temprana     # human-readable
start_year: -1000
end_year: -500
audio_url: /narratives/audio/period-1000bce-500bce.mp3
audio_duration_sec: 380             # opcional, para el player
audio_voice: Sandy                   # voz usada (es_MX)
audio_word_count: 832                # word count del body
generated_at: '2026-05-20'
generated_by: qwen2.5:14b
sources_used:                       # IDs de polities/events/figures referenciados
  polity_ids: [babilonia, sumeria, escitas, ...]
  event_ids: [...]
  figure_ids: [...]
---

## Al inicio del período

... body markdown ...

## Eventos y transiciones pivotales

...

## Al cerrar el período

...

## Mientras tanto en otras regiones

...
```

`type: narrative` se agrega a los schemas Ajv (`scripts/validate-frontmatter.mjs`) con required fields validados.

---

## 6. Audio pipeline

```bash
# Por cada narrativa, después de generar el .md:
say -v Sandy -o /tmp/{slug}.aiff "<plain text body>"
# AIFF es lossless pero pesado (~30 MB para 6 min). Convertir a MP3:
ffmpeg -i /tmp/{slug}.aiff -codec:a libmp3lame -qscale:a 5 \
  public/narratives/audio/{slug}.mp3
# Quality 5 = ~128 kbps VBR, ~5 MB para 6 min.
```

Si `ffmpeg` no está instalado, fallback: usar `afconvert` (built-in macOS):
```bash
afconvert -f mp4f -d aac /tmp/{slug}.aiff public/narratives/audio/{slug}.m4a
```

m4a también es web-compatible (HTML5 audio acepta).

`public/narratives/audio/` se sirve directo por CF. Sin restricciones de tamaño hasta 25 MB/file (CF Pages limit).

---

## 7. Brush UX en HistomapCanvas

Sobre el eje superior, agregamos `d3.brushX()`:

- Click + drag horizontal → selección con rectángulo translúcido (`fill: var(--accent)`, `opacity: 0.18`).
- Soltar el mouse → calcular `[start_year, end_year]` en data coords.
- Snap a la narrativa más cercana usando `findClosestNarrative(start, end, narratives[])`:
  - Score = `|nr.start - br.start| + |nr.end - br.end|`
  - Tomar el de score mínimo.
  - Si el brush es demasiado chico (<50 años visibles), tratarlo como "click" → no acción.
- Mostrar botón flotante "Explicar período {label}" ↑ del brush, con click handler que dispara `onSelect({type:'narrative', id})`.
- Tecla Esc → limpiar el brush.

CSS: el brush rectangle es minimal (border accent + fill translúcido). Botón flotante usa el .accent style del sidebar.

---

## 8. DetailPanel extension

`DetailPanel.tsx` ya acepta `selected: SelectedEntity`. Agregamos:

```ts
type SelectedEntity = {
  type: 'polity' | 'religion' | 'figure' | 'event' | 'narrative';
  id: string;
};
```

Cuando `type === 'narrative'`:

```tsx
<header>
  <span className="panel-type">narrativa</span>
  <h2>{narrative.label}</h2>
  <p className="name-en">{formatYear(start)} → {formatYear(end)}</p>
</header>

<audio
  src={narrative.audio_url}
  controls
  preload="metadata"
  className="narrative-audio"
/>

<dl className="meta-list">
  <div className="meta-row">
    <dt>Duración audio</dt>
    <dd>{Math.round(narrative.audio_duration_sec / 60)} min</dd>
  </div>
  <div className="meta-row">
    <dt>Voz</dt>
    <dd>{narrative.audio_voice} (es_MX)</dd>
  </div>
  <div className="meta-row">
    <dt>Polities en el período</dt>
    <dd>{narrative.sources_used.polity_ids.length}</dd>
  </div>
</dl>

<div
  className="panel-body narrative-body"
  dangerouslySetInnerHTML={{ __html: narrative.body_html }}
/>
```

Audio player es nativo HTML5. Sin auto-play. Manual click play.

---

## 9. Snap helper

`src/lib/narrativeIndex.ts`:

```ts
export interface NarrativeMeta {
  id: string;
  label: string;
  start_year: number;
  end_year: number;
  // ... resto se carga del cronos.json
}

export function findClosestNarrative(
  brushStart: number,
  brushEnd: number,
  narratives: NarrativeMeta[],
): NarrativeMeta | null {
  if (!narratives.length) return null;
  let best: NarrativeMeta | null = null;
  let bestScore = Infinity;
  for (const n of narratives) {
    const score = Math.abs(n.start_year - brushStart) + Math.abs(n.end_year - brushEnd);
    if (score < bestScore) {
      best = n;
      bestScore = score;
    }
  }
  return best;
}
```

Test cases:
- brush [-1234, 567] sobre grid → snap a [-1000, 500] (más cerca que cualquier otro par).
- brush [800, 1200] sobre grid → snap a [900, 1100] o [700, 900] según score.

---

## 10. Scripts npm

```json
{
  "narrate:bake": "node scripts/narrate.mjs --all",
  "narrate:custom": "node scripts/narrate.mjs --range",
  "narrate:tts-only": "node scripts/narrate.mjs --tts-only",
}
```

- `--all`: genera todas las narrativas del GRID. Skip las que ya existen (idempotente).
- `--range -1000 0`: genera solo esa.
- `--tts-only`: re-genera los audios de todos los .md existentes (útil si cambiamos de voz).

`narrate.mjs` flujo:

```js
import ollama from 'ollama';  // o fetch a http://localhost:11434
import { spawnSync } from 'node:child_process';

for (const period of grid) {
  const slug = makeSlug(period);
  const mdPath = `content/narratives/${slug}.md`;
  if (existsSync(mdPath) && !overwrite) continue;

  const prompt = buildPrompt(period, cronosData);
  const response = await ollama.generate({ model: 'qwen2.5:14b', prompt });
  const body = parseAndValidateResponse(response);  // verifica 4 secciones

  writeFileSync(mdPath, frontmatter + body);

  // TTS
  const plainText = stripMarkdown(body);
  const aiffPath = `/tmp/cronos-tts-${slug}.aiff`;
  const mp3Path = `public/narratives/audio/${slug}.mp3`;
  spawnSync('say', ['-v', 'Sandy', '-o', aiffPath, plainText]);
  spawnSync('ffmpeg', ['-y', '-i', aiffPath, '-codec:a', 'libmp3lame', '-qscale:a', '5', mp3Path]);
  unlinkSync(aiffPath);

  console.log(`✓ ${slug} (${body.length} chars, audio ${mp3Path})`);
}
```

---

## 11. Build integration

`scripts/build-data.mjs` ya escanea `content/`. Agrego escaneo de `content/narratives/`:

```js
const NARRATIVES_DIR = resolve(CONTENT_DIR, 'narratives');
// ... include narratives in scan ...
payload.narratives = entities.narrative;
```

cronos.json crece ~30-50 KB (30 narrativas × ~5 KB cada una de body_html + meta).

Build sigue rápido (no llama Ollama, solo lee .md).

---

## 12. Error handling

- **Ollama no responde**: `narrate:bake` aborta con error claro pidiendo `ollama serve` corriendo.
- **Qwen no genera 4 secciones**: el parser detecta. Reintenta 1 vez con `temperature 0.3`. Si falla otra vez, escribe la respuesta a `_sources/narrate-failures/{slug}.txt` y skip.
- **`say` falla**: log warning, salta TTS pero conserva .md (la narrativa texto sirve igual).
- **`ffmpeg` no instalado**: fallback a `afconvert` (m4a en lugar de mp3). Schema acepta cualquier audio_url.
- **Brush sin narrativa cercana** (improbable, snap siempre encuentra una): mostrar tooltip "No hay narrativa pre-computada para este rango".
- **cronos.json sin narratives[]**: brush queda visible pero el botón "Explicar" no aparece. Sin error.

---

## 13. Testing

Manual smoke tests:
1. `npm run narrate:custom -- -1000 0` → genera 1 narrativa + audio. Validar .md (frontmatter + 4 secciones) + .mp3 (reproducible).
2. `npm run validate` → confirma narrative schema OK.
3. `npm run build` → confirma cronos.json incluye narratives[].
4. `npm run preview` → en browser, brush sobre eje → botón aparece → click → panel con audio se abre → play.

Unit tests (al menos):
- `findClosestNarrative()` con varios casos.
- Parser de las 4 secciones (success + failure cases).

---

## 14. Bundle/perf impact

- cronos.json: +30-50 KB (~250 KB total). Aún OK.
- Audio files: ~30 × 5 MB = ~150 MB en `public/narratives/audio/`. **NO** se cargan eagerly — el HTML5 audio con `preload="metadata"` solo trae los headers, no el audio completo hasta play.
- CF Pages: total bundle ~155 MB. Free tier ilimitado bandwidth + storage hasta 25k files, así que OK.
- Build local: regen completa ~5 min (12s × 25 LLM calls). Build sin narrate (`npm run build`): <1s sin cambio. Sebas corre `npm run narrate:bake` solo cuando quiere refrescar.

---

## 15. Deployment

Sin cambios al deploy. `npm run deploy` (build + wrangler pages deploy) sigue funcionando. Las narrativas y audios van como parte del `dist/` static output.

---

## 16. Roadmap post-v1 (no implementar ahora)

- **Cmd+K query libre**: en lugar de brush, input chat-like que toma una pregunta arbitraria. Más infra (matching, embeddings con nomic-embed-text que ya está, fallback a narrativa precomputada más cercana).
- **Per-region narratives**: cuando el sidebar tiene 1 región activa, generar narrativa enfocada en esa región. ~30 × 10 regiones = 300 narrativas. Heavy pero factible.
- **Voice picker en UI**: dropdown con varias voces (Mónica, Paulina, Sandy, Reed). Cada narrativa pre-generada con N voces y user toggle.
- **Download del audio**: botón al lado del player.
- **Resumen TL;DR**: 50-palabra TL;DR arriba del body_html. Pre-computado igual.
- **Embeddings + búsqueda semántica**: con `nomic-embed-text` ya instalado, indexar polities/figures/events. Permitir buscar "narrativas que toquen Mongol Empire".

---

*Spec aprobado por Sebas en chat. Listo para implementation plan.*
