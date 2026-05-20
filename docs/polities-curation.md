# Curación de polities — v1

**Status:** propuesta autónoma de la sesión de ejecución (F3). Cerrada con 50 polities que cubren las cuotas mínimas no-Eurocentric de [PLAN.md §F3/paso-3](../PLAN.md). **Vetá o editá** cuando vuelvas; cualquier cambio se valida con `npm run validate && npm run lint-balance -- --strict`.

---

## Distribución final (50 polities)

| Macro-región | Cuota mín | Incluidas | Polities |
|---|---:|---:|---|
| Mediterráneo | 4 | **4** | Cartago, Macedonio/Helenístico, Roma, Bizancio |
| Europa post-Roma | 4 | **5** | Sacro Imperio Romano Germánico, Reino Inglaterra/UK, Reino Francia, Imperio Español, Imperio Ruso |
| Medio Oriente | 5 | **6** | Sumeria, Babilonia, Persa Aqueménida, Sasánida, Califato Abasí, Otomano |
| Norte de África | 3 | **3** | Egipto Faraónico, Reino de Kush, Califato Fatimí |
| África Sub-Sahariana | 5 | **6** | Aksum, Mali, Songhai, Great Zimbabwe, Kongo, Benín |
| Sur de Asia | 5 | **5** | Valle del Indo, Maurya, Gupta, Chola, Mogol |
| Este de Asia | 5 | **7** | Han, Tang, Song, Ming, Qing, Joseon, Tokugawa |
| Sudeste Asiático | 3 | **3** | Khmer, Majapahit, Ayutthaya |
| Estepa / Asia Central | 5 | **5** | Escitas, Xiongnu, Khaganato Turco, Mongol, Timúrida |
| Américas | 5 | **6** | Caral, Maya Clásico, Cahokia, Azteca, Inca, Moche |
| **Total** | **44** | **50** | |

---

## Reasoning por inclusión (resumen)

### Mediterráneo

- **Cartago** — única gran potencia púnica mediterránea pre-Roma; balance con la perspectiva fenicia/africana.
- **Imperio Macedonio (Helenístico)** — agregado en lugar de "Grecia clásica" porque tiene fechas más claras y unifica los reinos diadocos (Seléucida, Ptolemaico, etc.) en una entidad.
- **Roma** — ineludible.
- **Bizancio** — continuidad institucional de Roma hasta 1453; representa Cristianismo ortodoxo.

**Decididamente omitidos:** Minoica/Micénica (cobertura ya alta del Mediterráneo); "Grecia clásica" como polity (es un cluster de polis, mejor representado por figuras de la era Macedónica/Helenística).

### Europa post-Roma

- **Sacro Imperio Romano Germánico** — vehículo del orden político germánico-cristiano-latino.
- **Reino Inglaterra/UK** — continuidad dinástica + imperio global moderno; representa anglo-protestantismo.
- **Reino Francia** — eje católico continental, hasta 1792 (Rev. Francesa marca cambio régimen).
- **Imperio Español** — primer imperio global moderno; conexión Europa↔Américas/Asia.
- **Imperio Ruso** — eje ortodoxo, expansión euroasiática.

**Omitidos:** Imperio Carolingio (cubierto por SIRG conceptualmente); Imperio Alemán/Prusia (1871-1918, posible adición v2); Imperio Austrohúngaro (idem).

### Medio Oriente

- **Sumeria** — primer estado civilizacional documentado.
- **Babilonia** — código legal pivotal + neo-babilónica como puente entre civilizaciones tempranas y persas.
- **Persa Aqueménida** — primer imperio global, primer estado pluralista.
- **Sasánida** — última gran Persia pre-islámica.
- **Califato Abasí** — apogeo intelectual islámico clásico.
- **Otomano** — última gran polity musulmana pre-moderna.

**Omitidos:** Asiria, Selyúcidas, Mamelucos (cobertura ya alta; agregables v2). Imperio Acadio queda implícitamente cubierto por Sumeria + Babilonia.

### Norte de África

- **Egipto Faraónico** — clasificado como `norte-africa` (no `mediterraneo`) por consistencia con PLAN §2/D7 (la geografía es el invariante).
- **Reino de Kush** — visibiliza la civilización nubia, "faraones negros" (dinastía XXV egipcia).
- **Califato Fatimí** — chiismo, El Cairo, al-Azhar; balancea las visiones sunitas del Medio Oriente.

**Omitidos por cuota:** Almohades, Mauretania, Ptolemaicos (este cubierto por Macedónico).

### África Sub-Sahariana

- **Imperio de Aksum** — uno de los 4 grandes poderes del siglo III según Mani; cristianismo africano.
- **Mali** — Mansa Musa, Tombuctú, oro transahariano.
- **Songhai** — sucesor de Mali, apogeo intelectual de Tombuctú.
- **Great Zimbabwe** — arquitectura de piedra seca shona; sub-Sáhara oriental.
- **Reino del Kongo** — cristianismo voluntario africano (1491), interacción atlántica.
- **Reino de Benín** — bronce de Benín, comercio costero africano occidental.

**Omitidos por cuota:** Imperio Ghana (predecesor de Mali, redundante); Imperio Etíope cristiano post-Aksum (queda implícito vía Aksum).

### Sur de Asia

