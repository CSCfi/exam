// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { defineConfig, globalIgnores } from "eslint/config";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["projects/**/*", "ui/src/assets/components/**/*"]),  {
    files: ["**/*.ts"],

    extends: compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@angular-eslint/recommended",
        "plugin:@angular-eslint/template/process-inline-templates",
    ),

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
    extends: compat.extends("plugin:@angular-eslint/template/recommended"),
    rules: {},
}]);