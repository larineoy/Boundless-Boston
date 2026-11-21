# Boundless Boston · Expo

Native iOS and Android companion to the existing Vite app. Built with Expo SDK 58, TypeScript, Expo Router, and React Native. It calls the existing FastAPI contract; there is no second backend or client-side fixture fallback.

## Start

```sh
cd mobile
npm install
npm start
```

Scan the Metro QR code with an Expo Go version that supports SDK 58. You can also run `npm run android` with an Android emulator, or `npm run ios` with an iOS simulator on macOS. `npm run web` offers a browser preview with an external map link in place of the native map.

By default the app calls `https://boundless-boston-api-5ze8.onrender.com`. This service can take about a minute to wake up. Server availability, live credentials, and quotas determine the results; demo data is labeled and connection failures have retry states.

## Local API

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the API **origin**, without `/api`:

- Physical phone: `http://YOUR_COMPUTER_LAN_IP:8000`. Use the same Wi-Fi network and allow port 8000 through the firewall.
- Android emulator: `http://10.0.2.2:8000`.
- iOS simulator or web browser: `http://localhost:8000`.

Start the API from the repository root:

```sh
python -m pip install -r backend/requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

The backend defaults to labeled demo mode. For **Expo web** against the local backend, include its origin in `CORS_ORIGINS` (typically `http://localhost:5173,http://localhost:8081`) before starting FastAPI. Native requests do not use browser CORS. Restart Metro after editing environment variables. Use HTTPS for production API endpoints.

## Screens

- **Tonight:** vibe search, upcoming time windows, budget, 5–45 minute walking limit, location permission, rain override, recommendations, source attributions, and score breakdowns. Pull to refresh or use Find my night to apply filters.
- **Around you:** native map of the origin and a 700-meter area circle, plus neighborhood notes. This is an area map, not a walking route. Google-derived venue markers are deliberately not drawn over Apple Maps.
- **Saved:** place IDs persist on the device. Venue content stays in memory during the session. Saved IDs absent from current session searches can be rediscovered with a new search or removed. Saved results are not a fresh hours or transit check.
- **Source details:** source states, timestamps, 311 date ranges and counts, business licenses, contacts, and provider credits. Missing data is shown explicitly.

The app requests foreground location only when the user presses the location control. Downtown Boston is the default when location is unavailable. Time choices are offsets from the next search, within the API's 24-hour limit, and display in the device's local time.

## Validation

```sh
npm run typecheck
npm run lint
npx expo-doctor
npm run export
```

## Installable builds

`eas.json` includes an internal preview profile (Android APK) and a production profile. Sign in to your Expo account and link the project before building:

```sh
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform android
```

Set `ANDROID_GOOGLE_MAPS_API_KEY` for native Android maps and restrict that Maps SDK key to the app package and signing certificate. This is separate from the server-only Places credential. Without it an installed Android app offers an external map link; Expo Go uses its bundled map configuration. iOS uses Apple Maps. Configure environment variables in the Expo build environment as well as locally. Choose your final app identifiers in `app.config.ts` before distributing.

References: [Expo Router setup](https://docs.expo.dev/router/installation/), [native map configuration](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/), [foreground location](https://docs.expo.dev/versions/v58.0.0/sdk/location/).
