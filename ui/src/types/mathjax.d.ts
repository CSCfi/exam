// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

/**
 * Type definitions for MathJax 4 (minimal subset used in this application)
 * MathJax 4 doesn't provide official TypeScript definitions
 */
declare global {
    interface Window {
        MathJax: {
            /** Render math expressions in the specified elements */
            typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
            /** Convert LaTeX to SVG element */
            tex2svg?: (input: string, options?: { display?: boolean }) => SVGElement;
            /** Configuration object set before loading MathJax */
            config?: {
                tex: {
                    inlineMath: string[][];
                    displayMath: string[][];
                };
                svg: {
                    fontCache: string;
                };
            };
        };
    }
}

export {};
