// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import js from "@eslint/js";
import angular from "angular-eslint";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([globalIgnores(["projects/**/*", "ui/src/assets/components/**/*"]), {
    files: ["**/*.ts"],

    extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        angular.configs.tsRecommended,
    ],

    processor: angular.processInlineTemplates,

    plugins: {
        "no-relative-import-paths": noRelativeImportPaths,
    },

    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: ["ui/tsconfig.json"],
            createDefaultProgram: true,
        },
    },

    rules: {
        "@typescript-eslint/no-explicit-any": "error",

        "@angular-eslint/directive-selector": ["error", {
            type: "attribute",
            prefix: "xm",
            style: "camelCase",
        }],

        "@angular-eslint/component-selector": ["error", {
            type: "element",
            prefix: "xm",
            style: "kebab-case",
        }],

        "@typescript-eslint/member-ordering": "error",

        "no-relative-import-paths/no-relative-import-paths": ["error", {
            allowSameFolder: true,
            rootDir: "ui",
        }],
    },
}, {
    files: ["**/*.html"],
    extends: [angular.configs.templateRecommended],
    rules: {},
}]);
