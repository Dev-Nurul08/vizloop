# VizLoop

**Understand code as it runs.**

VizLoop is an interactive code-tracing learning experience that allows learners to follow execution step-by-step in JavaScript and Python. It visualizes the active statement, real-time variable mutations, call stacks, and multi-mode data representations (Array, Control Flow, and Value Conveyor Metaphor).

---

## Key Features

- **Universal Trace Protocol (UTP)**: Normalized, language-agnostic trace specification powering the visualization engine.
- **Multi-Language Trace Runners**: Safe, constrained AST-like pattern parsers for JavaScript and Python (no arbitrary execution).
- **3 Visual Learning Modes**:
  - **Array View**: Interactive cell blocks with active index indicators and qualification badges.
  - **Flow View**: State machine diagram showing branching logic and accumulator updates.
  - **Metaphor View**: Animated conveyor belt with threshold approval gates.
- **Dual Mentor Modes**: Toggle between **ELI5** (intuitive beginner-friendly explanations) and **Technical** (precise statement snapshots).
- **Gamified Learning**:
  - **XP & Daily Streaks**: Gain XP for completing quests and accurate predictions.
  - **Predict-Before-Reveal**: Challenge modals to test algorithmic intuition before seeing next-step state.
- **Interactive Workspace**:
  - Custom loop code editor with syntax highlighting and instant error diagnostics.
  - Browser-local learner profiles with guest mode and snippet saving/restoration.
  - Curriculum browser with quest milestones (Loops, Arrays, Searching, Sorting, Recursion).

---

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

### Run Automated Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## Architecture & Universal Trace Protocol

VizLoop is designed with clean architectural boundaries:

```
src/
├── trace-protocol.js      # Universal Trace Protocol definitions & display transformers
├── accumulation-trace.js  # Generic accumulation loop trace state machine
├── js-runner.js           # JavaScript syntax validator & UTP emitter
├── python-runner.js       # Python syntax validator & UTP emitter
├── lesson-library.js      # Built-in curriculum templates (Loops, Arrays)
├── main.js                # State management, UI rendering & user interactions
├── style.css              # Design system & shell layout
├── phase2.css             # Modals, dashboard, and snippet management
├── phase3.css             # Multi-mode visualizers (Array, Flow, Metaphor)
├── phase4.css             # Gamification (XP, streaks, skill cards)
├── phase5.css             # Curriculum browser
└── runner.css             # Custom code editor styles
```

---

## 11-Phase Project Roadmap

1. **Phase 1 (Mar 17)**: Project scaffold & Vite build pipeline
2. **Phase 2 (Mar 18)**: Universal Trace Protocol (UTP) specification
3. **Phase 3 (Mar 19)**: Accumulation trace engine & state tracking
4. **Phase 4 (Mar 20)**: JavaScript & Python language runners
5. **Phase 5 (Mar 21)**: Interactive lesson library & templates
6. **Phase 6 (Mar 22)**: UI shell, code editor panel & live syntax highlighter
7. **Phase 7 (Mar 24)**: Execution visualizer (Array, Flow, Metaphor modes)
8. **Phase 8 (Mar 25)**: Learner profile, local dashboard & snippet management
9. **Phase 9 (Mar 26)**: Gamification system (XP, streaks, predict-before-reveal)
10. **Phase 10 (Mar 27)**: Curriculum browser & quest progression
11. **Phase 11 (Mar 28)**: Complete test suite & project documentation

---

## License

MIT © Dev-Nurul
