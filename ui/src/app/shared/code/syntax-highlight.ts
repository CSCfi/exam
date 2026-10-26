// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/**
 * Colorizes CKEditor code blocks (`<pre><code class="language-x">`) in rendered content.
 *
 * Highlighting happens here, at render time, and is never stored: the `hljs-*` spans would
 * otherwise have to pass the backend sanitizer and would nest on every re-edit. CKEditor does
 * not highlight its own editable, so code looks plain while authoring and colored when read.
 *
 * The highlighter is imported lazily so content without code blocks never pays for it.
 */
export const highlightCodeBlocks = async (root: HTMLElement) => {
    const blocks = root.querySelectorAll<HTMLElement>('pre code[class*="language-"]:not([data-highlighted])');
    if (blocks.length === 0) return;

    try {
        const hljs = (await import('./highlighter')).default;
        blocks.forEach((block) => hljs.highlightElement(block));
    } catch (error) {
        console.error('Failed to highlight code blocks:', error); // Plain code blocks are fine
    }
};
