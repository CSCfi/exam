// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Editor, ModelWriter, ViewElement } from 'ckeditor5';

/**
 * Type for MathLive math-field element with its custom properties
 */
type MathFieldElement = HTMLElement & {
    [key: string]: unknown;
    value?: string;
    readOnly?: boolean;
    textContent: string;
    innerHTML: string;
    disconnectedCallback?: () => void;
    render?: () => void;
    update?: () => void;
    blur?: () => void;
};

/**
 * Service for processing and initializing MathLive math-field elements in CKEditor
 */
export class MathFieldService {
    /**
     * Process all math fields in the editor and initialize/reinitialize them as needed
     */
    async processMathInEditor(editor: Editor): Promise<void> {
        try {
            const editingView = editor.editing.view;
            const viewRoot = editingView.document.getRoot();
            if (!viewRoot) return;

            const domRoot = editingView.domConverter.mapViewToDom(viewRoot);
            if (!domRoot) return;

            const allMathFields = domRoot.querySelectorAll('math-field');

            for (const mathField of Array.from(allMathFields)) {
                const element = mathField as HTMLElement;

                // Skip if nuclear replacement is in progress
                if (element.getAttribute('data-nuclear-in-progress') === 'true') {
                    continue;
                }

                // Try to get the most up-to-date expression from multiple sources
                let expectedExpression = '';

                // Method 1: Get from CKEditor model (most authoritative)
                try {
                    const viewElement = editingView.domConverter.mapDomToView(element);
                    // Check if viewElement is an Element (not DocumentFragment)
                    if (viewElement && !('getChild' in viewElement)) {
                        const modelElement = editor.editing.mapper.toModelElement(viewElement as ViewElement);
                        if (modelElement && modelElement.is('element', 'mathField')) {
                            expectedExpression = (modelElement.getAttribute('mathExpression') as string) || '';
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Could not get expression from model:', error);
                }

                // Method 2: Fallback to DOM attributes
                if (!expectedExpression) {
                    expectedExpression = element.getAttribute('data-math-expression') || element.textContent || '';
                }

                const isInitialized = element.getAttribute('data-math-initialized') === 'true';

                // Skip if this element was processed very recently to prevent loops
                const lastProcessed = element.getAttribute('data-last-processed');
                const now = Date.now();
                if (lastProcessed && now - parseInt(lastProcessed) < 1000) {
                    continue;
                }

                if (!expectedExpression.trim()) {
                    continue;
                }

                let needsInitialization = false;

                // Check if the rendered content matches what should be rendered
                const mathFieldElement = element as HTMLElement & { value?: string };
                const currentValue = mathFieldElement.value || '';
                const textContent = element.textContent || '';

                if (!isInitialized) {
                    needsInitialization = true;
                } else if (currentValue !== expectedExpression.trim()) {
                    needsInitialization = true;
                } else if (textContent !== expectedExpression.trim() && textContent !== '' && currentValue === '') {
                    // Only re-initialize for textContent mismatch if the MathField value is also empty
                    // This prevents endless loops when textContent lags behind but MathField is correct
                    needsInitialization = true;
                } else {
                    // Fix textContent if it's wrong but don't trigger full re-initialization
                    if (textContent !== expectedExpression.trim() && textContent !== '') {
                        element.textContent = expectedExpression.trim();
                    }
                }

                if (needsInitialization) {
                    // Pass the re-initialization flag to the method
                    await this.initializeMathField(element, expectedExpression.trim(), editor, isInitialized);
                    element.setAttribute('data-math-initialized', 'true');
                    // Also update the DOM attribute to match the model
                    element.setAttribute('data-math-expression', expectedExpression.trim());
                    // Mark as recently processed to prevent loops
                    element.setAttribute('data-last-processed', now.toString());
                }

                // Always update the last-processed timestamp
                element.setAttribute('data-last-processed', now.toString());
            }
        } catch (error) {
            console.error('Error processing math in editor:', error);
        }
    }

    /**
     * Set up event handlers on math field elements
     */
    setupEventHandlers(
        mathFieldElement: HTMLElement,
        expression: string,
        editor: Editor,
        onClick: (element: HTMLElement, expr: string) => void,
    ): void {
        const mathField = mathFieldElement as MathFieldElement;

        // Override MathLive's event handlers to prevent interference
        ['focus', 'mousedown', 'touchstart', 'pointerdown', 'click'].forEach((eventType) => {
            mathField.addEventListener(
                eventType,
                (e: Event) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    if (eventType === 'click') {
                        // Manually trigger our handler
                        setTimeout(() => onClick(mathFieldElement, expression), 1);
                    }
                },
                true,
            );
        });

        // Add hover effects for editability indication
        mathFieldElement.style.cursor = 'pointer';
        mathFieldElement.style.pointerEvents = 'all';
        mathFieldElement.title = 'Click or double-click to edit formula';

        mathFieldElement.addEventListener('mouseenter', () => {
            mathFieldElement.style.backgroundColor = '#e6f3ff';
            mathFieldElement.style.borderRadius = '4px';
            mathFieldElement.style.boxShadow = '0 0 0 1px #0066cc';
        });

        mathFieldElement.addEventListener('mouseleave', () => {
            mathFieldElement.style.backgroundColor = 'transparent';
            mathFieldElement.style.boxShadow = 'none';
        });

        // Ensure proper styling
        mathFieldElement.style.position = 'relative';
        mathFieldElement.style.cursor = 'pointer';
    }

    /**
     * Initialize or reinitialize a math-field element with MathLive
     */
    private async initializeMathField(
        element: HTMLElement,
        expression: string,
        editor: Editor,
        isReInitialization: boolean = false,
    ): Promise<void> {
        try {
            // Load MathLive dynamically
            await import('mathlive');

            if (typeof window !== 'undefined' && window.MathfieldElement) {
                // For re-initialization, aggressively clear MathLive internal state (but keep DOM element)
                if (isReInitialization) {
                    const mathField = element as MathFieldElement;
                    try {
                        // Step 1: Clear all MathLive internal state
                        mathField.value = '';
                        mathField.textContent = '';
                        mathField.innerHTML = '';

                        // Step 2: Force disconnect from MathLive
                        if (mathField.disconnectedCallback && typeof mathField.disconnectedCallback === 'function') {
                            mathField.disconnectedCallback();
                        }

                        // Step 3: Clear MathLive internal properties (if they exist)
                        ['_model', '_editor', '_options', '_listeners', '_style', '_dirty'].forEach((prop) => {
                            if (mathField[prop]) {
                                mathField[prop] = null;
                            }
                        });

                        // Step 4: Remove all attributes to force fresh initialization
                        const attributesToKeep = ['class', 'style', 'data-math-expression'];
                        const attributesToRemove = [];
                        for (let i = 0; i < element.attributes.length; i++) {
                            const attr = element.attributes[i];
                            if (!attributesToKeep.includes(attr.name)) {
                                attributesToRemove.push(attr.name);
                            }
                        }
                        attributesToRemove.forEach((attr) => element.removeAttribute(attr));
                    } catch (error) {
                        console.warn('⚠️ Error during MathLive reset:', error);
                    }
                }

                // The element is already a math-field, just configure it
                const mathField = element as MathFieldElement;

                // Clear existing content and set the expression
                mathField.textContent = '';
                mathField.value = expression;
                mathField.readOnly = true;
                mathField.setAttribute('math-virtual-keyboard-policy', 'off');

                // Use the element directly - no more cloning since it breaks CKEditor's DOM mapping
                const freshElement = element;

                // Configure the math-field with multiple robust attempts
                const freshMathField = freshElement as MathFieldElement;

                // Method 1: Direct value assignment
                freshMathField.value = expression;
                freshMathField.readOnly = true;
                freshMathField.setAttribute('math-virtual-keyboard-policy', 'off');
                freshMathField.setAttribute('contenteditable', 'false');

                // Method 2: Also set as text content for fallback
                if (freshElement.textContent !== expression) {
                    freshElement.textContent = expression;
                }

                // Method 3: Force render/update if available
                if (freshMathField.render && typeof freshMathField.render === 'function') {
                    freshMathField.render();
                }

                if (freshMathField.update && typeof freshMathField.update === 'function') {
                    freshMathField.update();
                }

                // Method 4: Aggressive multi-stage value enforcement to fight MathLive's async behavior
                this.enforceValueMultipleTimes(freshElement, freshMathField, expression, editor);

                // Set additional MathLive attributes to prevent interaction
                freshMathField.setAttribute('tabindex', '-1');
                freshMathField.style.userSelect = 'none';
                freshMathField.style.webkitUserSelect = 'none';

                // Completely disable MathLive's event handling
                Object.defineProperty(freshMathField, 'hasFocus', {
                    value: false,
                    writable: false,
                });

                // Disable any focus or selection within MathLive
                if (freshMathField.blur) {
                    freshMathField.blur();
                }

                // Ensure proper styling
                freshElement.style.position = 'relative';
                freshElement.style.cursor = 'pointer';
                freshElement.style.minWidth = '20px';
                freshElement.style.minHeight = '20px';
                freshElement.style.display = 'inline-block';
            } else {
                console.warn('MathfieldElement not available, showing LaTeX');
                // Keep the LaTeX as text content if MathLive is not available
                element.textContent = expression;
            }
        } catch (error) {
            console.error('Failed to initialize math-field element:', error);
            // Keep the LaTeX as text content on error
            element.textContent = expression;
        }
    }

    /**
     * Enforce value multiple times with exponential backoff
     */
    private enforceValueMultipleTimes(
        freshElement: HTMLElement,
        freshMathField: MathFieldElement,
        targetValue: string,
        editor: Editor,
        attempts: number = 0,
    ): void {
        if (attempts > 10) {
            return;
        }

        // Manual exponential backoff calculation to avoid TypeScript issues
        let exponential = 50;
        for (let i = 0; i < attempts; i++) {
            exponential = exponential * 1.5;
        }
        const delay = exponential > 500 ? 500 : exponential;
        setTimeout(() => {
            // Check both value AND visual display
            const currentTextContent = freshElement.textContent || '';
            const valueMatches = freshMathField.value === targetValue;
            const displayMatches = currentTextContent === targetValue;

            if (!valueMatches || !displayMatches) {
                // NUCLEAR OPTION: CKEditor-aware element replacement
                if (attempts >= 2) {
                    try {
                        // Step 1: Stop all processing to prevent interference
                        freshElement.setAttribute('data-nuclear-in-progress', 'true');

                        // Step 2: Force CKEditor to update its view from model first
                        if (editor && editor.editing && editor.editing.view) {
                            editor.editing.view.forceRender();
                        }

                        // Step 3: Create new element with all correct attributes
                        const newMathField = document.createElement('math-field') as MathFieldElement;
                        newMathField.className = freshElement.className;
                        newMathField.setAttribute('data-math-expression', targetValue);
                        newMathField.setAttribute('data-math-initialized', 'true');
                        newMathField.setAttribute('data-last-processed', Date.now().toString());
                        newMathField.setAttribute('read-only', '');
                        newMathField.style.cssText = freshElement.style.cssText;

                        // Step 4: Initialize MathLive immediately with correct value
                        newMathField.value = targetValue;
                        newMathField.readOnly = true;
                        newMathField.textContent = targetValue;

                        // Step 5: Replace in DOM
                        const parent = freshElement.parentNode;
                        if (parent) {
                            parent.replaceChild(newMathField, freshElement);

                            // Step 6: Force MathLive to render and verify
                            setTimeout(() => {
                                if (newMathField.value !== targetValue) {
                                    newMathField.value = targetValue;
                                }

                                // Step 7: Force CKEditor to sync its model with the new DOM state
                                setTimeout(() => {
                                    if (editor && editor.model && editor.editing) {
                                        try {
                                            // Find the model element and update it
                                            const editingView = editor.editing.view;
                                            const viewElement = editingView.domConverter.mapDomToView(newMathField);
                                            // Check if viewElement is an Element (not DocumentFragment)
                                            if (viewElement && !('getChild' in viewElement)) {
                                                const modelElement = editor.editing.mapper.toModelElement(
                                                    viewElement as ViewElement,
                                                );
                                                if (modelElement) {
                                                    editor.model.change((writer: ModelWriter) => {
                                                        writer.setAttribute(
                                                            'mathExpression',
                                                            targetValue,
                                                            modelElement,
                                                        );
                                                    });
                                                }
                                            }
                                        } catch (syncError) {
                                            console.warn('⚠️ CKEditor model sync failed:', syncError);
                                        }
                                    }
                                }, 50);
                            }, 10);

                            return; // Success, exit completely
                        }
                    } catch (error) {
                        console.error('💥 Nuclear replacement failed:', error);
                        // Remove the in-progress flag on error
                        freshElement.removeAttribute('data-nuclear-in-progress');
                    }
                }

                // Fallback: Try comprehensive re-rendering (only for first 2 attempts)
                try {
                    // Clear and reset
                    freshMathField.value = '';
                    freshMathField.textContent = '';

                    if (freshMathField.disconnectedCallback) {
                        freshMathField.disconnectedCallback();
                    }

                    setTimeout(() => {
                        freshMathField.value = targetValue;

                        // Try key rendering methods only
                        ['render', '_render', 'invalidate'].forEach((method) => {
                            if (freshMathField[method] && typeof freshMathField[method] === 'function') {
                                try {
                                    freshMathField[method]();
                                } catch {
                                    // Continue
                                }
                            }
                        });

                        this.enforceValueMultipleTimes(freshElement, freshMathField, targetValue, editor, attempts + 1);
                    }, 50);
                } catch (error) {
                    console.warn('⚠️ Error during re-rendering:', error);
                    this.enforceValueMultipleTimes(freshElement, freshMathField, targetValue, editor, attempts + 1);
                }
            }
        }, delay);
    }
}
