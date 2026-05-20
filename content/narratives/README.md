# content/narratives/

Cada `.md` es una **narrativa histórica generada localmente** para un rango temporal pre-definido. Texto en 4 secciones obligatorias (inicio del período / eventos pivotales / cierre / contrapunto global) + metadata del audio TTS asociado.

## Schema rápido

```yaml
---
type: narrative
id: period-1000bce-500bce            # slug = filename sin .md
label: Edad de Hierro temprana
start_year: -1000
end_year: -500
audio_url: /narratives/audio/period-1000bce-500bce.mp3
audio_duration_sec: 380
audio_voice: Sandy                   # voz macOS (es_MX)
audio_word_count: 832
generated_at: '2026-05-20'
generated_by: qwen2.5:14b
sources_used:
  polity_ids: [...]                  # IDs de polities referenciadas
  event_ids: [...]
  figure_ids: [...]
---

## Al inicio del período
...

## Eventos y transiciones pivotales
...

## Al cerrar el período
...

## Mientras tanto en otras regiones
...
```

## Generación

```bash
ollama serve &                         # Ollama corriendo
npm run narrate:bake                   # GRID completa (~21 narrativas, ~5 min)
npm run narrate:bake -- --overwrite    # regenera todo
npm run narrate:custom -- -1000 0      # un rango custom
npm run narrate:tts-only               # re-genera solo los audios
```

Cada `.md` se acompaña de `public/narratives/audio/{slug}.mp3` (5-8 MB, ~6 min).