- **Valle del Indo** — civilización fundacional, contemporánea de Sumeria/Egipto.
- **Maurya** — Ashoka + budismo expansivo.
- **Gupta** — edad de oro clásica, matemáticas, cero.
- **Chola** — sur tamil + proyección naval al sudeste asiático.
- **Mogol** — síntesis indo-persa-islámica, hasta Raj británico.

**Omitidos por cuota:** Vijayanagara, Sultanato de Delhi (Mogol los subsume), Maratha (segundo plano vs Mogol).

### Este de Asia

- **Han, Tang, Song, Ming, Qing** — 5 grandes dinastías chinas, no se puede omitir ninguna.
- **Joseon** — Corea, 5 siglos continuos.
- **Tokugawa** — Japón pre-Meiji.

**Omitidos por cuota:** Shang/Zhou/Qin/Sui (Han los subsume implícitamente); Yuan (Mongol los cubre); periodos japoneses Heian/Kamakura/Muromachi.

### Sudeste Asiático

- **Khmer** — Angkor, mayor ciudad pre-industrial del mundo.
- **Majapahit** — referencia para Indonesia moderna; talasocracia hindú-budista.
- **Ayutthaya** — Thailand pre-Bangkok, eje comercial cosmopolita.

**Omitidos por cuota:** Funan, Srivijaya, Dai Viet, Pagán (Birmania), sultanatos malayos.

### Estepa / Asia Central

- **Escitas** — nómadas pioneros del arco compuesto, eje euroasiático antiguo.
- **Xiongnu** — rival principal de Han China; precursor de los Hunos.
- **Khaganato Turco** — primer estado "turco" autodenominado; matriz lingüística turcomongola.
- **Imperio Mongol** — el más grande imperio terrestre contiguo; pivote del comercio euroasiático medieval.
- **Imperio Timúrida** — sucesor cultural mongol con renacimiento persa-turco-islámico.

**Omitidos por cuota:** Horda de Oro (Mongol la subsume), Heftalitas, Sasánida-influencia.

### Américas

- **Caral / Norte Chico** — civilización más antigua de las Américas.
- **Maya Clásico** — única escritura completa pre-colombina.
- **Cahokia** — único representante norteamericano grande.
- **Azteca** — Mesoamérica post-clásica.
- **Inca** — andina, mayor imperio pre-colombino.
- **Moche** — predecesora andina del Inca con metalurgia avanzada.

**Omitidos por cuota:** Olmeca, Tolteca, Tiahuanaco, Wari, civilizaciones del Misisipi tempranas, otros estados norteamericanos pre-contacto.

---

## Decisiones técnicas

### `religion_dominant` queda vacío

Los polities salen del ingest sin religiones asignadas porque las religiones se ingestan en F4. Asignación cruzada se hace en F4/paso-3 (curación) o vía script si hay relación canónica clara.

### `predecessors` / `successors` quedan vacíos

Para evitar referencias colgantes a polities no incluidas en v1 (`republica-romana`, `reinos-germanicos`, `imperio-yuan`, etc.). Si querés agregarlas, podés editar manualmente — `validate` reportará warnings que las polities referenciadas no existen pero no rompe el build.

### Wikidata Q-numbers

Incluidos donde la confianza es ≥80%. Revisión manual con `https://www.wikidata.org/wiki/Q{NUMBER}` recomendada antes de F4 (donde Wikidata se usa para queries SPARQL paramétricos).

### Colores

Autogenerados algorítmicamente por `scripts/ingest-cliopatria.mjs` vía función `hslToHex`. Hue base por macro-región (10 hues distintas), lightness en rampa 28→52 por índice intra-región. Saturación constante 55%.

Si querés overridear, fijá `color: "#XXXXXX"` en frontmatter — el script respeta lo que ya está.

### `start_year` / `end_year` en casos ambiguos

| Polity | Decisión |
|---|---|
| Egipto Faraónico | -3100 (Narmer) → -332 (Alejandro). Posterior periodo Ptolemaico cubierto por Macedónico. |
| Bizancio | 330 CE (refundación de Constantinopla por Constantino I). Alternativa: 395 (división) o 476 (caída Occidente). Elegido 330 por inicio de la línea oriental como capital separada. |
| Cartago | -814 (fundación tradicional por Dido) → -146 (destrucción). |
| Inglaterra/UK | 927 (Athelstan unifica) → 2026 (sigue activo). |
| Sumeria | -4500 (Ubaid tardío urbanización) → -1900 (absorción definitiva por Babilonia). Cliopatria probablemente usa -3400 (Uruk) — divergencia documentada. |

---

## Próximos pasos pos-F3

1. **F4** ingestará 10 religions; el script F4 cruzará con los polities para auto-popular `religion_dominant` cuando haya match canónico (ej. todos los califatos → islam).
2. **F4** ingestará ~200 figures; las polities listadas acá serán los anchors para `figures-by-polity.sparql`.
3. **F5** ingestará Seshat (si Sebas crea cuenta) para enriquecer `population_peak`, `area_peak_km2`, `religious_complexity_score`.

---

*Curación generada por la sesión autónoma 2026-05-19. Reasoning revisable por Sebas; editar `scripts/lib/polities-seed.mjs` para cambios estructurales, o `content/polities/{id}.md` para tweaks a polities individuales.*
