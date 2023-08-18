module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
    "object-curly-spacing": "off",
    "quote-props": "off",
    indent: "off",
    "valid-jsdoc": "off",
    "comma-dangle": "off",
    "no-unexpected-multiline": "off",
    camelcase: "off",
    "no-extra-boolean-cast": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
