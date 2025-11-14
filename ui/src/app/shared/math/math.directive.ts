// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { MathJaxService } from './mathjax.service';
import { MathFieldElement, MathLiveService } from './mathlive.service';

// Type guard for MathfieldElement constructor
interface MathfieldElementConstructor {
    new (): MathFieldElement;
}

export type MathRenderer = 'auto' | 'mathjax' | 'mathlive';
export type MathMode = 'static' | 'interactive';

/**
 * Unified Math Directive
 *
 * A comprehensive directive that can parse HTML content and automatically apply
 * the correct math renderer based on the markup structure:
 * - `<span class="math-tex">` or `<span xmMathJax="">` → MathJax
 * - `<math-field>` or `<span xmMathLive="">` → MathLive
 * - Plain math expression → Auto-detect based on content
 *
 * @example
 * <!-- Auto-detect from HTML markup -->
 * <div xmMath='<span class="math-tex">\\frac{a}{b}</span> and <math-field>x^2</math-field>'></div>
 *
 * <!-- Auto-detect from plain expression -->
 * <span xmMath="x^2 + y^2 = z^2"></span>
 *
 * <!-- Mixed content -->
 * <div xmMath='<p>MathJax: <span class="math-tex">\\int_0^1 x dx</span></p>
 *              <p>MathLive: <math-field>\\sum_{n=1}^{\\infty} \\frac{1}{n^2}</math-field></p>'></div>
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
    private mathJaxService = inject(MathJaxService);
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
        await this.processMathJaxElements();
        await this.processMathLiveElements();
    }

    private async processPlainExpression() {
        // Handle plain math expression with auto-detection
        const selectedRenderer = this.determineRenderer(this.htmlContent!);

        try {
            if (selectedRenderer === 'mathjax') {
                await this.renderPlainWithMathJax();
            } else if (selectedRenderer === 'mathlive') {
                await this.renderPlainWithMathLive();
            }
        } catch (error) {
            console.error(`Failed to render plain expression with ${selectedRenderer}:`, error);
            // Fallback to the other renderer if auto mode
            if (this.renderer === 'auto') {
                await this.fallbackRenderPlain(selectedRenderer);
            }
        }
    }

    private async processMathJaxElements() {
        const mathJaxSelectors = ['span.math-tex', '[xmMathJax]', '.MathJax'];

        const mathJaxElements: HTMLElement[] = [];

        for (const selector of mathJaxSelectors) {
            const elements = this.el.nativeElement.querySelectorAll(selector);
            mathJaxElements.push(...(Array.from(elements) as HTMLElement[]));
        }

        if (mathJaxElements.length > 0) {
            // Process MathJax elements
            for (const element of mathJaxElements) {
                this.processedElements.push(element);
                // Extract math content
                let mathContent = '';
                if (element.hasAttribute('xmMathJax')) {
                    mathContent = element.getAttribute('xmMathJax') || '';
                } else {
                    mathContent = element.textContent || '';
                }

                // Set the content for MathJax processing
                if (mathContent) {
                    element.innerHTML = mathContent;
                }
            }

            // Typeset all MathJax elements
            await this.mathJaxService.typeset(mathJaxElements);
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

    private determineRenderer(expression: string): 'mathjax' | 'mathlive' {
        // Explicit renderer selection
        if (this.renderer === 'mathjax') return 'mathjax';
        if (this.renderer === 'mathlive') return 'mathlive';

        // Auto-detection logic for 'auto' mode
        if (this.renderer === 'auto') {
            // Interactive mode or editable prefers MathLive
            if (this.mode === 'interactive' || this.editable) {
                return 'mathlive';
            }

            // Check for MathLive-specific features
            if (this.containsMathLiveFeatures(expression)) {
                return 'mathlive';
            }

            // Check for complex LaTeX that works better with MathJax
            if (this.containsComplexLatex(expression)) {
                return 'mathjax';
            }

            // Default to MathJax for static display
            return 'mathjax';
        }

        return 'mathjax'; // Default fallback
    }

    private containsMathLiveFeatures(expression: string): boolean {
        if (!expression) return false;

        // MathLive handles these well
        const mathLivePatterns = [
            /\\mleft|\\mright/, // MathLive-specific brackets
            /\\placeholder/, // MathLive placeholders
        ];

        return mathLivePatterns.some((pattern) => pattern.test(expression));
    }

    private containsComplexLatex(expression: string): boolean {
        if (!expression) return false;

        // Complex LaTeX that MathJax handles better
        const complexPatterns = [
            /\\begin\{.*?\}/, // LaTeX environments (align, matrix, etc.)
            /\\text\{.*?\}/, // Text within math
            /\\mathbb|\\mathcal|\\mathfrak/, // Special fonts
            /\\tikz|\\pgfplots/, // TikZ/PGF graphics
            /\\xymatrix/, // Commutative diagrams
        ];

        return complexPatterns.some((pattern) => pattern.test(expression));
    }

    private async renderPlainWithMathJax() {
        this.el.nativeElement.innerHTML = this.htmlContent || '';
        await this.mathJaxService.typeset([this.el.nativeElement]);
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

    private async fallbackRenderPlain(failedRenderer: 'mathjax' | 'mathlive') {
        console.warn(`Falling back from ${failedRenderer} to alternative renderer for plain expression`);

        try {
            if (failedRenderer === 'mathjax') {
                await this.renderPlainWithMathLive();
            } else {
                await this.renderPlainWithMathJax();
            }
        } catch (fallbackError) {
            console.error('Fallback rendering also failed:', fallbackError);
            // Last resort: display the raw expression
            this.el.nativeElement.innerHTML = `<code>${this.htmlContent || ''}</code>`;
            this.el.nativeElement.style.color = 'red';
            this.el.nativeElement.title = 'Math rendering failed';
        }
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
