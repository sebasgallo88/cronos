# content/events/

Cada `.md` es **un evento histórico** — batalla pivotal, fundación/caída, concilio, descubrimiento, ruta comercial, peste. Se renderizan como **dots** sobre la lane de la primera polity en `polities[]`, en su `year`.

## Schema

Ver [`docs/data-model.md`](../../docs/data-model.md). Lo esencial:

```yaml
---
type: event
id: caida-constantinopla-1453
name: Caída de Constantinopla
year: 1453
year_end: null                      # null si evento puntual; valor si rango
polities:                           # polities involucradas (ids)
  - imperio-romano-oriental
  - imperio-otomano
region: medio-oriente               # región donde ocurrió
category: militar                   # militar | politico | religioso | cientifico | cultural | economico | desastre
tags: [guerra]
wikidata: Q193410
sources:
  - https://en.wikipedia.org/wiki/Fall_of_Constantinople
created: '2026-05-19'
updated: '2026-05-19'
---

# Caída de Constantinopla

Body markdown.
```

**v1:** ~300 eventos, distribuidos por macro-región y siglo. Ver `docs/events-curation.md`.

**Categorías canónicas** (sin tildes):
- `militar` — batallas, conquistas, guerras
- `politico` — fundaciones, caídas, tratados, revoluciones
- `religioso` — concilios, hijras, reformas, cismas
- `cientifico` — descubrimientos, invenciones
- `cultural` — obras pivotales, traducciones, fundaciones culturales
- `economico` — apertura/cierre de rutas, crisis financieras
- `desastre` — pestes, hambrunas, terremotos, sequías
