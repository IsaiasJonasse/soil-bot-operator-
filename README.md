# Soil Bot Operator

A mobile-first Expo app for managing a robotic field operation. The interface supports:

- live map tracking for a field robot
- field session creation and grid configuration
- environment telemetry monitoring
- offline record export/import
- Supabase-backed operator authentication

## Project overview

This app is designed for agricultural or field-robot workflows where an operator needs to:

- define the field layout
- monitor robot position and sensor health
- tag clone or crop varieties at given coordinates
- store records locally before sharing them between devices
- connect to a ROSBridge websocket for live robot input

## Tech stack

- Expo SDK 57 / React Native 0.86
- Expo Router
- TypeScript
- Supabase auth
- local persistence via SQLite on native and localStorage on web
- optional ROSBridge websocket data connection

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Then set the Supabase values in `.env.local`:

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

3. Validate the environment and app setup:

   ```bash
   npm run check
   ```

4. Start the app:

   ```bash
   npm start
   ```

   This starts Expo on localhost, which gives the web app a secure browser context for Supabase PKCE/WebCrypto. Use `npm run web` to open the web app. For a phone, use `npm run phone`; it uses Expo Tunnel so the phone does not need to reach your computer's LAN IP. Use `npm run phone:lan` only when the phone and computer can connect directly on the same local network.

   or use the platform-specific scripts:

   ```bash
   npm run android
   npm run ios
   npm run web
   ```

## Publish the web app with GitHub Pages

The `Deploy Expo web app to GitHub Pages` workflow builds and publishes the static web app whenever changes are pushed to `main`. In the GitHub repository:

1. Under **Settings → Pages**, set the build and deployment source to **GitHub Actions**.
2. Under **Settings → Secrets and variables → Actions → Variables**, add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are client-side Supabase values and are embedded in the public web bundle.
3. Push to `main` or run the workflow manually from **Actions**.

The site will be available at `https://<your-github-username>.github.io/soil-bot-operator-/`.

## App flow

- Sign in or sign up using Supabase auth
- To allow sign-in immediately after signup, disable **Confirm email** for the Email provider in the Supabase Dashboard under **Authentication → Providers → Email**. Supabase still validates email addresses and passwords.
- Create a field session from the setup screen
- Open the live map to view robot position and telemetry
- Use the environment panel for sensor summaries
- Export and import JSON or CSV records from the records screen

## Notes

- The ROSBridge URL is configured in the Field setup screen and defaults to a local LAN address.
- If Supabase is not configured, the auth UI still renders but the sign-in flow is disabled until the environment variables are set.
- The app supports demo telemetry when ROS is unavailable, which helps with UI testing and presentation.

## Validation commands

```bash
npm run lint
npm run typecheck
npm run check
```
