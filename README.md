# VizLoop

**Understand code as it runs.**

VizLoop is a React and Three.js learning environment for school and college students. Learners sign in, choose a concept from the Learning Hub, paste or load a supported program, and watch VizLoop turn code into a safe execution trace, 3D motion, algorithm, flowchart, mentor explanation, prediction quest, and final answer.

## Main Features

- **Program analyzer**: Detects supported JavaScript and Python classroom programs without executing arbitrary code.
- **3D execution view**: Shows counters, array values, conditions, and output as animated objects.
- **Generated algorithm and flowchart**: Converts the trace into clear human-readable steps and a decision flow.
- **Beginner and technical mentor modes**: Explains each statement in simple terms or as a precise state snapshot.
- **Prediction quest**: Lets learners guess the next value before revealing the trace.
- **Final answer panel**: Shows exactly what the program prints or computes and why.
- **Guidebook modules**: Splash screen, auth/onboarding shell, Learning Hub, Skill Assessment, Learning Games, and profile/setup view.
- **URL-driven navigation**: Hub concepts, games, assessment, and visualizer trace steps are deep-linkable with hash routes.

## Supported Starter Patterns

- JavaScript and Python loops that print a counter, such as printing 1 to 10.
- JavaScript and Python array accumulation loops with a numeric threshold condition, such as adding scores greater than 5.

The runners are deliberately constrained for classroom safety. Unsupported code is rejected with guidance instead of being executed.

## 10-Phase Workflow

1. Code intake
2. Format scan
3. Concept detection
4. Trace build
5. 3D motion map
6. Step mentor
7. Algorithm draft
8. Flowchart draft
9. Prediction quest
10. Final result

## Guidebook Extension Modules

- **Module A - Splash**: Lightweight block animation using the product's own array visual language, with a progress bar and skip behavior.
- **Module B - Auth**: Demo-local signup/login/logout and onboarding flow, shaped for future Supabase/Auth.js/Clerk integration.
- **Module C - Skill Assessment**: Versioned MCQ question bank, randomized display order, timed session, scoring, topic breakdown, history, and weak-topic routing.
- **Module D - Learning Games**: Six practice games, with the first set playable through shared validation helpers.
- **Module E - Learning Hub**: Single config-driven concept tree with search, concept details, subtopics, related concepts, progress states, and two-click navigation.

## Quick Start

```bash
npm install
npm run dev
```

Run the automated tests:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

## Architecture

```text
src/
  App.jsx                React product shell and learning workflow
  ExecutionScene.jsx     Three.js execution animation
  product-content.js     Product strings, concept tree, question bank, games, env guide
  assessment-engine.js   Assessment session, timing, answer, and scoring helpers
  game-engine.js         Game validation helpers
  progress-store.js      Demo-local profile/session/progress persistence
  routing.js             Hash-route parse/build helpers
  program-analysis.js    Lesson builder, workflow phases, reports, samples
  trace-protocol.js      Universal Trace Protocol helpers
  accumulation-trace.js  Array accumulator trace state machine
  counting-trace.js      Counter loop trace state machine
  js-runner.js           JavaScript pattern analyzer
  python-runner.js       Python pattern analyzer
  lesson-library.js      Legacy lesson templates used by tests
  style.css              Responsive product styling
test/
  trace-runners.test.js
  guidebook-modules.test.js
  lesson-library.test.js
  program-analysis.test.js
```

## Notes

VizLoop is currently a frontend MVP with local browser storage for demo profile/session state, XP, progress, assessment attempts, and game outcomes. The UI and environment plan are prepared for a managed backend, but production auth, httpOnly cookies, Postgres persistence, server-side assessment scoring, and sandbox execution require provider accounts and secrets.

## License

MIT
