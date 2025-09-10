// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Injectable } from '@angular/core';

interface MathJaxConfig {
    tex: {
        inlineMath: string[][];
        displayMath: string[][];
        processEscapes: boolean;
        processEnvironments: boolean;
    };
    svg: {
        fontCache: string;
    };
    startup: {
        typeset: boolean;
    };
}

interface MathJaxAPI {
    typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
    tex2svg: (input: string, options?: { display?: boolean }) => SVGElement;
}

declare global {
    interface Window {
        MathJax: MathJaxAPI | MathJaxConfig;
    }
}

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
            // Configure MathJax before loading
            const config: MathJaxConfig = {
                tex: {
                    inlineMath: [
                        ['$', '$'],
                        ['\\(', '\\)'],
                    ],
                    displayMath: [
                        ['$$', '$$'],
                        ['\\[', '\\]'],
                    ],
                    processEscapes: true,
                    processEnvironments: true,
                },
                svg: {
                    fontCache: 'global',
                },
                startup: {
                    typeset: false, // We'll call typeset manually
                },
            };
            window.MathJax = config;

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

        if (!window.MathJax) {
            throw new Error('MathJax is not available on window object');
        }

        const mathJax = window.MathJax as MathJaxAPI;
        console.log('MathJax methods available:', Object.keys(mathJax));

        // Clear any existing MathJax content in the elements first
        if (elements) {
            elements.forEach((element) => {
                const mathJaxElements = element.querySelectorAll('mjx-container, mjx-math');
                mathJaxElements.forEach((mjxEl) => mjxEl.remove());
            });
        }

        try {
            // Try different approaches in order
            console.log('Method 1: Trying typesetPromise without elements (whole document)...');

            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error('MathJax typeset timeout')), 3000);
            });

            // Try without elements first (processes whole document)
            const typesetPromise = mathJax.typesetPromise();
            await Promise.race([typesetPromise, timeoutPromise]);
            console.log('MathJax Method 1 completed successfully');
        } catch {
            console.log('Method 1 failed, trying Method 2: typesetPromise with specific elements...');
            try {
                const timeoutPromise2 = new Promise<void>((_, reject) => {
                    setTimeout(() => reject(new Error('MathJax typeset timeout')), 3000);
                });

                const typesetPromise2 = mathJax.typesetPromise(elements);
                await Promise.race([typesetPromise2, timeoutPromise2]);
                console.log('MathJax Method 2 completed successfully');
            } catch {
                console.log('Using direct tex2svg conversion...');
                try {
                    if (elements) {
                        for (const element of elements) {
                            const mathContent = element.textContent || element.innerHTML;
                            if (mathContent && mathContent.includes('\\(') && mathContent.includes('\\)')) {
                                const cleanContent = mathContent.replace(/\\?\(|\\\)/g, '');
                                const svg = mathJax.tex2svg(cleanContent, { display: false });
                                if (svg && element.parentNode) {
                                    // Ensure inline display
                                    svg.style.cssText =
                                        'display: inline-block !important; vertical-align: baseline !important; margin: 0 !important;';
                                    element.parentNode.replaceChild(svg, element);
                                }
                            }
                        }
                    }
                    console.log('MathJax tex2svg conversion completed');
                } catch (error3) {
                    console.error('MathJax tex2svg failed:', error3);
                }
            }
        }
    }
}
