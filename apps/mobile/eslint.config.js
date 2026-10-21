// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      // Reanimated shared values mutate .value on the UI thread
      "react-hooks/immutability": "off",
    },
  },
  {
    ignores: ["dist/*"],
  }
]);
