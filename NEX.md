# Drumcomputer (80drums) — Nex Code Instructions

## Projekt-Übersicht

- **App:** Web-basierter 80s/90s Drumcomputer (React SPA)
- **Live:** https://drums.schoensgibl.com/
- **Repo:** `git@github.com:hybridpicker/80drums.git`
- **Branch:** `main`

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | React 18.3.1 |
| Build Tool | Vite 5.4.1 |
| Styling | Tailwind CSS 3.4.11 |
| Audio | Web Audio API (100% synthetisch, keine Samples) |
| Tests | Vitest 3.2.4 + React Testing Library |
| Modul-System | ESM (type: "module") |

## Commit Message Convention

```
Fix: Beschreibung des Bugfixes
feat: Neues Feature
```

- Deutsche Commit-Messages sind Standard
- **NIEMALS** `Co-Authored-By` oder andere AI-Attributionen

## Git Staging Regeln

- **NIEMALS** `git add -A` oder `git add .` verwenden
- Immer nur spezifisch geänderte Dateien adden
- `dist/`, `node_modules/` werden NIEMALS committed

## Build & Development

```bash
npm install          # Dependencies installieren
npm run dev          # Dev-Server auf localhost:3032
npm run build        # Production Build → dist/
npm test             # Tests einmal laufen lassen
npm run test:watch   # Tests im Watch-Mode
npm run test:coverage # Tests mit Coverage (80%+ Threshold)
```

## Tests (MANDATORY)

- **222 Tests** in 19 Test-Dateien
- Tests MÜSSEN grün sein vor jedem Commit/Push
- Coverage-Threshold: 80%+
- Test-Dateien liegen neben ihren Quell-Dateien (`*.test.js`, `*.test.jsx`)

## Server Details

- **IP:** 94.130.37.43
- **User:** jarvis
- **Server-Pfad:** `/var/www/drums.schoensgibl.com`
- **Dist-Pfad (Nginx root):** `/var/www/drums.schoensgibl.com/dist/`
- **Web Server:** Nginx (statische Dateien, kein Node.js-Prozess)

## Deployment Workflow

### Automatisch (Two-Stage Pipeline)
1. Push auf `main` → Server erkennt Änderungen
2. Lokaler Monitor baut und deployed automatisch

### Manuell
```bash
# 1. Lokal bauen
npm run build

# 2. Dist auf Server hochladen
rsync -avz --delete dist/ jarvis@94.130.37.43:/var/www/drums.schoensgibl.com/dist/

# 3. Nginx neu laden
ssh jarvis@94.130.37.43 "sudo systemctl reload nginx"
```

### Verify
```bash
curl -s -o /dev/null -w "%{http_code}" https://drums.schoensgibl.com/
# Erwartet: 200
```

## Architektur (Detailliert)

```
src/
├── App.jsx                        # Root
├── components/
│   ├── Drumcomputer.jsx           # Haupt-Komponente (State, Layout)
│   ├── TrackGrid.jsx              # Step-Sequencer-Grid pro Track
│   ├── GroovePresets.jsx          # Preset-Buttons
│   ├── TempoSwing.jsx             # BPM/Swing Sliders
│   ├── LoopSettings.jsx           # Bars-Auswahl
│   ├── TimingTrainer.jsx          # Timing-Training Modi
│   ├── DroneSection.jsx           # Bass-Drone
│   ├── PatternManager.jsx         # Save/Load/Share/Export
│   └── EffectsPanel.jsx           # Reverb, Compressor, Voice-Params
├── audio/
│   ├── AudioEngine.js             # Web Audio Routing, Gain, Reverb
│   └── DrumSynths.js              # Synthesizer-Funktionen pro Instrument
├── hooks/
│   ├── useScheduler.js            # Audio-Scheduler (setInterval + RAF)
│   ├── useTimingTrainer.js        # Gap-Logik fuer Timing-Training
│   ├── useTapTempo.js             # Tap-Tempo Berechnung
│   ├── useKeyboardShortcuts.js    # Space, T, G, D, Cmd+Z/Shift+Z
│   └── useUndoRedo.js             # Undo/Redo Stack fuer Patterns
└── utils/
    ├── patternHelpers.js          # TRACKS, presets, seed, emptyPattern
    ├── patternStorage.js          # localStorage, URL-Hash, Slots
    └── wavExport.js               # Offline WAV-Rendering
```

## UI-Layout

1. **Header** — Titel, Met-Toggle, Dark Mode, Undo/Redo
2. **Transport-Bar** (eine Karte, 3 Zeilen):
   - Zeile 1: Tap | ▶ Start/Stop | Bars [1][2][3][4] | [▼ Tools]
   - Zeile 2: BPM-Slider | Swing-Slider
   - Zeile 3: Groove-Presets (scrollbar) | Clear
3. **Tools-Panel** (optional, öffnet zwischen Transport und Sequencer):
   - Timing Trainer | Drone | Patterns (3-spaltig)
   - Effects & Sound Design (volle Breite)
4. **Sequencer** — 8 Tracks mit M/S/C/P/Vol pro Track
5. **Footer** — Tastatur-Shortcuts

## Audio/Visual Sync

- Scheduler pusht `{step, time}` in `scheduleTimesRef`
- RAF-Loop liest `ctx.outputLatency` und zeigt Step wenn `time + outputLatency <= ctx.currentTime`
- Kein Look-Ahead-Offset im Playhead mehr

## Wichtige Regeln

- Dev-Port ist **3032** (nicht 3000!)
- Audio-Engine ist 100% synthetisch — keine externen Samples
- 8 Drum-Voices: Kick, Snare, Hi-Hat, Open Hat, Clap, Cymbal, Tom, Rimshot
- Deployment ist rein statisch (SPA) — kein Server-Side Rendering
- Keine Pre-Commit Hooks vorhanden — Tests manuell vor Push ausführen
- PWA-ready (site.webmanifest vorhanden)
