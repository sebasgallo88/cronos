# KICKOFF — Cómo arrancar la ejecución de Cronos

Este documento es el **prompt de arranque** para una sesión nueva de Claude Code abierta en `/Users/sebasgallo/Cronos project/`. Está pensado para pegarse íntegro como primer mensaje en esa sesión, o para que la sesión lo lea sola al arrancar.

---

## Para Claude (al abrir sesión aquí)

Hola. Sos la sesión que va a construir el proyecto **Cronos** desde cero en este directorio.

### 1. Lo primero que hacés

1. Leer `PLAN.md` completo. Es tu manual de implementación. No skip ninguna sección.
2. Confirmar que entendés:
   - El proyecto es un Histomap interactivo de la historia humana (lanes paralelas, filtros, deploy a Cloudflare Pages).
   - Stack: Astro + D3 + CF Pages.
   - Markdown es source of truth; JSON es build artifact.
   - El plan tiene 11 fases (F1-F11). Ejecutás F1 → F11 en orden.
   - Cada tarea lleva `[modelo: opus | sonnet | haiku]`. Respetá esas anotaciones — si no podés cambiar de modelo, **declará al inicio de cada fase cuál sería el ideal y por qué**, así Sebas puede partir la sesión.
3. Antes de tocar nada, levantar las **4 open questions de §12 del PLAN** con AskUserQuestion (1 a la vez):
   1. Nombre final del proyecto (working: Cronos; alternativas: Histomap, Paralelos, Linea, Civilizaciones).
   2. Dominio (recomendado: `cronos.sebastiangallo.com` subdominio; alternativas: subpath, dominio nuevo).
   3. Repo público o privado (default: privado).
   4. Color palette (autogenerada algorítmica recomendado v1; alternativa: curada por región).
4. Actualizar el PLAN.md con las decisiones tomadas (commit con mensaje `decisions: open questions de F1 resueltas`).
5. Arrancar F1.

### 2. Reglas duras

- **Modelo por tarea es obligatorio**. Si la sesión no permite cambiar de modelo, anunciá al inicio de cada fase: "Esta fase pide opus, estoy corriendo en sonnet — pedile a Sebas que abra una sub-sesión opus para X paso si es load-bearing".
- **R-Skills-Heavy aplica**: si una fase cruza ~25 tool calls, NO la delegues a un `Agent()` subagent — ejecutá same-session. Si necesitás paralelizar tareas chicas (ej. validar 50 archivos), usá un solo Bash con loop o N Read paralelos en una tool-message — no 50 subagents.
- **No skip de fases**. F2 (schema validation) antes de F3 (ingest). F6 (build script final) antes de F7 (D3). No te saltes orden — el plan está secuenciado por dependencia.
- **Curación editorial = bucle conversacional con Sebas**. F3, F4, F5 tienen pasos donde proponés y él confirma/vetoa. No decidas vos qué 50 polities incluir; proponés con razones y él aprueba.
- **No-Eurocentric balance check** es obligatorio entre F3 ↔ F4 ↔ F5. Si `npm run lint-balance` falla, parás y le decís a Sebas qué falta.
- **Confirmar antes de acciones destructivas**: `gh repo create`, deploy a producción, `rm -rf`. Sebas confirma.
- **Commits con prefix de fase**: `F1: bootstrap Astro + git init`, `F3: ingest 50 polities from Cliopatria`, etc.
- **El PLAN es vivo**. Si algo no funciona como está descrito, actualizás `PLAN.md` con la corrección + commit, antes de seguir. No improvisás silenciosamente.

### 3. Cuándo escalar a Sebas

Decisiones a confirmar siempre:
- Cualquier cambio al shape de los datos (schemas en §3 del PLAN).
- Curación editorial (qué polities/figures/events incluir).
- Naming user-facing (colores, copy, dominio).
- Cambio al stack técnico (cambiar D3 a otra lib, etc.).
- Cualquier costo (CF Pages free tier debería cubrir; si hace falta paid, escalá).

NO necesita confirmar:
- Boilerplate (npm scripts, .gitignore, README sections).
- Refactors internos sin cambio de behavior.
- Tests.
- Documentación derivada del PLAN.

### 4. Contexto importante del usuario

- **Sebastián Gallo**, no-developer; debe mantener esto solo durante 5+ años.
- **Idioma**: español primario para todo content (markdown). Código en inglés. UI bilingüe deseable.
- **Comunicación**: lead con mecanismo + razonamiento, no con conclusión. Recomendá fuerte (no listas A/B/C simétricas). Densidad sobre brevedad para decisiones; brevedad para tasks simples.
- **Prioridades en paralelo**: Sebas tiene varios threads activos (Accrety LLC operando, embarazo de esposa, salida de Torre wind-down, salud, BJJ). Cronos no es P1. Ejecutá con paciencia; F3-F5 toman lo que toman.

### 5. Estado del repo al abrir esta sesión

Sólo existen estos archivos:
```
/Users/sebasgallo/Cronos project/
├── PLAN.md         ← plan completo (16 secciones)
├── README.md       ← stub
└── KICKOFF.md      ← este archivo
```

La carpeta NO tiene git init aún, NO tiene `package.json`, NO tiene nada de Astro. Todo eso lo hacés en F1.

### 6. Primer mensaje sugerido para Sebas

Cuando arranques, mandale algo como:

> "Hola. Leí PLAN.md (47KB, 16 secciones). Vamos con Cronos — antes de F1 necesito que resolvamos las 4 open questions de §12 (nombre, dominio, repo público/privado, color palette). Te las voy a preguntar de a una con recomendación. Después ejecuto F1 (bootstrap: git init, Astro, CF Pages deploy placeholder, ~2-3h estimado).
>
> Una nota — corro en {modelo actual}. F1 pide mayormente sonnet, así que estamos bien. Si en F2/F3 necesitamos opus para schema design y curación editorial, te aviso."

Luego AskUserQuestion #1.

---

*Fin del kickoff. Si tenés dudas estructurales del proyecto, releé PLAN.md antes de preguntar.*
