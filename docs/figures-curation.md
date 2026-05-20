# Curación de figures — v1

**Status:** propuesta autónoma F4. **Vetá o editá** cuando vuelvas.

125 figuras curadas, distribuidas por región siguiendo la regla 2-7 por polity (PLAN §F4/paso-3 "max 5-10 por polity"). Target original era ~200; las 75 restantes se difieren a iteración editorial post-launch.

## Distribución por macro-región

| Región | Figuras | Polities cubiertas |
|---|---:|---:|
| Este de Asia | 24 | 7 |
| Europa post-Roma | 16 | 5 |
| Medio Oriente | 16 | 6 |
| Sur de Asia | 15 | 5 |
| Mediterráneo | 12 | 4 |
| Américas | 12 | 5 |
| Estepa / Asia Central | 9 | 5 |
| África Sub-Sahariana | 8 | 6 |
| Norte de África | 7 | 3 |
| Sudeste Asiático | 6 | 3 |
| **Total** | **125** | **50** |

## Distribución por rol

Roles canónicos: `militar | religioso | filosofo | cientifico | politico | artista`.

| Rol | Count aprox. |
|---|---:|
| `politico` | ~70 (~56%) — mayoría son emperadores/reyes/sultanes |
| `militar` | ~12 (10%) |
| `filosofo` | ~10 (8%) |
| `artista` | ~10 (8%) |
| `religioso` | ~8 (6%) — fundadores religiosos + algunos peregrinos/monjes |
| `cientifico` | ~10 (8%) |

**Sesgo evidente:** dominio de `politico`. Razón: con 5-6 figuras por polity las primeras elecciones son siempre líderes (founders + apogeo + decline). Para v2, intencionalmente expandir filósofos/científicos/artistas no-líderes.

## Decisiones editoriales

### Figuras sin polity (`polity: []`)

Los fundadores religiosos (Buda, Jesús, Mahoma, Zaratustra, Confucio, Laozi, Mahavira) **no se asignan a polity** porque su trascendencia es trans-política. Aparecen como dots en su año de nacimiento, posicionados en la región donde nacieron pero sin lane específica de polity.

Algunas figuras pre-polity también quedan sin polity: Panini, Nezahualcóyotl (Texcoco no incluido), Queen Nzinga (Ndongo/Matamba no incluidos), Carlomagno (Carolingio no incluido).

### Roma — bias deliberado

Roma tiene 6 figuras (Julio César, Augusto, Cicerón, Virgilio, Marco Aurelio, Constantino) más Cleopatra que se asocia parcialmente. Es la polity con más figuras junto con dinastías chinas largas. Justificación: 5 siglos de imperio + influencia cultural medieval/moderna desproporcionada.

Posible rebalance v2: bajar a 4-5, reasignar slots a figuras de África Sub-Sahariana (Ana Nzinga ya está, falta Behanzin, Yaa Asantewaa) o Sudeste Asiático (Suryavarman II, Hayam Wuruk de Majapahit).

### China — 24 figuras

Justificable: 7 polities × 3.4 figuras promedio. Confucio + Laozi sin polity. Cada dinastía con 3 figuras (founder + apogeo + cultural/decline) excepto Tang con 5 (Taizong + Wu Zetian + Li Bai + Du Fu + Xuanzang — la edad de oro merece visibilidad).

### Wikidata Q-numbers

Incluidos sólo para ~10 figuras con confianza ≥95%. El resto: skip wikidata para no ensuciar la data con IDs incorrectos. Pendiente para enriquecer cruzando con Wikidata SPARQL en una pasada futura.

### Figuras famosas excluidas v1 (candidates para v2)

- **Pre-modernas faltantes:** Atila el Huno, Saladino, Tomás de Aquino, Avicena (incluido), Averroes, Maimónides, Marco Polo, Erasmo, Maquiavelo, Leonardo da Vinci, Galileo, Lutero, Calvino, Spinoza, Descartes, Cervantes (incluido), Goethe, Pushkin, Tolstói (incluido), Petrarca, Dante, Boccaccio.
- **Modernas (post-1800):** Napoleón, Lincoln, Bolívar, San Martín, Lenin, Stalin, Hitler, Churchill, Mahatma Gandhi, Nelson Mandela, Mao Zedong, Ho Chi Minh, Atatürk, Sun Yat-sen, Frantz Fanon, MLK.
- **Africanas pre-coloniales adicionales:** Shaka Zulu, Yaa Asantewaa, Behanzin, Menelik II, Samori Touré, Sékou Touré (no, modern), Lalibela.
- **Asiáticas adicionales:** Ibn Khaldun, al-Biruni, Maimónides (era andalusí), Saladino, Ramanujan (modern), Tagore (modern).
- **Americanas adicionales:** Ñañankuwena, Tupac Amaru II (1742-1781), Caupolicán, Lautaro, Hatuey.
- **Sudeste asiáticas:** Suryavarman II (constructor de Angkor Wat), Hayam Wuruk (Majapahit apogeo), Taksin de Thonburi.

Si querés, puedo expandir cualquiera de estas listas en otra pasada — sólo decime región/era/cantidad.

---

## Estructura del seed

`scripts/lib/figures-seed.mjs` está organizado por **macro-región** (10 secciones con comentarios). Si querés agregar/editar figuras, simplemente editás ese archivo y corres:

```bash
npm run ingest:wikidata           # respeta archivos existentes
npm run ingest:wikidata -- --overwrite  # regenera todo (cuidado con edits manuales)
npm run validate
```

---

*Curación generada por la sesión autónoma 2026-05-20.*
