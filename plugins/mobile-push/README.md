# JType mobile push adapter

This internal Tauri plugin owns only native APNs/FCM registration and the
conversion of a remote-notification tap into JType's canonical document URL.
The root React app consumes that URL through the same vault/document operations
as Desktop; the plugin does not own navigation or UI.

Android expects `src-tauri/gen/android/app/google-services.json` at release
configuration time. The app Gradle script applies the Google Services plugin
only when that untracked file exists, so builds without Firebase credentials
remain valid and registration reports `missingFirebaseConfiguration`. Android
uses the current Firebase Installation ID registration contract (`register` /
`onRegistered`) and sends the resulting FID to the authenticated service API.

iOS requests notification authorization and an APNs device token directly. A
signed provisioning profile must include the `aps-environment` entitlement;
unsigned Simulator archives report identifier unavailability and are not
evidence of APNs registration.
