// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChangeDetectorRef } from '@angular/core';
import { Editor, ViewElement } from 'ckeditor5';
import { ClozeElementHelperService } from './plugins/clozetest/cloze-element-helper.service';
import { MathElementHelperService } from './plugins/math/math-element-helper.service';
import { MathFieldService } from './plugins/math/math-field.service';

/**
 * Service responsible for initializing CKEditor with all necessary event handlers,
 * math field processing, and shadow DOM styling.
 */
export class CKEditorInitializationService {
    private mathFieldService = new MathFieldService();
    private mathElementHelper = new MathElementHelperService();
    private clozeElementHelper = new ClozeElementHelperService();

    constructor(private changeDetector: ChangeDetectorRef) {}

    /**
     * Initialize the editor with all necessary setup
     */
    initializeEditor(editor: Editor, wordCountId: string): void {
        // Store editor instance globally for nuclear replacement access
        (window as any).ckeditorInstance = editor;

        this.setupWordCount(editor, wordCountId);
        this.setupMathFieldProcessing(editor);
        this.setupMathCommandListener(editor);
        this.setupModelChangeListener(editor);
        this.setupClickHandlers(editor);
        this.setupDoubleClickHandler(editor);
    }

    /**
     * Set up word count plugin display
     */
    private setupWordCount(editor: Editor, wordCountId: string): void {
        const wordCountPlugin = editor.plugins.get('WordCount');
        const wordCountWrapper = document.getElementById(wordCountId) as HTMLElement;
        if (wordCountWrapper) {
            wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer);
        }
    }

    /**
     * Set up initial math field processing and shadow DOM styling
     */
    private setupMathFieldProcessing(editor: Editor): void {
        // Process any existing math elements after editor is ready
        setTimeout(() => {
            this.mathFieldService.processMathInEditor(editor);
            this.changeDetector.markForCheck();
            // Inject cursor styles after math processing
            setTimeout(() => {
                this.injectHandlersAndStylesForMathFields(editor);
            }, 100);
        }, 200);
    }

    /**
     * Set up listener for math command execution (when math dialog saves)
     */
    private setupMathCommandListener(editor: Editor): void {
        const mathCommand = editor.commands.get('insertMath');
        if (mathCommand) {
            mathCommand.on('execute', () => {
                // Single processing trigger with reasonable delay to let CKEditor update the view
                setTimeout(() => {
                    this.mathFieldService.processMathInEditor(editor);
                    this.changeDetector.markForCheck();
                    // Inject cursor styles after math processing
                    setTimeout(() => {
                        this.injectHandlersAndStylesForMathFields(editor);
                    }, 100);
                }, 100);
            });
        }
    }

    /**
     * Set up debounced model change listener to avoid excessive processing
     */
    private setupModelChangeListener(editor: Editor): void {
        let processingTimeout: any = null;
        let lastProcessingTime = 0;

        editor.model.document.on('change:data', () => {
            // Debounce and throttle the processing to avoid excessive re-initialization
            const now = Date.now();
            if (processingTimeout) clearTimeout(processingTimeout);

            // Only process if it's been at least 500ms since last processing
            const timeSinceLastProcessing = now - lastProcessingTime;
            const delay = timeSinceLastProcessing > 500 ? 100 : 500;

            processingTimeout = setTimeout(() => {
                lastProcessingTime = Date.now();
                this.mathFieldService.processMathInEditor(editor);
                this.changeDetector.markForCheck();
                // Inject cursor styles after math processing
                setTimeout(() => {
                    this.injectHandlersAndStylesForMathFields(editor);
                }, 100);
            }, delay);
        });
    }

    /**
     * Set up click handlers for math and cloze elements
     */
    private setupClickHandlers(editor: Editor): void {
        editor.editing.view.document.on(
            'click',
            (evt: any, data: any) => {
                const viewElement = data.target;

                // Check for math elements first
                const mathElement = this.mathElementHelper.findMathElementInView(viewElement);
                if (mathElement) {
                    // Select the model element and open dialog if successful
                    if (this.mathElementHelper.selectMathModelElement(editor, mathElement as unknown as ViewElement)) {
                        // Give the selection time to propagate before opening dialog
                        setTimeout(() => {
                            this.mathElementHelper.openMathDialog(editor, 'single-click');
                            this.changeDetector.markForCheck();
                        }, 50);
                    } else {
                        console.warn('Could not find mathField model element');
                    }
                    return; // Don't check for cloze if we found math
                }

                // Check for cloze test elements
                const clozeElement = this.clozeElementHelper.findClozeElementInView(viewElement);
                if (clozeElement) {
                    // Select the cloze element first, then open the dialog
                    if (this.clozeElementHelper.selectClozeElement(editor, clozeElement as unknown as ViewElement)) {
                        setTimeout(() => {
                            this.clozeElementHelper.openClozeDialog(editor);
                            this.changeDetector.markForCheck();
                        }, 50);
                    }
                }
            },
            { priority: 'high' },
        );
    }

    /**
     * Set up double-click handler for math elements
     */
    private setupDoubleClickHandler(editor: Editor): void {
        editor.editing.view.document.on(
            'dblclick',
            (evt: any, data: any) => {
                const viewElement = data.target;
                const mathElement = this.mathElementHelper.findMathElementInView(viewElement);

                if (mathElement) {
                    // Prevent default behavior
                    data.preventDefault();
                    evt.stop();

                    // Select the model element and open dialog if successful
                    if (this.mathElementHelper.selectMathModelElement(editor, mathElement as unknown as ViewElement)) {
                        // Give the selection time to propagate before opening dialog
                        setTimeout(() => {
                            this.mathElementHelper.openMathDialog(editor, 'double-click');
                            this.changeDetector.markForCheck();
                        }, 50);
                    } else {
                        console.warn('Could not find mathField model element for double-click');
                    }
                }
            },
            { priority: 'highest' },
        );
    }

    /**
     * Inject cursor styles and click handlers into MathLive shadow DOM
     */
    private injectHandlersAndStylesForMathFields(editor: Editor): void {
        const viewRoot = editor.editing.view.document.getRoot();
        if (!viewRoot) return;
        const editable = editor.editing.view.domConverter.mapViewToDom(viewRoot);
        if (!editable) return;

        const mathFields = editable.querySelectorAll('math-field');
        mathFields.forEach((mathField) => {
            const mathFieldElement = mathField as HTMLElement;
            // Access shadow root if it exists
            const shadowRoot = mathFieldElement.shadowRoot;
            if (shadowRoot) {
                // Check if we've already injected styles and handlers
                if (shadowRoot.querySelector('style[data-cursor-fix]')) {
                    return;
                }

                // Inject cursor style into shadow DOM
                const shadowStyle = document.createElement('style');
                shadowStyle.setAttribute('data-cursor-fix', 'true');
                shadowStyle.textContent = `
                    * {
                        cursor: pointer !important;
                    }
                `;
                shadowRoot.appendChild(shadowStyle);

                // Get the math expression from the element
                const expression =
                    mathFieldElement.getAttribute('data-math-expression') ||
                    (mathFieldElement as any).value ||
                    mathFieldElement.textContent ||
                    '';

                // Add click handler to shadow DOM content to trigger math field click
                // This ensures clicks on text content inside shadow DOM also open the balloon
                const handleShadowClick = (event: Event) => {
                    // Stop the event from propagating to MathLive's handlers
                    event.stopPropagation();
                    event.preventDefault();

                    // Find the view element corresponding to this math-field
                    try {
                        const viewElement = editor.editing.view.domConverter.mapDomToView(mathFieldElement);
                        if (viewElement && !('getChild' in viewElement)) {
                            // Select the model element and open dialog
                            const mathElement = this.mathElementHelper.findMathElementInView(viewElement as any);
                            if (mathElement) {
                                if (
                                    this.mathElementHelper.selectMathModelElement(
                                        editor,
                                        mathElement as unknown as ViewElement,
                                    )
                                ) {
                                    setTimeout(() => {
                                        this.mathElementHelper.openMathDialog(editor, 'shadow-dom-click');
                                        this.changeDetector.markForCheck();
                                    }, 50);
                                }
                            }
                        } else {
                            // Fallback: try to find by expression
                            if (this.mathElementHelper.findAndSelectMathByExpression(editor, expression)) {
                                setTimeout(() => {
                                    this.mathElementHelper.openMathDialog(editor, 'shadow-dom-click-fallback');
                                    this.changeDetector.markForCheck();
                                }, 50);
                            }
                        }
                    } catch (error) {
                        console.warn('Error handling shadow DOM click:', error);
                        // Fallback: try to find by expression
                        if (this.mathElementHelper.findAndSelectMathByExpression(editor, expression)) {
                            setTimeout(() => {
                                this.mathElementHelper.openMathDialog(editor, 'shadow-dom-click-error-fallback');
                                this.changeDetector.markForCheck();
                            }, 50);
                        }
                    }
                };

                // Add click listener to shadow root with capture phase to catch all clicks
                shadowRoot.addEventListener('click', handleShadowClick, true);
                shadowRoot.addEventListener(
                    'mousedown',
                    (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    },
                    true,
                );
            }
        });
    }
}
