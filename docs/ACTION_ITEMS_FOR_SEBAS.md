# Action Items para Sebastián

**Última actualización:** 2026-05-20, post-deploy.

---

## ✅ Todo el deploy completo

| Hito | Status |
|---|---|
| Repo en GitHub `sebasgallo88/cronos` (privado) | ✅ |
| Pages project `cronos` creado | ✅ |
| Deploy en `https://cronos-5w7.pages.dev` | ✅ |
| Custom domain `cronos.sebastiangallo.com` | ✅ Live (HTTP 200) |
| SSL automático (Google CA) | ✅ |

🔗 **Live:** [https://cronos.sebastiangallo.com](https://cronos.sebastiangallo.com)

---

## 🟢 Review pendiente (no bloqueante)

Estas curaciones se hicieron autónomas. **Cualquier veto/edición tuya es bienvenida.** Después de cualquier cambio: `npm run deploy` (encadena build + push directo a Pages).

| Doc | Entidades | Notas |
|---|---|---|
| `docs/polities-curation.md` | 50 polities | distribución por región + omitidas |
| `docs/religions-curation.md` | 10 religions | cluster "religiones-indigenas", tabla sugerida de `religion_dominant` para polities |
| `docs/figures-curation.md` | 125 figures | sesgo político ~56%, figuras candidatas v2 |
| `docs/events-curation.md` | 99 events | sesgo militar+político 60%, siglos XX+ deferred |

Cómo cambiar:
- **Editar UN .md:** `content/{type}/{id}.md` → `npm run deploy`.
- **Agregar entidades nuevas:** ver `docs/adding-an-entity.md`.
- **Batch:** editar `scripts/lib/*-seed.mjs` → `npm run ingest:cliopatria` o `ingest:wikidata` → deploy.

---

## 🟡 Opcionales / v2

### Seshat enrichment (F5 paso-2)

Sirve para poblar `population_peak`, `area_peak_km2`, `religious_complexity_score` en polities.

1. Registrarte en https://seshatdatabank.info/.
2. Bajar CSV → `_sources/seshat.csv` (gitignored).
3. Implementar fuzzy-match polity→Seshat en `scripts/ingest-seshat.mjs`.
4. `npm run ingest:seshat && npm run validate && npm run deploy`.

### Más figures (target original 200) y events (target original 300)

Listas de candidatos por región/era/categoría en `docs/figures-curation.md` y `docs/events-curation.md`.

### Refinements visuales

- **Mobile UX**: hoy sidebar colapsa abajo en <900px. Drawer/hamburger (PLAN §9) es v2.
- **Light/dark toggle manual**: hoy es `prefers-color-scheme`. Toggle en header es v2.
- **Default zoom**: hoy arranca en -10000 → 2026 que comprime modernidad. Default zoom-in a -3000 → 2026 + zoom-out manual a prehistoria es nice-to-have.
- **Religion_dominant en polities**: hoy sólo Roma tiene. Tabla sugerida (cristianismo/islam/hinduismo/etc.) en `docs/religions-curation.md`. Aplicable manualmente o con script de enrichment.

---

## Anatomía rápida del repo

```
content/  ← markdown source of truth (50p + 10r + 125f + 99e)
scripts/  ← ETL + validate + build
src/      ← Astro + React + D3
public/   ← favicon, og-image, sitemap, robots
docs/     ← este archivo, curations, schema, how-to
PLAN.md   ← manual completo (F1-F11)
KICKOFF.md← prompt de arranque para Claude
```

## Comandos clave

```bash
npm run dev                      # dev server localhost:4321
npm run build                    # validate + build-data + astro build
npm run validate                 # Ajv schema check
npm run lint-balance             # cuotas no-Eurocentric
npm run deploy                   # build + wrangler pages deploy
npm run ingest:cliopatria        # regen polities desde seed
npm run ingest:wikidata          # regen religions/figures/events desde seeds
```

---

*Si encontrás algo roto: `npm run validate -- --strict` muestra todos los issues. Si nada queda claro, pingame con el output.*
