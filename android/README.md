# Nexora Android Background Camera Backup Module

Native Kotlin Android app designed for zero-effort, automatic background backup of your phone's camera roll (`DCIM/Camera`) to your self-hosted Nexora personal cloud server (Arch Linux 500GB HDD).

## 🚀 Key Features

- **Jetpack WorkManager**: Reliable background execution that survives OS app-killing and system reboots.
- **Foreground Service**: Transparent notification progress indicator while uploads are in-flight.
- **SHA-256 Deduplication**: Room SQLite database tracks all previously uploaded photos/videos so duplicate uploads are 100% prevented.
- **Wi-Fi Only Toggle**: Configurable setting to save cellular mobile data.
- **Tailscale Ready**: Works seamlessly over private Tailscale VPN (`100.x.y.z`) from anywhere without opening firewall ports.

## 📱 How to Build and Install

### Prerequisites
- Android Studio Ladybug / Koala (or Android SDK command line tools with JDK 17)
- Android device running Android 8.0 (API 26) or higher

### Build Steps
1. Open the `/android` directory in Android Studio.
2. Let Gradle sync project dependencies.
3. Connect your Android phone via USB (or Wi-Fi debugging).
4. Run the app (`app` configuration).
5. Alternatively, build APK from terminal:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The generated APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Usage
1. Open the Nexora Backup app on your phone.
2. Grant camera and media permissions when prompted.
3. Enter your Arch Linux server Tailscale URL (e.g. `http://100.x.y.z:5000`) and your Nexora JWT Token.
4. Keep "Automatic Background Backup" enabled.
5. All new photos and videos taken with your camera will now automatically stream to your 500GB personal cloud HDD in the background!
