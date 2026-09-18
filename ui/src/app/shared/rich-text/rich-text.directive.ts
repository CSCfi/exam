// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, OnDestroy, effect, inject, input, model } from '@angular/core';
import { highlightCodeBlocks } from 'src/app/shared/code/syntax-highlight';

interface MathFieldElement extends HTMLElement {
    readOnly: boolean;
    getValue(): string;
    setValue(value: string): void;
}

interface MathfieldElementConstructor {
    new (): MathFieldElement;
}

export type MathMode = 'static' | 'interactive';

/**
 * Rich Text Directive
 *
 * Renders editor-authored HTML and activates the widgets it can carry: `<math-field>` /
 * `[xmMathLive]` elements via MathLive, and CKEditor code blocks via the syntax highlighter.
 * Plain text content (no HTML tags) is rendered as-is.
 *
 * This is the app's only path for rendering stored HTML, so anything that has to run against
 * rendered content belongs in `enhanceRenderedContent`.
 *
 * @example
 * <div [xmRichText]="'Some text with <math-field>x^2</math-field> embedded'"></div>
 * <div [xmRichText]="plainTextWithNoMath"></div>
 */
@Directive({
    selector: '[xmRichText]',
})
export class RichTextDirective implements OnDestroy {
    readonly htmlContent = model<string | undefined>(undefined, { alias: 'xmRichText' });
    readonly mode = input<MathMode>('static');
    readonly editable = input(false);

    private mathFields: MathFieldElement[] = [];
    private processedElements: Element[] = [];

    private readonly el = inject(ElementRef);

    constructor() {
        effect(() => {
            if (this.htmlContent()) {
                void this.processHtmlContent();
            }
        });
    }

    ngOnDestroy() {
        this.cleanup();
    }

    getValue(): string {
        if (this.mathFields.length > 0) {
            const clonedElement = this.el.nativeElement.cloneNode(true) as HTMLElement;
            clonedElement.querySelectorAll('math-field').forEach((field, index) => {
                if (this.mathFields[index] && !this.mathFields[index].readOnly) {
                    field.textContent = this.mathFields[index].getValue();
                }
            });
            return clonedElement.innerHTML;
        }
        return this.el.nativeElement.innerHTML;
    }

    setValue(htmlContent: string): void {
        this.htmlContent.set(htmlContent);
    }

    private async processHtmlContent() {
        this.cleanup();

        const content = this.htmlContent();
        if (!content) return;

        try {
            if (/<[^>]+>/.test(content)) {
                this.el.nativeElement.innerHTML = content;
                await this.enhanceRenderedContent();
            } else {
                this.el.nativeElement.textContent = content;
            }
        } catch (error) {
            console.error('Failed to process math content:', error);
            this.el.nativeElement.innerHTML = `<code>${content}</code>`;
        }
    }

    /** Activates the widgets embedded in freshly rendered content. Math and code blocks are
     *  unrelated to each other; they share this seam because they share a render path. */
    private async enhanceRenderedContent() {
        await this.processMathLiveElements();
        await highlightCodeBlocks(this.el.nativeElement);
    }

    private async processMathLiveElements() {
        const mathLiveElements: HTMLElement[] = [
            ...Array.from(this.el.nativeElement.querySelectorAll('math-field')),
            ...Array.from(this.el.nativeElement.querySelectorAll('[xmMathLive]')),
        ] as HTMLElement[];

        if (mathLiveElements.length > 0) {
            await this.loadMathLive();
            for (const element of mathLiveElements) {
                this.processMathLiveElement(element);
                this.processedElements.push(element);
            }
        }
    }

    private processMathLiveElement(element: HTMLElement) {
        if (!this.isMathLiveAvailable()) {
            console.error('MathfieldElement not available');
            return;
        }

        const isInteractive = this.mode() === 'interactive' || this.editable();

        if (element.hasAttribute('xmMathLive')) {
            const mathContent = element.getAttribute('xmMathLive') ?? '';
            const mathField = new (
                window as unknown as { MathfieldElement: MathfieldElementConstructor }
            ).MathfieldElement();

            mathField.readOnly = !isInteractive;
            mathField.setAttribute('math-virtual-keyboard-policy', isInteractive ? 'auto' : 'off');

            if (!isInteractive) {
                mathField.style.border = 'none';
                mathField.style.outline = 'none';
                mathField.style.backgroundColor = 'transparent';
            }

            if (mathContent) {
                mathField.setValue(mathContent);
            }

            element.parentNode?.replaceChild(mathField, element);
            this.mathFields.push(mathField);
        } else if (element.tagName.toLowerCase() === 'math-field') {
            const mathFieldElement = element as unknown as MathFieldElement;
            mathFieldElement.readOnly = !isInteractive;
            mathFieldElement.setAttribute('math-virtual-keyboard-policy', isInteractive ? 'auto' : 'off');

            if (!isInteractive) {
                mathFieldElement.style.border = 'none';
                mathFieldElement.style.outline = 'none';
                mathFieldElement.style.backgroundColor = 'transparent';
            }

            this.mathFields.push(mathFieldElement);
        }
    }

    private async loadMathLive(): Promise<void> {
        if (!this.isMathLiveAvailable()) {
            await import('mathlive');
        }
    }

    private isMathLiveAvailable(): boolean {
        return !!(window as unknown as { MathfieldElement?: unknown }).MathfieldElement;
    }

    private cleanup() {
        this.mathFields.forEach((field) => {
            field.parentNode?.removeChild(field);
        });
        this.mathFields = [];
        this.processedElements = [];
    }
}
