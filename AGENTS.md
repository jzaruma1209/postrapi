# Expo SDK 54 + React Native 0.81.5 (win32)

Read **https://docs.expo.dev/versions/v54.0.0/** before writing code.

## Project state

- Default Expo starter — no routing, state management, or custom config.
- **`newArchEnabled: true`** in `app.json` (Fabric new architecture).
- TypeScript strict mode via `tsconfig.json`.
- Zero test, lint, formatter, or typecheck tooling installed or configured.

## Commands

| Action | Command |
|--------|---------|
| Start dev | `npm start` |
| Web | `npm run web` |
| Android | `npm run android` |
| iOS | `npm run ios` |

## Key files

| File | Role |
|------|------|
| `index.ts` | Entrypoint — calls `registerRootComponent(App)` |
| `App.tsx` | Root component (default starter view) |
| `app.json` | Expo config |
| `.claude/settings.json` | Enables `expo@claude-plugins-official` plugin |
| `CLAUDE.md` | Redirects to this file (`@AGENTS.md`) |

## Notes

- Platform is **Windows (win32)** — native builds require Windows-compatible tooling.
- No CI workflows, no pre-commit hooks, no script beyond the four above.
- Native output dirs (`/ios`, `/android`) are gitignored; regenerate with `npx expo prebuild`.
