# Android Maps API key

`app.config.js` reads `GOOGLE_MAPS_ANDROID_API_KEY` at configuration/build time.
Keep its value in the ignored local `.env` file and in the appropriate EAS
environment (`development`, `preview`, or `production`). Android EAS builds fail
with a clear error if the variable is missing. The web app uses OpenStreetMap
and does not need this variable in Vercel.

The previously committed key has been exposed. Removing it from the current
source does not revoke it or remove it from Git history.

In Google Cloud Console, restrict the current key immediately to Android apps
with package `com.mohsinali530121.syncnoxdriverapp` and the SHA-1 fingerprints
of the signing certificates used for the installed app builds. Restrict its
API access to Maps SDK for Android. Review its usage for unexpected traffic.

Create a replacement key with those restrictions. Set the new value in local
`.env` and the EAS environments, then rebuild and distribute the Android app.
Retire the old key after the replacement is deployed; disabling it sooner
will stop maps in installed builds that still use it.

Environment variables prevent committing the key to source. The Android Maps
SDK still embeds the value in the native app, so package/certificate and API
restrictions remain essential. Do not put the value in `EXPO_PUBLIC_*`, Expo
`extra`, client JavaScript, or `eas.json`.

References:
- https://developers.google.com/maps/api-security-best-practices
- https://docs.expo.dev/eas/environment-variables/
