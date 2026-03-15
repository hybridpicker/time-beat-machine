# 🥁 Drumcomputer V2 – Agent Team Mode Enhancement Prompt

## Projekt
- **Repo:** `/Users/lukasschonsgibl/Coding/drumcomputer`
- **Stack:** React + Vite + Tailwind CSS + Web Audio API
- **Live:** https://drums.schoensgibl.com
- **Hauptdatei:** `src/Drumcomputer.jsx` (~1060 Zeilen, Monolith)

## Ziel
Upgrade des bestehenden 80s/90s Drumcomputers zu einer **Feature-Complete Web Drum Machine** auf dem Niveau von Drumhaus/SEQ-16. Priorisiert nach Impact.

## Architektur-Refactoring (ZUERST)
Die 1060-Zeilen Monolith-Datei `Drumcomputer.jsx` MUSS aufgeteilt werden:

```
src/
├── components/
│   ├── Drumcomputer.jsx        (Main orchestrator, state management)
│   ├── TrackGrid.jsx           (Step sequencer grid per track)
│   ├── TransportControls.jsx   (Play/Stop/Tap Tempo)
│   ├── GroovePresets.jsx       (Preset buttons)
│   ├── TempoSwing.jsx          (BPM/Swing sliders)
│   ├── LoopGaps.jsx            (Bars/Practice Gaps)
│   ├── DroneSection.jsx        (Drone controls)
│   ├── MixerPanel.jsx          (NEU: Per-Track Volume/Pan/Mute/Solo)
│   ├── EffectsPanel.jsx        (NEU: Master FX chain)
│   ├── PatternManager.jsx      (NEU: Save/Load/Share patterns)
│   └── ExportPanel.jsx         (NEU: WAV/MIDI export)
├── audio/
│   ├── AudioEngine.js          (AudioContext management, scheduling)
│   ├── DrumSynths.js           (Kick/Snare/Hat/Cymbal + neue Voices)
│   ├── EffectsChain.js         (Reverb/Delay/Compressor/Drive)
│   └── NoiseBufferCache.js     (Cached noise buffers)
├── hooks/
│   ├── useAudioEngine.js       (Audio context hook)
│   ├── useScheduler.js         (Step scheduling logic)
│   ├── usePatternState.js      (Pattern state + undo/redo)
│   └── useKeyboardShortcuts.js
├── utils/
│   ├── patternHelpers.js       (seed, every, mix, resize, presets)
│   ├── midiExport.js           (MIDI file generation)
│   └── audioExport.js          (WAV rendering)
├── App.jsx
├── main.jsx
└── index.css
```

## Feature-Prioritäten (in Reihenfolge implementieren)

### Phase 1: Core Audio & Mixer (Höchster Impact)
1. **Per-Track Volume Slider** – Jeder der 4 Tracks (Kick/Snare/Hat/Cymbal) bekommt einen Volume-Slider (0-100%). GainNode pro Track.
2. **Per-Track Mute/Solo** – Mute-Button pro Track (visuell gedimmt), Solo-Button (alle anderen muten).
3. **3-stufige Velocity pro Step** – Statt nur an/aus: Off → Normal → Accent (3 Clicks durchzyklen). Visuelle Unterscheidung: leer | gefüllt | gefüllt+Ring. Accent = 1.5x Lautstärke.
4. **Noise Buffer Caching** – `makeNoiseBuffer()` wird aktuell bei JEDEM Snare/Hat/Cymbal-Trigger neu erzeugt. Cache erstellen beim AudioContext-Init: `noiseBuffers = { short: ..., medium: ..., long: ... }` und BufferSource mit `buffer` referenzieren statt jedes Mal neu zu generieren.
5. **Mehr Drum Voices** (8 statt 4) – Zusätzlich: Open Hi-Hat, Clap, Tom, Rimshot. Jeder mit eigenem Synthesized Sound:
   - **Open Hi-Hat:** Längerer Noise-Burst (200ms) mit Bandpass bei 8kHz
   - **Clap:** Mehrere kurze Noise-Bursts hintereinander (4x 15ms mit 10ms Gap), Bandpass 1-3kHz
   - **Tom:** Sine sweep von 200Hz → 80Hz, 150ms Decay
   - **Rimshot:** Kurzer Sine-Burst 800Hz + Noise, 50ms total

