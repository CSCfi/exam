// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Editor, ViewElement } from 'ckeditor5';

type MathFieldElement = HTMLElement & {
    value?: string;
    readOnly?: boolean;
};

/**
 * Service for initializing MathLive math-field elements in CKEditor's editing view.
 *
 * Design rule: the CKEditor model is the single source of truth for the LaTeX
 * expression. This service only reads from the model and sets MathLive's .value —
 * it never writes back to the model and never replaces DOM elements outside of
 * CKEditor's rendering pipeline.
 */
export class MathFieldService {
    async processMathInEditor(editor: Editor): Promise<void> {
        try {
            const editingView = editor.editing.view;
            const viewRoot = editingView.document.getRoot();
            if (!viewRoot) return;

            const domRoot = editingView.domConverter.mapViewToDom(viewRoot);
            if (!domRoot) return;

            const allMathFields = domRoot.querySelectorAll('math-field');
            if (!allMathFields.length) return;

            await import('mathlive');
            if (typeof window === 'undefined' || !customElements.get('math-field')) return;

            const now = Date.now();

            for (const el of Array.from(allMathFields)) {
                const element = el as HTMLElement;

                // Throttle: skip elements processed in the last second
                const lastProcessed = element.getAttribute('data-last-processed');
                if (lastProcessed && now - parseInt(lastProcessed) < 1000) continue;

                const expression = this.getExpression(editor, element);
                if (!expression.trim()) continue;

                this.initializeMathField(element, expression);
                element.setAttribute('data-last-processed', now.toString());
            }
        } catch (error) {
            console.error('Error processing math in editor:', error);
        }
    }

    private getExpression(editor: Editor, element: HTMLElement): string {
        // Prefer the CKEditor model attribute — it is always the authoritative source
        try {
            const editingView = editor.editing.view;
            const viewElement = editingView.domConverter.mapDomToView(element);
            if (viewElement && 'getChild' in viewElement) {
                const modelElement = editor.editing.mapper.toModelElement(viewElement as ViewElement);
                if (modelElement?.is('element', 'mathField')) {
                    return (modelElement.getAttribute('mathExpression') as string) || '';
                }
            }
        } catch {
            // fall through to attribute fallback
        }
        // Fallback: data attribute written by the downcast converter
        return element.getAttribute('data-math-expression') || '';
    }

    private initializeMathField(element: HTMLElement, expression: string): void {
        const mathField = element as MathFieldElement;
        // Set via MathLive's API. Never manipulate textContent/innerHTML on an
        // initialized math-field: MathLive re-parses raw text and converts LaTeX
        // notation (e.g. x^2) to Unicode (x²) instead of rendering it as a formula.
        mathField.value = expression;
        mathField.readOnly = true;
        mathField.setAttribute('math-virtual-keyboard-policy', 'off');
        mathField.setAttribute('tabindex', '-1');
        mathField.style.userSelect = 'none';
        (mathField.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none';
        mathField.style.cursor = 'pointer';
    }
}
