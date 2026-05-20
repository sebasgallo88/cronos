# Action Items para Sebastián

Cosas que requieren **tu input manual** porque no se pueden hacer desde la sesión autónoma. Generada al final de la ejecución completa F1-F11.

**Última actualización:** 2026-05-20, F11 cerrado.

---

## 📊 Estado actual del proyecto

- **Commits locales en `main`:** 11 (F1 → F11 + smoke test).
- **Repo local:** verde, validate + build pasan en cada commit.
- **Browser local:** funciona en `localhost:4321` con todas las features (multi-lane, filtros, detail panel, zoom-pan). Lighthouse desktop 100/100/100/100.
- **Live en cronos.sebastiangallo.com:** **TODAVÍA NO** — falta push + CF Pages.

---

## 🔴 Bloqueante — para que el sitio esté live

### 1. `git push origin main`

El repo `https://github.com/sebasgallo88/cronos.git` está creado pero el push falló por auth. La SSH key local (`~/.ssh/id_ed25519`, comment `sebas-mbp`) no está registrada en tu cuenta GitHub.

**Elegí una opción** (~1 min cada una):

#### Opción A — SSH (recomendado, te queda configurado para siempre)

```bash
# 1. Copiar tu pubkey al portapapeles:
cat ~/.ssh/id_ed25519.pub | pbcopy

# 2. En el browser:
#    GitHub → Settings → SSH and GPG keys → "New SSH key"
#    Title: "MacBook Pro – Cronos"
#    Key: (paste, Cmd+V)

# 3. Cambiar remote a SSH y push:
cd "/Users/sebasgallo/Cronos project"
git remote set-url origin git@github.com:sebasgallo88/cronos.git
git push -u origin main
```

#### Opción B — Personal Access Token (HTTPS)

```bash
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
#   → Generate new token (classic). Scope: "repo" (full control of private repos).
# Copiá el token (no se ve dos veces).
cd "/Users/sebasgallo/Cronos project"
git push -u origin main
# Te pide username: sebasgallo88
# Te pide password: pegar el token (NO tu password de GitHub)
```

#### Opción C — gh CLI

```bash
brew install gh
gh auth login   # browser flow
cd "/Users/sebasgallo/Cronos project"
git push -u origin main
```

---

### 2. Conectar el repo a Cloudflare Pages

Una vez que el push haya funcionado:

1. CF dashboard → **Workers & Pages** → **Create application** → tab **Pages** → **Connect to Git**.
2. Authorize GitHub (si no está conectado ya).
3. Seleccionar el repo `cronos` de la lista.
4. **Production branch:** `main`.
5. **Framework preset:** "Astro" (debería auto-detectar; si no, "None" + build settings manuales).
6. **Build settings:**
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION = 20`
7. **Save and Deploy**.
8. Esperar ~2-3 min. Verificar deploy verde en `cronos-XXX.pages.dev`.

---

### 3. Custom domain `cronos.sebastiangallo.com`

CF Pages → proyecto `cronos` → **Custom domains** → **Set up a custom domain**.

- Domain: `cronos.sebastiangallo.com`.
- CF detecta que la zona `sebastiangallo.com` está en tu account y crea el CNAME automático apuntando al `*.pages.dev`. SSL Let's Encrypt automático.
- Propagación: típicamente 1-2 minutos, máximo 24h.

**Test final:** abrir `https://cronos.sebastiangallo.com` y confirmar que carga con SSL OK.

---

## 🟡 Opcional — feature post-launch

### 4. Account en Seshat Databank (F5 enrichment)

**No bloquea v1.** Sirve para enriquecer polities con `population_peak`, `area_peak_km2`, `religious_complexity_score`.

1. Registrarte en https://seshatdatabank.info/.
2. Descargar el CSV completo del databank.
3. Colocar en `_sources/seshat.csv` (gitignored).
4. Implementar fuzzy-match polity→Seshat en `scripts/ingest-seshat.mjs` (el header del script documenta los pasos esperados: trigrama + jaccard + start_year tiebreaker).
5. `npm run ingest:seshat && npm run validate && npm run build`.

---

## 🟢 Review pendiente — curaciones editoriales

Estas curaciones se hicieron autónomas. **Cualquier veto/edición tuya es bienvenida.** Después de cualquier cambio: `npm run validate && npm run lint-balance -- --strict && npm run build`.

| Doc | Entidades | Para ojear |
|---|---|---|
| `docs/polities-curation.md` | 50 polities | distribución por región, polities deliberadamente omitidas |
| `docs/religions-curation.md` | 10 religions | "religiones-indigenas" como cluster, branch_of decisions |
| `docs/figures-curation.md` | 125 figures | sesgo político (~56%), figuras famosas omitidas para v2 |
| `docs/events-curation.md` | 99 events | sesgo militar+político (60%), siglos XX+ deferred |

Cómo cambiar:

- **Editar UN .md existente:** edit `content/{type}/{id}.md` y commit.
- **Agregar entidades nuevas:** ver `docs/adding-an-entity.md`.
- **Cambio masivo (50+ entidades):** editar el `*-seed.mjs` correspondiente en `scripts/lib/` y correr `npm run ingest:cliopatria` / `ingest:wikidata`.

---

## 🔵 Refinements / ideas para v2

- **Religion_dominant** en polities: el `docs/religions-curation.md` tiene una tabla sugerida con asignaciones canónicas (ej. todos los califatos → islam). Hoy sólo Roma tiene religion_dominant poblado. Aplicarlo masivamente es bajo esfuerzo si querés un script de enrichment.
- **Más figures (target original era 200):** lista de candidatos en `docs/figures-curation.md` por región/era.
- **Más events (target original 300):** lista de candidatos por categoría en `docs/events-curation.md`.
- **Cliopatria GeoJSON real:** el script `ingest-cliopatria.mjs` lo soporta como enrich, pero hoy usa el SEED curado. Si llegás al GeoJSON de Harvard Dataverse, podemos cruzar.
- **Resolution problem post-1500:** los polities/figures/events del periodo moderno se aprietan visualmente con el zoom default a 12000 años. Solución: zoom-in default a -3000 → 2026 + el usuario zoom-outs si quiere ver prehistoria.
- **Mobile UX:** el sidebar colapsa a una columna abajo del histomap en <900px. Para v2: drawer/hamburger sidebar como el wireframe en PLAN §9.
- **Light/dark toggle manual:** hoy es `prefers-color-scheme`. Toggle en header sería un buen v2.
- **Astro 5 / 6 migration:** Astro 4 tiene CVEs reportados que no aplican a static (`output: 'static'`, sin SSR/server-islands/CF adapter). En F11 documentado como riesgo conocido. Cuando quieras: `npm audit fix --force` + smoke test.
- **Internacionalización full**: hoy UI en ES con bilingual hint en data (name_en). Toggle EN→ES es post-v1.

---

## Anatomía rápida del repo (referencia)

```
content/  ← markdown source of truth (50p + 10r + 125f + 99e)
scripts/  ← ETL + validate + build
src/      ← Astro + React + D3
public/   ← favicon, og-image, sitemap, robots
docs/     ← este archivo, curations, schema, how-to
PLAN.md   ← manual completo (F1-F11)
KICKOFF.md← prompt de arranque para Claude
```

Detalles en `README.md`.

---

*Si encontrás algo roto: `npm run validate -- --strict` muestra todos los issues. Si nada queda claro, pingame con el output.*
