# Action Items para Sebastián

Esta es la lista de cosas que requieren **tu input manual** y que no se pudieron resolver dentro de la sesión autónoma. La sesión va completando F1 → F11 del [PLAN.md](../PLAN.md); este archivo se actualiza cada vez que aparece un bloqueante.

**Última actualización:** 2026-05-19, durante F1.

---

## 🔴 Bloqueante alto — desbloquea el deploy

### 1. Auth GitHub para `git push -u origin main`

El repo `https://github.com/sebasgallo88/cronos.git` está creado. El primer commit (`500b66d — F1 bootstrap`) está local en `main`. El push falló porque:
- `osxkeychain` no tiene credentials cacheadas para GitHub HTTPS.
- La SSH key local (`~/.ssh/id_ed25519` con comment `sebas-mbp`) recibe **Permission denied (publickey)** de GitHub — probablemente no está registrada en tu cuenta GitHub.

**Elegí una opción:**

#### Opción A — Registrar la SSH key en GitHub (recomendado, 1 min)

```bash
# 1. Copiar tu pubkey (ya hicimos cat, acá la copiás al portapapeles):
cat ~/.ssh/id_ed25519.pub | pbcopy

# 2. GitHub → Settings → SSH and GPG keys → New SSH key
#    Title: "MacBook Pro – Cronos"
#    Key: (paste)

# 3. Cambiar remote a SSH y push:
cd "/Users/sebasgallo/Cronos project"
git remote set-url origin git@github.com:sebasgallo88/cronos.git
git push -u origin main
```

#### Opción B — Personal Access Token (HTTPS)

```bash
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
#   → Generate new token (classic), scope: repo (full control of private repos)
# Cuando hagas push, te pide username (sebasgallo88) + token como password.

cd "/Users/sebasgallo/Cronos project"
git push -u origin main
```

#### Opción C — Instalar gh

```bash
brew install gh
gh auth login   # browser flow
cd "/Users/sebasgallo/Cronos project"
git push -u origin main
```

---

### 2. Conectar el repo a Cloudflare Pages (post-push)

Cuando el push esté hecho:

1. CF dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Authorize GitHub → seleccionar el repo `cronos`
3. **Production branch:** `main`
4. **Framework preset:** Astro (auto-detect debería tomarlo; si no, "None")
5. **Build command:** `npm run build`
6. **Build output directory:** `dist`
7. **Environment variables:** `NODE_VERSION = 20`
8. **Save and Deploy**
9. Verificar que el primer deploy salga verde en `cronos-XXX.pages.dev`

**Para apuntar `cronos.sebastiangallo.com`** (se hace en F10, pero podés adelantarlo):
- CF Pages → proyecto `cronos` → **Custom domains** → **Set up a custom domain**
- Domain: `cronos.sebastiangallo.com`
- CF detecta que la zona `sebastiangallo.com` está en tu account y crea el CNAME automático.

---

## 🟡 Bloqueante medio — feature opcional

### 3. (F5) Cuenta en Seshat Databank

**Cuándo:** F5 paso 1 (PLAN.md).

Seshat requiere registro para descargar el CSV con `population_peak`, `area_peak_km2` y `religious_complexity_score` por polity. URL: <https://seshatdatabank.info/>.

**Si no querés crear cuenta:** F5 se ejecuta sin Seshat — los campos enriquecidos quedan `null` en frontmatter (no rompen schema, son opcionales). Podés agregar Seshat post-launch.

---

## 🟢 Review pendiente — no bloqueante

Estas curaciones editoriales las hago autónomo con reasoning documentado. **Vetá o editá cuando vuelvas**; corremos `npm run validate && npm run lint-balance` después de cualquier cambio.

| Phase | Doc | Status |
|---|---|---|
| F3 | `docs/polities-curation.md` — 50 polities globales | TBD (en ejecución) |
| F4 | `docs/religions-curation.md` — 10 tradiciones | TBD |
| F4 | `docs/figures-curation.md` — ~200 figuras | TBD |
| F5 | `docs/events-curation.md` — ~300 eventos | TBD |

---

## Anotaciones técnicas

### Audit de dependencies (npm audit)

`npm audit` reportó **4 vulnerabilities en Astro 4 (3 mod / 1 high)**. Todas aplican a features que **no usamos**:
- Server islands XSS, define:vars XSS, CF Adapter XSS → no usamos SSR/server islands/CF adapter; `output: 'static'`.
- Auth bypasses URL-encoding → no hay middleware/auth.
- Astro dev server local file read, esbuild/vite CORS → dev-only, no se expone en prod.

El fix automático (`npm audit fix --force`) upgradearía a Astro 6 (breaking change vs el PLAN que pidió `^4.x`). Documentado en `PLAN.md §15` como riesgo conocido. **Revisar en F10/F11** si querés migrar a Astro 5/6 estable.

### Modelo en uso

Esta sesión corre en **Opus 4.7** continuo. El PLAN reparte tareas entre opus/sonnet/haiku por costo. Si querés optimizar costo en futuras sesiones, podés cortar y abrir sub-sesiones de Haiku para boilerplate puro (F3/paso-4, F6/paso-4).

---

*Generado y actualizado automáticamente por la sesión de ejecución del PLAN.*
