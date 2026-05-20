# Curación de events — v1

**Status:** propuesta autónoma F5. **Vetá o editá** cuando vuelvas.

98 eventos curados, distribuidos -1800 BCE → 1860 CE. Target original PLAN era ~300; las 200 restantes se difieren a iteración editorial post-launch (ver lista de candidatos abajo).

## Distribución por categoría

| Categoría | Count | % |
|---|---:|---:|
| `militar` | 32 | 33% |
| `politico` | 26 | 27% |
| `religioso` | 17 | 17% |
| `cientifico` | 9 | 9% |
| `cultural` | 8 | 8% |
| `economico` | 3 | 3% |
| `desastre` | 3 | 3% |

**Sesgo evidente:** militar + politico dominan (60%). Razón: los eventos pivotales más documentados son guerras y transiciones de régimen, no descubrimientos científicos ni desastres (que son grupos sub-representados en historiografía clásica). Para v2 expandir cientifico/cultural/economico/desastre.

## Distribución temporal

- BCE (5000 BCE → 1 BCE): ~20 eventos. Sub-representado (~5% del total) — datos antiguos son más esparsos.
- Primer milenio CE (1-1000): ~22 eventos.
- Segundo milenio temprano (1000-1500): ~26 eventos.
- Modernidad temprana (1500-1800): ~26 eventos.
- Siglo XIX (1800-1900): 4 eventos (representación mínima).
- Siglo XX+ (1900+): **0 eventos**. Decisión deliberada — la historia post-1900 requiere curación con menor distancia y consenso. Defer a v2.

## Criterios de selección

Para cada evento incluido, al menos uno de:

1. **Punto de inflexión documentable** con efectos durante 100+ años (caída de Constantinopla, hijra).
2. **Innovación trans-civilizacional** (papel chino, brújula, álgebra, imprenta).
3. **Primera vez documentada** de algo (Cilindro de Ciro y derechos humanos protográficos, Edicto de Tesalónica y cristianismo estatal, etc.).
4. **Cobertura no-Eurocentric** del listado: incluir batallas/eventos no-europeos donde la historiografía estándar tiende a omitir (Talas, Yarmuk, Plassey, Sekigahara, fundación Tenochtitlan, peregrinación Mansa Musa).

## Eventos excluidos v1 (candidatos v2)

**Más militares:**
- Batalla de Issus (-333), Batalla de Zama (-202), Batalla de Pidna (-168), Batalla de Adrianópolis (378), Conquista de Hispania por Tariq ibn Ziyad (711), Conquista de Sicilia árabe (827-902), Caída de Toledo cristiana (1085), Caída de Acre (1291), Batalla de Crécy (1346), Batalla de Agincourt (1415), Caída de Trebisonda (1461), Conquista otomana de Egipto (1517), Batalla de Mohács (1526), Batalla de Mihrab (Boyacá 1819).

**Más políticos:**
- Cilindro de Ciro (-539), Ascenso de Augusto a Princeps (-27), División Diocleciano (-285), Concilio de Constantinopla (381), Caída de los Sasánidas (651), Caída del Califato Omeya (750), Coronación de Carlomagno (800), Tratado de Worms (1122), Bula de Oro (1356), Tratados de Utrecht (1713), Independencia de Brasil (1822), Independencias hispanoamericanas (1810-1825).

**Más religiosos:**
- Concilio de Constantinopla I (381), Iconoclasia bizantina (730-787, 814-842), Conversión de Vladimir el Grande (988), Concilio de Letrán IV (1215), Persecuciones cátaras (1209-1229), Inquisición española (1478), Disolución de monasterios (1536-1541), Acto de Tolerancia inglés (1689), Edicto de tolerancia de José II (1781).

**Más científicos:**
- Eratóstenes calcula la circunferencia terrestre (-240), Ptolomeo Almagesto (~150), Texto matemático Liber Abaci de Fibonacci (1202), Tablas Toledanas (1080), Tablas Alfonsíes (1252), Bestiario de Maerlant (1270), Tycho Brahe (1572), Vesalio De Humani Corporis Fabrica (1543), Harvey circulación sanguínea (1628), Vacuna de viruela Jenner (1796).

**Más culturales:**
- Iliada/Odisea fijadas (-700), Bibliotecas de Alejandría incendios (-48, 391), Construcción del Coliseo (80), Construcción de la Mezquita de Córdoba (785+), Construcción de Notre-Dame de París (1163-1345), Divina Comedia (1320), Construcción de la Capilla Sixtina (1473-1481), Mona Lisa pintada (1503-1506), Hamlet estrenado (~1600), Construcción de Versalles (1661-1715).

**Más económicos:**
- Apertura de la Ruta del Té y Caballo Tibet-China (~700), Apertura del Canal de la China Imperial (~1289 — Gran Canal Yuan), Primera quiebra bancaria documentada (Peruzzi y Bardi 1345), Apertura del Cabo de Buena Esperanza (Dias 1488), Llegada de Vasco da Gama a India (1498), Conquista del galeón de Manila (1565), Bula Inter caetera (1493), Compañía Holandesa de las Indias Orientales fundada (1602), Compañía Británica de las Indias Orientales fundada (1600), Apertura del Canal de Suez (1869).

**Más desastres:**
- Sequía maya clásica (~800-900), Hambruna mongola post-conquista (~1230s), Pequeña Edad de Hielo inicio (~1300), Hambruna europea 1315-1317, Erupción del Tambora (1815), Erupción del Krakatoa (1883), Tsunami de Lisboa (1755), Sequía del Sahel pre-moderno, Peste antonina (165-180), Peste de los Antoninos (165-180).

**Modernos (1900+) — claramente v2:**
- Primera Guerra Mundial (1914-1918), Revolución Rusa (1917), Disolución del Imperio Otomano (1922), Guerras Mundiales, Bomba atómica (1945), Independencia de India (1947), Revolución China (1949), Concilio Vaticano II (1962-1965), Caída del Muro de Berlín (1989), Independencias africanas (1957-1980), Disolución URSS (1991), 9/11 (2001), Primavera árabe (2011), pandemia COVID-19 (2020).

Si querés ampliar cualquier lista — sólo decime región/era/categoría.

## Estructura del seed

`scripts/lib/events-seed.mjs` organizado cronológicamente (BCE → primer milenio → segundo milenio → modernidad temprana → siglo XIX). Sección por época con comentario divisor.

Para regenerar todos los .md (preservando edits manuales): `npm run ingest:wikidata`.
Para regenerar incluyendo overwrites: `npm run ingest:wikidata -- --overwrite`.

---

*Curación generada por la sesión autónoma 2026-05-20.*
