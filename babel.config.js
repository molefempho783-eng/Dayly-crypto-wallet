
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // keep other plugins here if you have them...
      'react-native-reanimated/plugin', // <-- MUST be last
    ],
  };
};
