// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

// Simple interface for MathLive functionality to avoid linting issues
export interface MathFieldElement extends HTMLElement {
    readOnly: boolean;
    disabled: boolean;
    value: string;
    placeholder: string;
    setValue(value: string): void;
    getValue(): string;
    insert(latex: string): void;
}

@Injectable({
    providedIn: 'root',
})
export class MathLiveService {
    private mathLivePromise: Promise<void> | null = null;

    async loadMathLive(): Promise<void> {
        if (this.mathLivePromise) {
            return this.mathLivePromise;
        }

        this.mathLivePromise = new Promise<void>((resolve, reject) => {
            // Check if already loaded
            if (this.isMathLiveAvailable()) {
                resolve();
                return;
            }

            // Dynamic import of mathlive module
            import('mathlive')
                .then(() => {
                    resolve();
                })
                .catch((error) => {
                    console.error('Failed to load MathLive module:', error);
                    reject(error);
                });
        });

        return this.mathLivePromise;
    }

    isMathLiveAvailable(): boolean {
        return typeof window !== 'undefined' && !!window.MathfieldElement;
    }
}
