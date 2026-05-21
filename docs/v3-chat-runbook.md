# v3 Chat — Runbook operativo

Documentación de cómo arrancar, parar, reiniciar y debuggear el chat
(Mac mini M4 + CF Tunnel + Ollama).

---

## Arquitectura

```
[Browser]
   │ cronos.sebastiangallo.com (CF Pages, static)
   │   └─ ChatWidget.tsx llama:
   │
   ▼ HTTPS
[chat-api.sebastiangallo.com] ← CF Access (gate por email sebasgallo@gmail.com)
   │
   ▼ CF Tunnel (cloudflared)
[Mac mini M4 @ 192.168.68.65]
   ├─ launchd: com.cronos.cloudflared
   │    └─ cloudflared tunnel run cronos-chat
   │
   └─ launchd: com.cronos.chat-server
        └─ node /Users/zeusgallo/projects/cronos/scripts/chat-server.mjs
             ├─ POST /api/ask  → SSE (text + audio)
             └─ GET  /api/health
                  └─ → http://localhost:11434 (ollama)
                       └─ qwen2.5:7b (chat streaming)
                  └─ → say -v Sandy + ffmpeg (TTS)
```

## Servicios LaunchAgent en el mini

Archivos:
- `~/Library/LaunchAgents/com.cronos.chat-server.plist`
- `~/Library/LaunchAgents/com.cronos.cloudflared.plist`

Configurados con `RunAtLoad=true` + `KeepAlive=true`. Arrancan al login del user (zeusgallo) y se auto-reinician si crashean.

Logs:
- `~/logs/chat-server.log` + `.err`
- `~/logs/cloudflared.log` + `.err`

## Comandos comunes (desde tu MBP via SSH)

### Verificar status

```bash
# health endpoint via tunnel
curl -s https://chat-api.sebastiangallo.com/api/health | python3 -m json.tool

# health local (sin tunnel)
ssh zeusgallo@192.168.68.65 'curl -s http://localhost:8080/api/health | python3 -m json.tool'

# launchd status
ssh zeusgallo@192.168.68.65 'launchctl list | grep cronos'

# tail logs
ssh zeusgallo@192.168.68.65 'tail -30 ~/logs/chat-server.log ~/logs/cloudflared.log'
```

### Restart servicios

```bash
ssh zeusgallo@192.168.68.65 '
launchctl unload ~/Library/LaunchAgents/com.cronos.chat-server.plist
launchctl unload ~/Library/LaunchAgents/com.cronos.cloudflared.plist
sleep 1
launchctl load   ~/Library/LaunchAgents/com.cronos.chat-server.plist
launchctl load   ~/Library/LaunchAgents/com.cronos.cloudflared.plist
sleep 3
curl -s http://localhost:8080/api/health
'
```

### Cambiar modelo (ej. probar qwen2.5:14b)

Editar `~/Library/LaunchAgents/com.cronos.chat-server.plist` y agregar:

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  <key>MODEL</key><string>qwen2.5:14b</string>
</dict>
```

Después: `launchctl unload && load`.

Modelo debe estar pulled: `ollama pull qwen2.5:14b`.

### Update código del chat-server

```bash
ssh zeusgallo@192.168.68.65 '
cd ~/projects/cronos
git pull --rebase
launchctl unload ~/Library/LaunchAgents/com.cronos.chat-server.plist
sleep 1
launchctl load   ~/Library/LaunchAgents/com.cronos.chat-server.plist
'
```

## Troubleshooting

### "Chat widget no aparece en el sitio"

El widget hace health check al mount. Si falla, queda oculto.

1. ¿Responde `https://chat-api.sebastiangallo.com/api/health`?
   - **No** → tunnel/chat-server caídos en el mini. Ver siguiente sección.
   - **Sí, con 403/login redirect** → CF Access bloqueó. Loguéate primero a cronos.sebastiangallo.com.
   - **Sí, JSON OK** → bug del frontend, ver console del browser.

### "Chat empieza pero se cuelga"

```bash
ssh zeusgallo@192.168.68.65 'tail -50 ~/logs/chat-server.err'
```

Cosas comunes:
- Ollama no respondiendo → `ssh ... 'ollama list'` verifica modelo presente
- ffmpeg falla → audio no se genera, texto sí. Es un warning, no fatal.
- Memoria → M4/16GB con qwen 7B debería estar fine. Si laggea, mirá Activity Monitor.

### Tunnel desconectado

```bash
ssh zeusgallo@192.168.68.65 'tail -50 ~/logs/cloudflared.log'
```

Warnings de "control stream failure" son normales (CF rotación de connections). Si TODOS los IPs fallan = problema de red.

Restart tunnel: `launchctl unload && load com.cronos.cloudflared`.

### Mini reboot

Tras reboot del mini: si el user `zeusgallo` se auto-loguea, los services arrancan solos. Si no se auto-loguea, los services no arrancan hasta que el user logueé.

Para garantizar auto-login: System Settings → Users & Groups → Login Options → Automatic login: `zeusgallo`.

## Seguridad

### CF Access en chat-api.sebastiangallo.com (obligatorio)

Sin esto, cualquiera en internet puede usar tu Ollama gratis y costoso (electricity + wear). Configurar en CF Zero Trust dashboard:

- **Application domain**: chat-api.sebastiangallo.com
- **Policy**: Allow → Email = sebasgallo@gmail.com
- **Identity provider**: One-time PIN o Google OAuth

Las requests del frontend (`credentials: 'include'`) pasan la cookie de CF Access automáticamente, así que el chat sigue funcionando para vos sin cambios.

### Variar la voz TTS

`VOICE` env var en el plist. Valores válidos vía `say -v "?"`. Recomendados:
- `Sandy` (es_MX, default) — neural moderno
- `Mónica` (es_ES) — clásico
- `Paulina` (es_MX) — narrador clásico

## Métricas

`/api/health` retorna `uptime_sec`. Cada chat response incluye `total_ms` y `eval_count`. Sin Prometheus por ahora; los logs en `~/logs/` capturan request rate.

---

*Generado durante la sesión autónoma 2026-05-21.*
