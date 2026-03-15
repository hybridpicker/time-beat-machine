# 🎯 Timing Trainer Redesign – Agent Team Mode Prompt

## Projekt
- **Repo:** `/Users/lukasschonsgibl/Coding/drumcomputer`
- **Hauptdatei:** `src/Drumcomputer.jsx`
- **Betroffener Bereich:** Practice Gaps Feature → wird zu "Timing Trainer"

## Kontext
Der aktuelle "Practice Gaps" Bereich verwendet abstrakte Parameter ("Every N bars / Gap M bars") die für Übende verwirrend sind. Das Feature wird komplett redesigned zu einem **Timing Trainer** mit vordefinierten Übungsmodi und einem klaren visuellen Feedback-System.

## Was sich ändert

### 1. Naming & UI-Konzept
- **Alt:** "Practice Gaps" mit Checkbox + 2 Slidern (Every: 2-8, Gap: 1-4)
- **Neu:** "Timing Trainer" Card mit Preset-Buttons + optionalem Custom-Modus
- Die Card ersetzt den bisherigen "Loop & Gaps" Bereich ODER wird ein eigener 5. Bereich
- Collapsible auf Mobile beibehalten (default collapsed)

### 2. Preset-Modi (als Buttons, nur einer aktiv, nochmal klicken = deaktivieren)

| Preset | Label | Play | Silence | Beschreibung (Tooltip/Subtext) |
|--------|-------|------|---------|-------------------------------|
| Call & Response | 🎤 Call & Response | 2 Bars | 2 Bars | "Hör zu, dann spiel weiter" |
| Steady Gap | 🕳️ Steady Gap | 3 Bars | 1 Bar | "Kurze Stille, halte den Groove" |
| Deep Dive | 🏊 Deep Dive | 2 Bars | 4 Bars | "Wenig Referenz, viel Eigenarbeit" |
| Check-In | ✅ Check-In | 1 Bar | 3 Bars | "Minimaler Check, maximale Unabhängigkeit" |
| Fade Away | 📉 Fade Away | Progressiv | Progressiv | "Immer weniger Referenz" |
| Custom | ⚙️ Custom | Slider | Slider | "Eigene Einstellung" |

### 3. Fade Away Modus (besonderer Modus)
Dieser Modus ist NICHT zyklisch wie die anderen, sondern progressiv:
- Durchlauf 1: 4 Bars Play, 1 Bar Silence
- Durchlauf 2: 3 Bars Play, 2 Bars Silence  
- Durchlauf 3: 2 Bars Play, 3 Bars Silence
- Durchlauf 4: 1 Bar Play, 4 Bars Silence
- Dann Loop ab Durchlauf 4

Implementation: Statt `gapEveryBars`/`gapLengthBars` als fixe Werte, einen `fadePhase` Counter der nach jedem vollen Zyklus hochzählt. Die `isInGap()` Funktion muss den aktuellen Phase-Index berücksichtigen.

### 4. Custom Modus
Wenn "Custom" ausgewählt ist, erscheinen die 2 Slider (wie bisher):
- "Play: X Bars" (1-8)
- "Silence: X Bars" (1-8)
Aber mit besseren Labels statt "Every" und "Gap".

### 5. WICHTIGSTES FEATURE: UI-Farbwechsel bei Stille-Phase

Wenn der Timing Trainer aktiv ist und die aktuelle Position in einer **Stille-Phase** liegt:

**Das gesamte Hintergrund-Gradient des `min-h-screen` Containers wechselt:**
- **Normal (Play):** `from-zinc-50 via-neutral-50 to-stone-50` (wie jetzt)
- **Stille:** `from-amber-50/40 via-orange-50/30 to-yellow-50/40` (warmer, sanfter Glow)

**Zusätzlich:**
- Der Sequencer-Container bekommt bei Stille einen subtilen `ring-2 ring-amber-300/50` 
- Ein kleines Badge erscheint oben rechts im Sequencer: "🎧 Dein Turn" (bei Play-Phase: "🔊 Listen")
- Transition zwischen den Zuständen: `transition-colors duration-500` für sanften Übergang (nicht abrupt!)

**NICHT ändern bei Stille:**
- Die Step-Buttons behalten ihre Farben (man soll weiter editieren können)
- Transport-Buttons bleiben gleich
- Keine Flash/Blink Animationen (zu ablenkend beim Üben)

### 6. State-Management

