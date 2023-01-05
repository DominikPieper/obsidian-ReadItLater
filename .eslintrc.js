module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    ignorePatterns: [".eslintrc.js", "esbuild.config.mjs"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended"
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        2,
        { args: "all", argsIgnorePattern: "^_" },
      ],
    },
  };