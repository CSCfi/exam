// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { MathFieldElement, MathLiveService } from './mathlive.service';

// Type guard for MathfieldElement constructor
interface MathfieldElementConstructor {
    new (): MathFieldElement;
}

export type MathRenderer = 'auto' | 'mathlive';
export type MathMode = 'static' | 'interactive';

/**
 * Unified Math Directive
 *
 * A comprehensive directive that can parse HTML content and automatically apply
 * MathLive renderer based on the markup structure:
 * - `<math-field>` or `<span xmMathLive="">` → MathLive
 * - Plain math expression → MathLive
 *
 * @example
 * <!-- Auto-detect from HTML markup -->
 * <div xmMath='<math-field>x^2</math-field>'></div>
 *
 * <!-- Auto-detect from plain expression -->
 * <span xmMath="x^2 + y^2 = z^2"></span>
 */
@Directive({
    selector: '[xmMath]',
})
export class MathUnifiedDirective implements OnChanges, OnDestroy {
    @Input('xmMath') htmlContent?: string;
    @Input() renderer: MathRenderer = 'auto'; // Only applies to plain expressions
    @Input() mode: MathMode = 'static'; // Default mode for plain expressions
    @Input() editable = false; // For backward compatibility

    private el = inject(ElementRef);
    private mathLiveService = inject(MathLiveService);
    private mathFields: MathFieldElement[] = [];
    private processedElements: Element[] = [];

    async ngOnChanges() {
        if (this.htmlContent) {
            await this.processHtmlContent();
        }
    }

    ngOnDestroy() {
        this.cleanup();
    }

    /**
     * Get the current HTML content with updated math values
     */
    getValue(): string {
        // For interactive MathLive fields, get their current values and update the HTML
        if (this.mathFields.length > 0) {
            const clonedElement = this.el.nativeElement.cloneNode(true) as HTMLElement;
            const mathFields = clonedElement.querySelectorAll('math-field');

            mathFields.forEach((field, index) => {
                if (this.mathFields[index] && !this.mathFields[index].readOnly) {
                    // Update the field's text content with the current value
                    field.textContent = this.mathFields[index].getValue();
                }
            });

            return clonedElement.innerHTML;
        }
        return this.el.nativeElement.innerHTML;
    }

    /**
     * Set new HTML content
     */
    setValue(htmlContent: string): void {
        this.htmlContent = htmlContent;
        this.processHtmlContent();
    }

    /**
     * Get information about the processed math elements
     */
    getRenderInfo() {
        return {
            processedElements: this.processedElements.length,
            mathLiveFields: this.mathFields.length,
            mode: this.mode,
            editable: this.editable,
            content: this.htmlContent,
        };
    }

    private async processHtmlContent() {
        // Clean up previous rendering
        this.cleanup();

        if (!this.htmlContent) return;

        try {
            // Check if it's HTML markup or plain math expression
            if (this.isHtmlMarkup(this.htmlContent)) {
                await this.processHtmlMarkup();
            } else {
                await this.processPlainExpression();
            }
        } catch (error) {
            console.error('Failed to process math content:', error);
            // Fallback: display raw content
            this.el.nativeElement.innerHTML = `<code>${this.htmlContent}</code>`;
        }
    }

    private isHtmlMarkup(content: string): boolean {
        // Check if content contains HTML tags
        return /<[^>]+>/.test(content);
    }

    private async processHtmlMarkup() {
        // Parse the HTML content
        this.el.nativeElement.innerHTML = this.htmlContent;

        // Find and process math elements
        await this.processMathLiveElements();
    }

    private async processPlainExpression() {
        // Handle plain math expression - always use MathLive
        try {
            await this.renderPlainWithMathLive();
        } catch (error) {
            console.error('Failed to render plain expression with MathLive:', error);
            // Last resort: display the raw expression
            this.el.nativeElement.innerHTML = `<code>${this.htmlContent || ''}</code>`;
            this.el.nativeElement.style.color = 'red';
            this.el.nativeElement.title = 'Math rendering failed';
        }
    }

    private async processMathLiveElements() {
        const mathLiveSelectors = ['math-field', '[xmMathLive]'];

        const mathLiveElements: HTMLElement[] = [];

        for (const selector of mathLiveSelectors) {
            const elements = this.el.nativeElement.querySelectorAll(selector);
            mathLiveElements.push(...(Array.from(elements) as HTMLElement[]));
        }

        if (mathLiveElements.length > 0) {
            await this.mathLiveService.loadMathLive();

            for (const element of mathLiveElements) {
                await this.processMathLiveElement(element);
                this.processedElements.push(element);
            }
        }
    }

    private async processMathLiveElement(element: HTMLElement) {
        if (!this.mathLiveService.isMathLiveAvailable()) {
            console.error('MathfieldElement not available');
            return;
        }

        let mathContent = '';
        let isInteractive = this.mode === 'interactive' || this.editable;

        if (element.tagName.toLowerCase() === 'math-field') {
            // It's already a math-field element, just configure it
            mathContent = element.textContent || '';
            // Directive inputs take precedence over element attributes
            // Only check element's read-only attribute if directive has default settings
            if (this.mode === 'static' && !this.editable && element.hasAttribute('read-only')) {
                isInteractive = false;
            }
        } else if (element.hasAttribute('xmMathLive')) {
            // Convert xmMathLive attribute to math-field
            mathContent = element.getAttribute('xmMathLive') || '';

            // Create new math-field element
            const mathField = new (
                window as unknown as { MathfieldElement: MathfieldElementConstructor }
            ).MathfieldElement();

            // Configure the field
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

            // Replace the original element
            element.parentNode?.replaceChild(mathField, element);
            this.mathFields.push(mathField);

            return;
        }

        // For existing math-field elements, just configure them
        if (element.tagName.toLowerCase() === 'math-field') {
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

    private async renderPlainWithMathLive() {
        await this.mathLiveService.loadMathLive();
        this.setupPlainMathField();
    }

    private setupPlainMathField() {
        if (!this.mathLiveService.isMathLiveAvailable()) {
            console.error('MathfieldElement not available');
            return;
        }

        // Create a new MathfieldElement
        const mathField = new (
            window as unknown as { MathfieldElement: MathfieldElementConstructor }
        ).MathfieldElement();

        // Configure based on mode and editable setting
        const isInteractive = this.mode === 'interactive' || this.editable;

        mathField.readOnly = !isInteractive;
        mathField.setAttribute('math-virtual-keyboard-policy', isInteractive ? 'auto' : 'off');

        // Additional styling for static mode
        if (!isInteractive) {
            mathField.style.border = 'none';
            mathField.style.outline = 'none';
            mathField.style.backgroundColor = 'transparent';
        }

        // Clear the element and append the math field
        this.el.nativeElement.innerHTML = '';
        this.el.nativeElement.appendChild(mathField);

        if (this.htmlContent) {
            mathField.setValue(this.htmlContent);
        }

        this.mathFields.push(mathField);
    }

    private cleanup() {
        // Clean up MathLive fields
        this.mathFields.forEach((field) => {
            if (field && field.parentNode) {
                field.parentNode.removeChild(field);
            }
        });
        this.mathFields = [];
        this.processedElements = [];
    }
}
