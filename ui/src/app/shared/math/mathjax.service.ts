// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class MathJaxService {
    private loaded = false;
    private loading = false;

    async loadMathJax(): Promise<void> {
        if (this.loaded) return;

        if (this.loading) {
            return new Promise((resolve) => {
                const check = () => {
                    if (this.loaded) resolve();
                    else setTimeout(check, 100);
                };
                check();
            });
        }

        this.loading = true;

        try {
            await import('mathjax/tex-svg.js' as string);
            this.loaded = true;
        } catch (error) {
            console.error('Failed to load MathJax:', error);
            throw error;
        } finally {
            this.loading = false;
        }
    }

    async typeset(elements?: HTMLElement[]): Promise<void> {
        await this.loadMathJax();
        return window.MathJax.typesetPromise(elements);
    }
}
