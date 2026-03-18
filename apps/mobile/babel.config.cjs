module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // Reanimated 4 uses worklets plugin (must be last)
      "react-native-worklets/plugin",
    ],
  };
};