```javascript
// Neuer State statt gapEveryBars/gapLengthBars/gapsEnabled:
const [trainerMode, setTrainerMode] = useState(null); // null | 'callResponse' | 'steadyGap' | 'deepDive' | 'checkIn' | 'fadeAway' | 'custom'
const [customPlay, setCustomPlay] = useState(3);  // Bars to play (custom mode)
const [customSilence, setCustomSilence] = useState(1); // Bars of silence (custom mode)
const [fadePhase, setFadePhase] = useState(0); // For fadeAway mode: 0-3

// Derived: aktuelle Play/Silence Config basierend auf Mode
const trainerConfig = useMemo(() => {
  if (!trainerMode) return null;
  switch (trainerMode) {
    case 'callResponse': return { play: 2, silence: 2 };
    case 'steadyGap': return { play: 3, silence: 1 };
    case 'deepDive': return { play: 2, silence: 4 };
    case 'checkIn': return { play: 1, silence: 3 };
    case 'fadeAway': return getFadeConfig(fadePhase); // {play: 4-fadePhase, silence: 1+fadePhase}
    case 'custom': return { play: customPlay, silence: customSilence };
    default: return null;
  }
}, [trainerMode, fadePhase, customPlay, customSilence]);

// Helper für Fade Away
function getFadeConfig(phase) {
  const clampedPhase = Math.min(phase, 3);
  return { play: 4 - clampedPhase, silence: 1 + clampedPhase };
}

// Neue isInGap() Logik:
const isInGap = (absoluteStep) => {
  if (!trainerConfig) return false;
  const { play, silence } = trainerConfig;
  const cycleLength = play + silence; // in Bars
  const barIndex = Math.floor(absoluteStep / STEPS_PER_BAR);
  const cyclePos = barIndex % cycleLength;
  return cyclePos >= play; // Silence Phase wenn Position >= play bars
};

// Für UI-Farbwechsel: aktuell in Stille?
const isCurrentlyInSilence = useMemo(() => {
  if (!trainerConfig || !isPlaying) return false;
  return isInGap(uiStep);
}, [trainerConfig, isPlaying, uiStep]);

// Fade Away: Phase hochzählen nach jedem vollen Zyklus
// Im Scheduler: wenn currentStep den Anfang eines neuen Zyklus erreicht
// und trainerMode === 'fadeAway', fadePhase incrementieren (max 3)
```

### 7. Refs aktualisieren
Die bisherigen Refs `gapsEnabledRef`, `gapEveryBarsRef`, `gapLengthBarsRef` werden ersetzt durch:
- `trainerConfigRef` – wird im Scheduler gelesen
- Update: `useEffect(() => { trainerConfigRef.current = trainerConfig; }, [trainerConfig]);`

### 8. UI Layout für den Timing Trainer Bereich

```
┌──────────────────────────────────────┐
│ 🎯 Timing Trainer          [Badge]  │
│                                      │
│ [🎤 Call&Resp] [🕳️ Steady] [🏊 Deep]│
│ [✅ Check-In] [📉 Fade]  [⚙️Custom] │
│                                      │
│ (wenn Custom aktiv:)                 │
│ Play:    ═══●═══════  3 Bars         │
│ Silence: ═●═════════  1 Bar          │
│                                      │
│ ℹ️ "Hör zu, dann spiel weiter"       │
└──────────────────────────────────────┘
```

- Preset-Buttons: 3x2 Grid, toggle-style (aktiver = `bg-neutral-900 text-white`, inaktiv = `bg-neutral-100/60`)
- Custom Slider nur sichtbar wenn Custom aktiv
- Beschreibungstext unten ändert sich je nach aktivem Modus
- Badge oben rechts zeigt aktuellen Status: "Aus" / "🔊 Play 2/2" / "🎧 Stille 1/2"

### 9. Migration der bestehenden Logik
- `gapsEnabled` → `trainerMode !== null`
- `gapEveryBars` → `trainerConfig.play + trainerConfig.silence`  
- `gapLengthBars` → `trainerConfig.silence`
- Die `isInGap()` Funktion im Scheduler wird angepasst (siehe oben)
- Alle Refs die auf gap-Variablen zeigen werden auf trainerConfig umgestellt

### 10. Keyboard Shortcut
- Taste `G` togglet den zuletzt aktiven Trainer-Modus an/aus (wie ein Quick-Toggle)

## Technische Constraints
- Kein Breaking Change am Audio-Scheduler. Die `isInGap()` Funktion wird nur intern geändert.
- `trainerConfigRef` MUSS als Ref existieren für den Scheduler (Stale Closure vermeiden)
- Farbwechsel NUR über Tailwind Classes + State, kein direktes DOM-Manipulation
- Transition `duration-500` für den Hintergrundwechsel (nicht zu schnell, nicht zu langsam)
- Mobile: Preset-Buttons müssen touch-friendly sein (min 44px Höhe)
- Fade Away Phase-Counter muss beim Stop zurückgesetzt werden

## Dateien die geändert werden
1. `src/Drumcomputer.jsx` – Hauptänderungen (State, UI, isInGap Logik)
2. `src/index.css` – Ggf. Transition-Klassen für den Farbwechsel
