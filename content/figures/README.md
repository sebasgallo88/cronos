# content/figures/

Cada `.md` es **una figura histórica** — militar, religioso, filósofo, científico, político, artista. Se renderizan como **dots** sobre la lane de su polity primaria, en el año de nacimiento.

## Schema

Ver [`docs/data-model.md`](../../docs/data-model.md). Lo esencial:

```yaml
---
type: figure
id: alejandro-magno
name: Alejandro Magno
name_en: Alexander the Great
year_born: -356
year_died: -323
polity:                             # ids de polities con las que se asocia
  - reino-de-macedonia
region: mediterraneo
role: militar                       # militar | religioso | filosofo | cientifico | politico | artista
tags: [conquistador]
wikidata: Q8409
sources:
  - https://en.wikipedia.org/wiki/Alexander_the_Great
created: '2026-05-19'
updated: '2026-05-19'
---

# Alejandro Magno

Body markdown.
```

**v1:** ~200 figuras, 5-10 por polity, balanceadas no-Eurocentric. Ver `docs/figures-curation.md`.

**Roles canónicos** (sin tildes para evitar issues YAML):
- `militar` — comandantes, conquistadores, generales
- `religioso` — fundadores, líderes, reformadores
- `filosofo` — pensadores, escuelas
- `cientifico` — descubrimientos, matemáticos, médicos
- `politico` — gobernantes civiles, legisladores, diplomáticos
- `artista` — escritores, pintores, arquitectos, compositores
