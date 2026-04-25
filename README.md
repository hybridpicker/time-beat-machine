# Time Beat Machine

> Practice your inner clock with a real groove behind you.

**Time Beat Machine** is a browser-based timing practice tool and synthesized beat sequencer for drummers and musicians. The core idea: program a groove, activate the Timing Trainer, and the machine cuts out at regular intervals — forcing you to hold the beat on your own.

**[Try it live → drums.schoensgibl.com](https://drums.schoensgibl.com)**

---

## Why Time Beat Machine?

Most metronomes give you a click. That's useful — but it doesn't train your *independence*. Time Beat Machine lets you build a groove you actually want to play along with, then progressively removes the reference. The machine goes silent; you keep going. That gap is where your inner clock either holds or drifts.

Useful for:
- Drummers practicing independence and time-feel
- Musicians learning to lock in without a click
- Jazz players working on swing and bebop feels
- Anyone who wants to internalize a groove rather than just follow one

---

## Timing Trainer

The core feature. Activate from the Tools panel or press `G`.

| Mode | Play | Gap | Description |
|------|------|-----|-------------|
| Call & Response | 2 bars | 2 bars | Listen, then keep going |
| Steady Gap | 3 bars | 1 bar | Short drop-out, hold the groove |
| Deep Dive | 2 bars | 4 bars | Minimal reference |
| Check-In | 1 bar | 3 bars | Maximum independence |
| Fade Away | auto | auto | Less and less reference over time |
| Custom | 1–8 | 1–8 | Your own ratio |

The sequencer dims and the background shifts during silence — a clear visual cue that it's your turn.

---

## Beat Sequencer

8 synthesized tracks, no sample files:

| Track | Synthesis |
|-------|-----------|
| Kick | Sine sweep 120→40 Hz |
| Snare | White noise + triangle body |
| Hi-Hat | Bandpass noise 8 kHz |
| Open Hat | Same as hi-hat, longer decay |
| Clap | Noise burst with short attack |
| Cymbal / Ride | Highpass + bandpass noise, 1.5s decay |
| Tom | Sine sweep, lower frequency |
| Rimshot | Short click + noise |

**13 groove presets** including three jazz-specific patterns:

- **Jazz Swing** — straight-ahead ride pattern for standards, Solar, and jazz blues, with feathered kick and hi-hat on 2&4.
- **Bebop** — classic ride cymbal pattern (8th notes + hi-hat on 2&4). Set Swing 40–55% for the authentic triplet feel.
- **Jazz Modern** — post-bop displaced kicks, comping snare, open texture (Tony Williams / Jack DeJohnette style)

---

## All Features

- **Up to 4 bars**, 16 steps per bar (64 steps total)
- **3-level velocity**: off → hit → accent (click-cycle)
- **BPM 50–220**, tap tempo (`T`) or direct click-edit
- **Swing 0–60%**
- **Per-track mixer**: Volume, Mute, Solo, Copy, Paste
- **Effects**: Reverb mix, Compressor (threshold/ratio), Voice params (Tune/Decay per track)
- **Pattern management**: 8 named save slots, URL sharing, WAV export
- **Undo/Redo** (`Cmd+Z` / `Cmd+Shift+Z`)
- **Dark mode** (`D`)
- **Metronome** click track
- **Mobile optimised** — bar-tab navigation, 44px touch targets
- **PWA** — installable, works offline

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / Stop |
| `T` | Tap Tempo |
| `G` | Toggle Timing Trainer (last mode) |
| `D` | Toggle Dark Mode |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |

*Click directly on BPM value to edit tempo*

---

## Local Development

```bash
git clone https://github.com/hybridpicker/time-beat-machine.git
cd time-beat-machine
npm install
npm run dev       # → http://localhost:3032
```

```bash
npm test          # 226 tests (Vitest + React Testing Library)
npm run build     # production build → dist/
```

**Requirements:** Node 18+

---

## Stack

- [React 18](https://react.dev) + [Vite 5](https://vitejs.dev)
- [Tailwind CSS 3](https://tailwindcss.com)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com)

No backend. No samples. No dependencies beyond the browser.

---

## License

MIT — © [Lukas Schönsgibl](https://schoensgibl.com)
