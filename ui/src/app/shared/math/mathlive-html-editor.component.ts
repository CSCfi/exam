// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    CUSTOM_ELEMENTS_SCHEMA,
    ElementRef,
    inject,
    input,
    output,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MathFieldElement, MathLiveService } from './mathlive.service';

@Component({
    selector: 'xm-mathlive-html-editor',
    template: `
        <div class="container mt-4">
            <h2>{{ 'i18n_mathlive_html_editor_title' | translate }}</h2>

            <!-- HTML Markup Editor -->
            <div class="row mb-5">
                <div class="col-12">
                    <p>
                        {{ 'i18n_mathlive_html_editor_instructions' | translate }}
                    </p>
                    <div class="markup-editor-container">
                        <div class="mb-2">
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-primary me-2"
                                (click)="insertMathField()"
                                [title]="'i18n_mathlive_insert_math_field_tooltip' | translate"
                            >
                                <i class="bi bi-calculator"></i> {{ 'i18n_mathlive_math_field_button' | translate }}
                            </button>
                            <div class="btn-group" ngbDropdown>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-secondary"
                                    ngbDropdownToggle
                                    [title]="'i18n_mathlive_insert_heading_tooltip' | translate"
                                >
                                    <i class="bi bi-type-h1"></i> {{ 'i18n_mathlive_heading_button' | translate }}
                                </button>
                                <div class="dropdown-menu" ngbDropdownMenu>
                                    <button class="dropdown-item" type="button" (click)="insertHeading(1)">
                                        <i class="bi bi-type-h1"></i>
                                        {{ 'i18n_mathlive_heading' | translate: { level: 1 } }}
                                    </button>
                                    <button class="dropdown-item" type="button" (click)="insertHeading(2)">
                                        <i class="bi bi-type-h2"></i>
                                        {{ 'i18n_mathlive_heading' | translate: { level: 2 } }}
                                    </button>
                                    <button class="dropdown-item" type="button" (click)="insertHeading(3)">
                                        <i class="bi bi-type-h3"></i>
                                        {{ 'i18n_mathlive_heading' | translate: { level: 3 } }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <textarea
                            #markupTextarea
                            [(ngModel)]="htmlMarkup"
                            (input)="onMarkupChange()"
                            class="markup-textarea"
                            [placeholder]="'i18n_mathlive_textarea_placeholder' | translate"
                        ></textarea>
                    </div>
                    <div class="mt-3">
                        <h5>{{ 'i18n_mathlive_rendered_output' | translate }}</h5>
                        <div class="mb-2">
                            <small class="text-muted">
                                @if (enableEditing()) {
                                    <i class="bi bi-pencil-square"></i>
                                    {{ 'i18n_mathlive_editable_message' | translate }}
                                } @else {
                                    <i class="bi bi-eye"></i>
                                    {{ 'i18n_mathlive_readonly_message' | translate }}
                                }
                            </small>
                        </div>
                        <div class="rendered-html" #renderedOutput></div>
                    </div>
                </div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [CommonModule, FormsModule, NgbDropdownModule, TranslateModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    styleUrl: './mathlive-html-editor.component.scss',
})
export class MathLiveHtmlEditorComponent implements AfterViewInit {
    @ViewChild('renderedOutput', { static: false }) renderedOutput!: ElementRef;
    @ViewChild('markupTextarea', { static: false }) markupTextarea!: ElementRef;

    // Input signal for initial HTML content
    initialHtmlContent = input<string>('');

    // Output signal for HTML content changes
    htmlContentChange = output<string>();

    // Input signal for enabling editing of math expressions (default: true)
    enableEditing = input<boolean>(true);

    mathExpression = 'x^2 + y^2 = z^2';
    htmlMarkup = '';
    private mathFieldElements: Map<HTMLElement, string> = new Map();
    private mathLiveService = inject(MathLiveService);
    private translateService = inject(TranslateService);

    constructor() {
        // Initialize htmlMarkup with the input signal value or default content
        this.htmlMarkup = this.initialHtmlContent() || this.getDefaultContent();
        // Don't call onMarkupChange in constructor - wait for ngAfterViewInit
    }

    ngAfterViewInit() {
        // Initial render after view is initialized
        setTimeout(() => this.onMarkupChange(), 100);
    }

    insertMathField() {
        const textarea = this.markupTextarea.nativeElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const mathFieldHtml = '<math-field></math-field>';

        // Insert the math-field element at cursor position
        const newValue = this.htmlMarkup.substring(0, start) + mathFieldHtml + this.htmlMarkup.substring(end);
        this.htmlMarkup = newValue;

        // Update the rendered output
        this.onMarkupChange();

        // Set cursor position inside the math-field element
        setTimeout(() => {
            const newCursorPosition = start + '<math-field>'.length;
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            textarea.focus();
        }, 0);
    }

    insertHeading(level: 1 | 2 | 3) {
        const textarea = this.markupTextarea.nativeElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const headingTags = `<h${level}></h${level}>`;

        // Insert the heading tags at cursor position
        const before = this.htmlMarkup.substring(0, start);
        const after = this.htmlMarkup.substring(end);
        this.htmlMarkup = before + headingTags + after;

        // Position cursor between the opening and closing tags
        setTimeout(() => {
            const newCursorPosition = start + `<h${level}>`.length;
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
            textarea.focus();
        }, 0);
    }

    async onMarkupChange() {
        if (!this.renderedOutput) return;

        // Clear previous content completely
        this.renderedOutput.nativeElement.innerHTML = '';

        // Create a temporary container to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.htmlMarkup;

        // Process each element
        this.processElement(tempDiv);

        // Move all processed content to the rendered output
        while (tempDiv.firstChild) {
            this.renderedOutput.nativeElement.appendChild(tempDiv.firstChild);
        }

        // Initialize MathLive for any math-field elements
        await this.initializeMathLive();

        // Emit the changed HTML content
        this.htmlContentChange.emit(this.htmlMarkup);
    }

    private processElement(element: Element) {
        // Process all child elements recursively
        const children = Array.from(element.children);
        for (const child of children) {
            if (child.tagName === 'MATH-FIELD') {
                // Keep math-field elements as-is for MathLive initialization
                continue;
            } else if (child.hasAttribute('xmMathLive')) {
                // Convert xmMathLive directive to math-field element
                const mathExpression = child.getAttribute('xmMathLive') || '';
                const mathField = document.createElement('math-field');
                mathField.textContent = mathExpression;
                mathField.setAttribute('read-only', this.enableEditing() ? 'false' : 'true');
                child.parentNode?.replaceChild(mathField, child);
            } else if (child.hasAttribute('xmMath')) {
                // Process xmMath elements with unified logic
                this.processUnifiedMath(child);
                continue;
            } else {
                // Recursively process child elements
                this.processElement(child);
            }
        }
    }

    private async initializeMathLive() {
        if (!this.renderedOutput) return;

        // Load MathLive module
        await this.mathLiveService.loadMathLive();

        // Initialize all math-field elements in the rendered output
        const mathFields = this.renderedOutput.nativeElement.querySelectorAll('math-field');
        for (const mathField of mathFields) {
            if (!mathField.hasAttribute('data-initialized')) {
                mathField.setAttribute('data-initialized', 'true');

                // Set initial value
                if (mathField.textContent) {
                    mathField.value = mathField.textContent;
                }

                // Set editable state based on input signal
                mathField.readOnly = !this.enableEditing();

                // Store original expression for bidirectional updates
                const originalExpression = mathField.textContent || '';
                this.mathFieldElements.set(mathField, originalExpression);

                // For empty math-fields, add a unique identifier to track them
                if (!originalExpression) {
                    mathField.setAttribute('data-empty-field', 'true');
                }

                // Add event listener for bidirectional editing (only if editing is enabled)
                if (this.enableEditing()) {
                    mathField.addEventListener('input', (event: Event) => {
                        this.onMathFieldChange(mathField, event);
                    });
                }
            } else {
                // Update existing math fields based on input signal
                mathField.readOnly = !this.enableEditing();

                // Update event listeners based on editing state
                mathField.removeEventListener('input', this.onMathFieldChange);
                if (this.enableEditing()) {
                    mathField.addEventListener('input', (event: Event) => {
                        this.onMathFieldChange(mathField, event);
                    });
                }
            }
        }
    }

    private onMathFieldChange(mathField: HTMLElement, event: Event) {
        if (!this.enableEditing()) return;

        const target = event.target as MathFieldElement;
        const newValue = target.getValue ? target.getValue() : target.value || '';
        const originalExpression = this.mathFieldElements.get(mathField);

        if (originalExpression !== undefined && newValue !== originalExpression) {
            // Update the HTML markup with the new value
            this.updateHtmlMarkup(originalExpression, newValue, mathField);
        }
    }

    private updateHtmlMarkup(oldExpression: string, newExpression: string, mathField: HTMLElement) {
        let updatedMarkup = this.htmlMarkup;

        if (oldExpression === '') {
            // Handle empty initial case - find empty math-field tags
            const emptyMathFieldRegex = /<math-field[^>]*>\s*<\/math-field>/;
            const match = updatedMarkup.match(emptyMathFieldRegex);

            if (match) {
                // Replace only the first occurrence to avoid replacing wrong empty fields
                updatedMarkup = updatedMarkup.replace(emptyMathFieldRegex, `<math-field>${newExpression}</math-field>`);
                // Remove the empty field marker since it now has content
                mathField.removeAttribute('data-empty-field');
            }
        } else {
            // Handle non-empty case with existing logic
            const escapedOld = oldExpression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Create regex to match the old expression in math-field tags
            const mathFieldRegex = new RegExp(`<math-field[^>]*>\\s*${escapedOld}\\s*</math-field>`, 'g');
            updatedMarkup = updatedMarkup.replace(mathFieldRegex, `<math-field>${newExpression}</math-field>`);

            // Also replace in xmMathLive attributes
            const xmMathLiveRegex = new RegExp(`xmMathLive="\\s*${escapedOld}\\s*"`, 'g');
            updatedMarkup = updatedMarkup.replace(xmMathLiveRegex, `xmMathLive="${newExpression}"`);
        }

        // Update the HTML markup
        this.htmlMarkup = updatedMarkup;

        // Update the stored expression
        this.mathFieldElements.set(mathField, newExpression);

        // Emit the changed HTML content
        this.htmlContentChange.emit(this.htmlMarkup);
    }

    private async processUnifiedMath(element: Element) {
        const mathContent = element.getAttribute('xmMath') || '';
        if (!mathContent) return;

        // Check if it's HTML markup or plain expression
        if (this.isHtmlMarkup(mathContent)) {
            // Parse HTML content and process embedded math elements
            element.innerHTML = mathContent;
            this.processElement(element);
        } else {
            // Determine renderer for plain expression
            const renderer = this.determineRenderer(mathContent);

            if (renderer === 'mathlive') {
                // Convert to math-field for MathLive processing
                const mathField = document.createElement('math-field');
                mathField.textContent = mathContent;
                mathField.setAttribute('read-only', this.enableEditing() ? 'false' : 'true');
                element.parentNode?.replaceChild(mathField, element);
            } else {
                // Use MathJax for rendering
                element.innerHTML = mathContent;
                element.setAttribute('data-mathjax', 'true');
            }
        }
    }

    private isHtmlMarkup(content: string): boolean {
        return /<[^>]+>/.test(content);
    }

    private determineRenderer(expression: string): 'mathjax' | 'mathlive' {
        // Interactive mode prefers MathLive
        if (this.enableEditing()) {
            return 'mathlive';
        }

        // Check for complex LaTeX that works better with MathJax
        if (this.containsComplexLatex(expression)) {
            return 'mathjax';
        }

        // Default to MathJax for static display
        return 'mathjax';
    }

    private containsComplexLatex(expression: string): boolean {
        const complexPatterns = [
            /\\begin\{.*?\}/, // LaTeX environments
            /\\text\{.*?\}/, // Text within math
            /\\mathbb|\\mathcal|\\mathfrak/, // Special fonts
        ];
        return complexPatterns.some((pattern) => pattern.test(expression));
    }

    private getDefaultContent(): string {
        return `<p>${this.translateService.instant('i18n_mathlive_example_simple')} <math-field>1+2/3</math-field></p>
<p>${this.translateService.instant('i18n_mathlive_example_complex')} <math-field>\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}</math-field></p>
<p>Advanced formula: <math-field>\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}</math-field></p>
<p>Simple equation: <math-field>x^2 + y^2 = z^2</math-field></p>`;
    }
}
