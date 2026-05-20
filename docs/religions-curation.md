# Curación de religions — v1

**Status:** propuesta autónoma F4. **Vetá o editá** cuando vuelvas.

10 tradiciones canónicas. Cada una representa una **familia religiosa amplia**, no una secta o denominación específica. Las divisiones internas (catolicismo/protestantismo/ortodoxia; sunita/chiita; theravada/mahayana/vajrayana) se mencionan en el body markdown pero no se modelan como entidades religion separadas — agregables en v2 si el histomap muestra la banda demasiado vacía.

| ID | Tradición | Fundación | Familia |
|---|---|---:|---|
| `judaismo` | Judaísmo | -1800 | Abrahámica |
| `cristianismo` | Cristianismo | 30 | Abrahámica (branch_of: judaismo) |
| `islam` | Islam | 622 | Abrahámica |
| `hinduismo` | Hinduismo | -1500 | Índica |
| `budismo` | Budismo | -500 | Índica |
| `jainismo` | Jainismo | -600 | Índica |
| `daoismo` | Daoísmo | -400 | China |
| `confucianismo` | Confucianismo | -500 | China |
| `zoroastrismo` | Zoroastrismo | -1000 | Persa |
| `religiones-indigenas` | Religiones indígenas (cluster) | -10000 | Cluster narrativo |

## Decisiones editoriales

### "Religiones indígenas" como cluster

Las tradiciones pre-monoteístas y de pueblos originarios (mayas, aztecas, incas, yorubas, akan, religión nórdica, religión céltica, polynesias, ainu, etc.) son **cientos** de prácticas distintas que romperían la escala de la banda religiosa del histomap.

Decisión: agrupar como cluster narrativo único con start_year=-10000 (paleolítico tardío) y region_birth=americas (arbitrario; cubre todas las regiones realmente). En v2 podría desagregarse por macro-región (ej. `religiones-mesoamericanas`, `religiones-yoruba`, etc.).

### `branch_of` simplificado

Cristianismo → judaísmo está claro.
Islam → judaísmo/cristianismo: la tradición islámica reconoce a profetas abrahámicos pero se considera revelación independiente. Dejamos `branch_of: null` y se aclara en body.
Budismo → hinduismo: comparten contexto pero el budismo rechaza Vedas y casta. Dejamos `branch_of: null`.

### Religión romana tradicional, religión egipcia, religión nórdica, etc.

Quedan documentadas en los bodies de polities relevantes y bajo el cluster `religiones-indigenas`. Una posible mejora v2: agregar entries como `religion-romana-tradicional.md` para resolver la warning de roma.md.

### Color por tradición

Asignado en el seed (no autogenerado). Decisión cultural-inspirada para religiones porque las paletas son icónicas y reconocibles:
- Judaísmo: azul (estrella David)
- Cristianismo: marrón cálido (basílicas, manuscritos iluminados)
- Islam: verde (estandarte fatimí, banderas islámicas)
- Hinduismo: naranja (saffron)
- Budismo: amarillo dorado (oro-azafrán)
- Jainismo: amarillo más claro
- Daoísmo: azul-gris (yin-yang, montañas-niebla)
- Confucianismo: marrón ocre (literati)
- Zoroastrismo: rojo (fuego sagrado)
- Religiones indígenas: marrón tierra

Esto desvía de la decisión "paleta autogenerada" del §12 para polities, pero las religiones se renderizan en banda separada arriba del histomap (PLAN §9), donde la asociación cultural ayuda más que perjudica.

---

## Cross-refs pendientes en polities

Después de F4 el siguiente paso editorial (no automatizado) es agregar `religion_dominant` a las polities donde haya match canónico claro. Lista sugerida (ejecutable manualmente o como F5 enriquecimiento):

| Polity | religion_dominant sugerida |
|---|---|
| imperio-bizantino | cristianismo |
| sacro-imperio-romano-germanico | cristianismo |
| imperio-espanol | cristianismo |
| imperio-ruso | cristianismo |
| reino-de-inglaterra | cristianismo |
| reino-de-francia | cristianismo |
| reino-del-kongo | cristianismo (post-1491) |
| imperio-aksum | cristianismo (post-340) |
| califato-abasi | islam |
| califato-fatimi | islam |
| imperio-otomano | islam |
| imperio-mali | islam |
| imperio-songhai | islam |
| imperio-mogol | islam |
| reino-de-benin | religiones-indigenas |
| imperio-aksum (pre-340) | religiones-indigenas |
| imperio-persa-aquemenida | zoroastrismo |
| imperio-sasanida | zoroastrismo |
| civilizacion-valle-indo | religiones-indigenas (proto-hinduismo) |
| imperio-maurya | budismo (post-Ashoka), hinduismo |
| imperio-gupta | hinduismo |
| imperio-chola | hinduismo |
| dinastia-han | confucianismo |
| dinastia-tang | budismo, confucianismo, daoismo |
| dinastia-song | confucianismo (neoconfucianismo) |
| dinastia-ming | confucianismo |
| dinastia-qing | confucianismo |
| joseon | confucianismo (neoconfucianismo) |
| shogunato-tokugawa | budismo, religiones-indigenas (sintoísmo) |
| imperio-khmer | hinduismo, budismo (post-Jayavarman VII) |
| imperio-majapahit | hinduismo, budismo |
| reino-de-ayutthaya | budismo |
| imperio-mongol | religiones-indigenas (tengrismo) |
| imperio-timurida | islam |
| caral, maya-clasico, cahokia, imperio-azteca, imperio-inca, moche | religiones-indigenas |

Si querés que esto se aplique programáticamente, podemos escribir un `scripts/enrich-religions.mjs` que tome esta tabla y muta los frontmatters. Por ahora la dejo documentada — `npm run validate` no rompe sin estos campos (son opcionales).

---

*Curación generada por la sesión autónoma 2026-05-20.*
