// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

declare global {
    interface Window {
        MathJax: {
            // MathJax 2.7.9 API
            Hub: {
                Queue: (commands: unknown[]) => void;
            };
            // Fallback for newer versions
            typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
            startup?: {
                document: Document;
                ready: () => Promise<void>;
            };
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
