export default {
  resolve: {
    alias: [
      { find: "@", replacement: "./src" },
      { find: "@models", replacement: "./src/models" }
    ],
    aliasMap: {
      "~routes": "./src/routes"
    }
  }
};
