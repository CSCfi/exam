// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { version } from 'ckeditor5';

/**
 * CKEditor's editor UI stylesheet, emitted by the build as a non-injected global style (see
 * `angular.json`). It is too large to count against the initial bundle or the component style
 * budget, so it is linked on demand instead. The content stylesheet stays global because
 * read-only views rely on its `:root` variables.
 *
 * Non-injected styles are not content-hashed, so the CKEditor version busts the browser cache
 * on upgrade.
 */
const HREF = `ckeditor5-editor.css?v=${version}`;

let loading: Promise<void> | undefined;

/**
 * Links the editor stylesheet once per page and resolves when it has loaded. It also resolves
 * on error, so a failed download degrades to an unstyled editor rather than no editor at all.
 */
export const loadEditorStyles = (doc: Document): Promise<void> =>
    (loading ??= new Promise<void>((resolve) => {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = HREF;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        // Ahead of the global stylesheet so the app's own overrides still win on equal specificity,
        // as they did when this was part of styles.scss.
        doc.head.insertBefore(link, doc.head.querySelector('link[rel="stylesheet"]'));
    }));
