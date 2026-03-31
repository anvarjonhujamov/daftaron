export default {
  expo: {
    name: 'Daftaron',
    slug: 'daftaron',
    scheme: 'daftaron',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'uz.daftaron.app',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      permissions: []
    },
    extra: {
      apiBaseUrl: 'https://daftaron.firstcoder.uz/api/v1',
      eas: {
        projectId: '10f43a72-3297-4844-8476-d8d5cfe4ce76'
      }
    }
  }
}
