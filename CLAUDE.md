# Drumcomputer - Claude Code Projekt-Regeln

## Attribution Policy

**NIEMALS `Co-Authored-By` Zeilen in Git Commits verwenden.**

- Kein `Co-Authored-By: Claude` oder aehnliche Trailer
- Kein anderer Co-Author Trailer jedweder Art
- Commit Messages sind rein inhaltlich - nur die Aenderung beschreiben

## Projekt

- Vite 5 + React 18 + Tailwind CSS 3
- Web Audio API (keine externen Samples, alle Sounds synthesized)
- Tests: Vitest + React Testing Library + happy-dom
- 222 Tests in 19 Test-Dateien, Ziel: >90% Coverage

## Architektur

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

## UI-Layout (Stand Feb 2026)

1. **Header** — Titel, Met-Toggle, Dark Mode, Undo/Redo
2. **Transport-Bar** (eine Karte, 3 Zeilen):
   - Zeile 1: Tap | ▶ Start/Stop | Bars [1][2][3][4] | [▼ Tools]
   - Zeile 2: BPM-Slider | Swing-Slider
   - Zeile 3: Groove-Presets (scrollbar) | Clear
3. **Tools-Panel** (optional, oeffnet zwischen Transport und Sequencer):
   - Timing Trainer | Drone | Patterns (3-spaltig)
   - Effects & Sound Design (volle Breite)
4. **Sequencer** — 8 Tracks mit M/S/C/P/Vol pro Track
5. **Footer** — Tastatur-Shortcuts

## 8 Tracks

Kick, Snare, Hi-Hat, Open Hat, Clap, Cymbal, Tom, Rimshot

## Audio/Visual Sync

- Scheduler pushte `{step, time}` in `scheduleTimesRef`
- RAF-Loop liest `ctx.outputLatency` und zeigt Step wenn `time + outputLatency <= ctx.currentTime`
- Kein Look-Ahead-Offset im Playhead mehr

## Konventionen

- Deutsche Commit Messages sind OK
- `npm test` muss vor jedem Commit gruen sein
- Port ist **3032** (`npm run dev`, NICHT `npm start`)
- Deployment: `npm run build` → `rsync dist/` → `nginx reload`
