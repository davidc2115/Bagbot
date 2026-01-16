export default {
  expo: {
    name: "Boys & Girls",
    slug: "roleplay-chat-app",
    version: "5.0.7",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#0a0a12"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.boysandgirls.chat"
    },
    android: {
      package: "com.boysandgirls.chat",
      versionCode: 50007,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE"
      ],
      usesCleartextTraffic: true
    },
    extra: {
      eas: {
        projectId: "roleplay-chat-app"
      }
    },
    plugins: []
  }
};
