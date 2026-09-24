# OA Scout — Osteoarthritis Early Detection App

A clinical-grade mobile application for field health workers in areas with intermittent connectivity.
Built with **React Native (Expo SDK 57)**.

---

## Features

| Feature | Implementation |
|---|---|
| Dynamic Questionnaire | Markdown `.md` DSL → parsed to typed React Native widgets |
| Offline-First Storage | SQLite via `expo-sqlite` |
| Background Sync | `expo-background-fetch` + exponential backoff queue |
| ArUco ROM Tracking | `romCalculator.ts` (OpenCV native module for production) |
| Medical History | Photo capture via `expo-camera` + `expo-image-picker` |
| Multilingual | EN / हिंदी / தமிழ் via `i18n-js` + `expo-localization` |
| State Management | Zustand (persisted via AsyncStorage) |

---

## Project Structure

```
oa_scout/
├── assets/
│   ├── questionnaires/        ← .md questionnaire files (EN, HI, TA)
│   └── i18n/translations.json ← Translations for 3 locales
├── src/
│   ├── core/
│   │   ├── syncManager.ts     ← Offline sync orchestrator
│   │   ├── questionnaireParser.ts ← Markdown → QuestionModel
│   │   └── romCalculator.ts   ← ArUco joint angle math
│   ├── db/
│   │   ├── database.ts        ← SQLite schema init
│   │   ├── assessmentDao.ts   ← CRUD for patients & assessments
│   │   └── syncQueueDao.ts    ← Sync queue operations
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── AssessmentWizardScreen.tsx (5-step wizard)
│   │   ├── SyncQueueScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   └── QuestionnaireRenderer.tsx ← Dynamic question widgets
│   ├── store/useAppStore.ts    ← Zustand global store
│   ├── i18n/index.ts           ← i18n config
│   └── theme/index.ts          ← Clinical design tokens
└── App.tsx                     ← Entry point + navigation
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- Expo Go app on Android / iOS for testing

### Install
```bash
npm install
```

### Run (Mobile — Expo Go)
```bash
npx expo start
```
Scan the QR code with Expo Go on your phone.

### Run (Web — Development)
```bash
npx expo start --web
```

### Run (Android Emulator)
```bash
npx expo start --android
```

---

## Questionnaire Format

Questionnaires live in `assets/questionnaires/`. Use this DSL:

```markdown
# Section: <Title>

## <ID> | <type> | [required|optional] | [key:value ...]
Question prompt text
- Option 1 (for radio/multiselect)
- Option 2

# Types:    radio | multiselect | scale | text
# Attrs:    min:0 | max:10 | minLabel:... | maxLabel:... | maxLength:500
# Logic:    dependsOn:Q1 | showIf:Value1,Value2
```

---

## Adding a New Language

1. Add a locale key to `assets/i18n/translations.json`
2. Add a questionnaire file: `assets/questionnaires/oa_questionnaire_<lang>.md`
3. Register the locale in `src/i18n/index.ts` `SUPPORTED_LOCALES`

---

## Backend Sync API

The sync manager POSTs to `/assessments/sync` with the full assessment payload.

**Expected response:** `201 Created` or `409 Conflict` (treated as already-synced).

Update `API_ENDPOINT` in `src/core/syncManager.ts` with your backend URL.

---

## Production Considerations

| Item | Action |
|---|---|
| ArUco Tracking | Integrate a React Native OpenCV native module (TurboModule) |
| Camera Calibration | Run per-device checkerboard calibration, store intrinsics |
| Auth | Add JWT token via `expo-secure-store`, send in sync request headers |
| Certificate Pinning | Add `@cert-pinning/expo` for field-grade security |
| Crash Reporting | Integrate Sentry with `@sentry/react-native` |
| OTA Updates | Use `expo-updates` for questionnaire and bugfix rollouts |