### Phase 2: Pattern Management & Export
6. **Pattern Save to LocalStorage** – "Save" Button speichert aktuelles Pattern (alle Tracks + BPM + Swing + Bars) in LocalStorage. Bis zu 16 Slots. "Load" Dropdown zum Laden.
7. **URL Pattern Sharing** – Pattern als komprimierter URL-Parameter encodieren (Base64 der Pattern-Daten). "Share" Button kopiert URL in Clipboard.
8. **WAV Export** – OfflineAudioContext verwenden um das Pattern einmal komplett offline zu rendern und als WAV herunterzuladen. Button "Export WAV". Rendert exakt `bars * (60/BPM) * 4` Sekunden Audio.
9. **Click-Drag Step Entry** – MouseDown startet, MouseMove über weitere Steps togglet diese auch. Verhindert mühsames Einzelklicken. `onMouseDown` setzt Flag + togglet, `onMouseEnter` (bei gedrückter Maus) togglet weitere Steps.

### Phase 3: Effects & Sound Design
10. **Master Effects Chain** – Audio-Routing: Alle Tracks → MasterGain → Reverb (ConvolverNode) → Compressor (DynamicsCompressorNode) → Destination. UI: 3 Slider: Reverb Amount, Compressor Threshold, Master Volume.
11. **Per-Voice Tuning** – Slider pro Drum Voice für Pitch/Tune: Kick Pitch (40-200Hz), Snare Tone, Hat Freq, etc. Simpel: 1 Slider pro Voice der den Hauptparameter steuert.
12. **Per-Voice Decay** – Slider pro Voice für Decay-Länge. Kurz → Lang.

### Phase 4: UX Polish
13. **Dark Mode** – Toggle Button in Header. Tailwind `dark:` classes. Speichert Preference in LocalStorage. Dunkles Theme: `bg-neutral-950`, `text-neutral-100`, glassmorphism borders `border-white/10`.
14. **Undo/Redo** – History-Stack für Pattern-Changes. Ctrl+Z / Ctrl+Shift+Z. Max 50 States.
15. **Copy/Paste Pattern per Track** – Rechtsklick oder Button: Copy Track Pattern → Paste auf anderen Track.
16. **Visual Feedback bei Trigger** – Kurzes Flash/Pulse auf dem Track-Label oder einem kleinen LED-Indikator wenn ein Sound getriggert wird (CSS animation, kein JS re-render).
17. **PWA Support** – manifest.json + Service Worker für Offline-Nutzung. Installierbar auf Homescreen.
18. **Metronom-Option** – Optionaler Click-Track (Woodblock-Sound auf Beat 1 und 3, leiser auf 2 und 4).

## Wichtige technische Hinweise
- **Web Audio API Timing:** Scheduler-Architektur beibehalten (setInterval + lookahead). Nicht auf requestAnimationFrame für Audio-Timing wechseln.
- **Refs für Live-Playback:** Pattern-Refs (`kickRef`, etc.) MÜSSEN beibehalten werden damit Live-Editing während Playback funktioniert. Neue Tracks brauchen eigene Refs.
- **Mobile First:** Alle neuen UI-Elemente müssen auf 375px Breite funktionieren. Collapsible Sections Pattern beibehalten.
- **Performance:** React.memo für TrackGrid. useMemo für abgeleitete Werte. Keine unnötigen Re-Renders im Sequencer.
- **Sound Design:** Alle Sounds bleiben synthesized (Web Audio API Oscillators + Noise). KEINE Samples/Audio-Files laden.
- **Deployment:** Auto-Deploy via Webhook ist bereits konfiguriert. Nach `npm run build` wird automatisch deployed.

## Design-Prinzipien
- Minimalistisch, clean, glassmorphism Stil beibehalten
- Farbcoding pro Track beibehalten (Emerald=Kick, Rose=Snare, Sky=Hat, Amber=Cymbal)
- Neue Tracks: Violet=Open Hat, Pink=Clap, Teal=Tom, Orange=Rim
- Keine externen UI-Libraries (kein shadcn, kein MUI). Nur Tailwind.
- Footer Credit "Vibe Coded with Claude" beibehalten

## Reihenfolge der Arbeit
1. Architektur-Refactoring (Dateien aufteilen, gleiche Funktionalität)
2. Testen dass alles noch funktioniert
3. Phase 1 implementieren
4. Testen
5. Phase 2 implementieren
6. Testen
7. Phase 3 implementieren
8. Testen
9. Phase 4 implementieren
10. Final Test + Build
