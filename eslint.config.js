import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: [
            "src/**/*.ts",
        ],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
                project: "./tsconfig.json",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
            // Disallow use of the `any` type - enforces type safety
            "@typescript-eslint/no-explicit-any": "error",
            // Disallow floating promises - ensures all promises are properly handled
            "@typescript-eslint/no-floating-promises": "error",
            // Require explicit return types on functions - improves code documentation
            "@typescript-eslint/explicit-module-boundary-types": "error",
            // Disallow implicit type coercion - prevents unexpected type conversions
            "no-implicit-coercion": "error",
            // Disallow variable shadowing - prevents confusion from reusing variable names
            "@typescript-eslint/no-shadow": "error",
        },
    },
];
