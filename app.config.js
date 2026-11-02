module.exports = ({ config }) => {
  const apiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

  if (process.env.EAS_BUILD_PLATFORM === 'android' && !apiKey) {
    throw new Error('Set GOOGLE_MAPS_ANDROID_API_KEY in the EAS build environment before building Android.');
  }

  return {
    ...config,
    ...(apiKey ? {
      android: {
        ...config.android,
        config: {
          ...config.android?.config,
          googleMaps: {
            ...config.android?.config?.googleMaps,
            apiKey,
          },
        },
      },
    } : {}),
  };
};
