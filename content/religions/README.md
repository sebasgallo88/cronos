# content/religions/

Cada `.md` es **una tradición religiosa** — judaísmo, cristianismo, islam, budismo, etc. Se renderizan como **banda separada** arriba del histomap, no como atributo de polity (porque una misma polity puede tener múltiples religion_dominant en distintos períodos).

## Schema

Ver [`docs/data-model.md`](../../docs/data-model.md). Lo esencial:

```yaml
---
type: religion
id: cristianismo
name: Cristianismo
name_en: Christianity
start_year: 30                      # aprox. crucifixión / fundación
end_year: null                      # null = vigente
region_birth: medio-oriente
branch_of: judaismo                 # null si tradición raíz
branches:                           # tradiciones derivadas (ids)
  - catolicismo
  - ortodoxia
  - protestantismo
color: "#8B4513"
wikidata: Q5043
sources:
  - https://en.wikipedia.org/wiki/Christianity
created: '2026-05-19'
updated: '2026-05-19'
---

# Cristianismo

Body markdown.
```

**v1:** 10 tradiciones canónicas (judaísmo, cristianismo, islam, hinduismo, budismo, jainismo, daoismo, confucianismo, zoroastrismo, religiones indígenas como cluster). Ver `docs/religions-curation.md`.
