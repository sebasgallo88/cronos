# content/polities/

Cada `.md` en esta carpeta es **una polity** — imperio, reino, califato, ciudad-estado, federación, polity nómade. El frontmatter YAML es la schema (validada en build con Ajv); el body markdown aparece en el side panel al click.

## Schema completo

Ver [`docs/data-model.md`](../../docs/data-model.md). Lo esencial:

```yaml
---
type: polity
id: roma                            # slug = filename sin .md
name: Imperio Romano                # en español
name_en: Roman Empire               # opcional
start_year: -27                     # BCE como negativo, CE positivo
end_year: 476
region: mediterraneo                # uno de los 10 macro-regiones
capital: Roma                       # string libre
religion_dominant:                  # ids de content/religions/
  - religion-romana-tradicional
predecessors: [republica-romana]    # ids de content/polities/
successors: [imperio-romano-oriental]
color: "#8B0000"                    # hex obligatorio
tags: [imperio]
wikidata: Q2277                     # opcional, Q-number canónico
sources:                            # ≥1 obligatorio
  - https://en.wikipedia.org/wiki/Roman_Empire
created: '2026-05-19'
updated: '2026-05-19'
---

# Imperio Romano

Markdown libre acá. Headings, listas, links, énfasis. Aparece en el side panel renderizado a HTML por `marked`.
```

**Validación:** `npm run validate` (corre Ajv + chequea cross-fields como `start_year < end_year` y unicidad de id). Errores rompen el build.

**Convenciones:**
- Filename = `{id}.md` (lowercase, kebab-case, ASCII).
- 50 polities en v1, balanceadas no-Eurocentric (ver `docs/polities-curation.md`).
- Macro-regiones canónicas: `mediterraneo, europa, medio-oriente, africa-subsahariana, norte-africa, sur-asia, este-asia, sudeste-asia, estepa, americas`.
