// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class MathJaxService {
    async typeset(elements?: HTMLElement[]): Promise<void> {
        if (window.MathJax) {
            // MathJax 2.7.9 uses different API
            if (window.MathJax.Hub && window.MathJax.Hub.Queue) {
                return new Promise((resolve) => {
                    window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, elements || document.body]);
                    window.MathJax.Hub.Queue([resolve]);
                });
            } else if (window.MathJax.typesetPromise) {
                // Fallback for newer versions
                return window.MathJax.typesetPromise(elements);
            }
        }
        console.warn('MathJax not loaded. Make sure MathJax is loaded via script tag.');
        return Promise.resolve();
    }
}
