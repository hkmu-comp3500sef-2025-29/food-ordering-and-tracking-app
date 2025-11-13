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
            // ========== Strictness Rules Beyond TSConfig ==========

            /**
             * Completely forbids the use of 'any' type.
             * This is a stricter rule than 'noImplicitAny'.
             */
            "@typescript-eslint/no-explicit-any": "error",

            /**
             * Enforces that all Promises must be awaited or handled with .then().
             * This prevents forgotten Promises, similar to Go's mandatory 'if err != nil' checks.
             */
            "@typescript-eslint/no-floating-promises": "error",

            /**
             * Enforces explicit return types for all exported functions and class methods.
             * (You may already have 'noImplicitReturns', but this rule is stricter)
             */
            "@typescript-eslint/explicit-module-boundary-types": "error",

            /**
             * Go does not allow implicit type conversions, nor should TypeScript.
             * This forbids implicit coercions like `!!string` (use `string !== ''` instead)
             * or `+string` (use `Number(string)` instead).
             */
            "no-implicit-coercion": "error",

            /**
             * Go linters catch variable shadowing (Shadowing).
             * Forbids variable shadowing, a common linter rule in Go (go vet).
             */
            "@typescript-eslint/no-shadow": "error",
        },
    },
];
