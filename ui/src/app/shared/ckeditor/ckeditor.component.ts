// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlurEvent, ChangeEvent, CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { TranslateService } from '@ngx-translate/core';
import {
    AccessibilityHelp,
    Alignment,
    Autoformat,
    AutoLink,
    Autosave,
    BalloonToolbar,
    BlockQuote,
    Bold,
    ClassicEditor,
    Code,
    CodeBlock,
    Editor,
    EditorConfig,
    Essentials,
    FindAndReplace,
    GeneralHtmlSupport,
    Heading,
    Highlight,
    HorizontalLine,
    Indent,
    IndentBlock,
    Italic,
    Link,
    List,
    ListProperties,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SelectAll,
    SourceEditing,
    SpecialCharacters,
    SpecialCharactersArrows,
    SpecialCharactersCurrency,
    SpecialCharactersEssentials,
    SpecialCharactersLatin,
    SpecialCharactersMathematical,
    SpecialCharactersText,
    Strikethrough,
    Subscript,
    Superscript,
    Table,
    TableCaption,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    TextTransformation,
    TodoList,
    Underline,
    Undo,
    WordCount,
} from 'ckeditor5';
import i18nEn from 'ckeditor5/translations/en.js';
import i18nFi from 'ckeditor5/translations/fi.js';
import i18nSv from 'ckeditor5/translations/sv.js';
import { Cloze } from './plugins/clozetest/plugin';
import { Math } from './plugins/math/plugin';

@Component({
    selector: 'xm-ckeditor',
    template: `<div id="editor">
        <ckeditor
            *ngIf="isLayoutReady"
            #cke
            [required]="required"
            [editor]="editor"
            [config]="editorConfig"
            tagName="textarea"
            [(ngModel)]="data"
            (ready)="onReady($event)"
            (change)="onChange($event)"
            (blur)="onBlur($event)"
        ></ckeditor>
        <div [id]="id"></div>
    </div> `,
    standalone: true,
    imports: [FormsModule, NgIf, CKEditorModule],
})
export class CKEditorComponent implements AfterViewInit {
    @Input() data = '';
    @Input() required = false;
    @Input() enableClozeTest = false;
    @Input() id = 'word-count-id';
    @Output() dataChange = new EventEmitter<string>();

    editor = ClassicEditor;
    editorConfig!: EditorConfig;

    isLayoutReady = false;

    private changeDetector = inject(ChangeDetectorRef);
    private Translate = inject(TranslateService);

    ngAfterViewInit() {
        const toolbarItems = [
            'undo',
            'redo',
            'findAndReplace',
            '|',
            'link', // cloze plugin comes here if enabled
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            'strikethrough',
            'subscript',
            'superscript',
            'code',
            'removeFormat',
            '|',
            'math',
            'specialCharacters',
            'horizontalLine',
            'insertTable',
            'highlight',
            'blockQuote',
            'codeBlock',
            '|',
            'alignment',
            '|',
            'bulletedList',
            'numberedList',
            'todoList',
            'outdent',
            'indent',
            '|',
            'sourceEditing',
        ];
        if (this.enableClozeTest) {
            toolbarItems.splice(5, 0, 'cloze');
        }
        this.editorConfig = {
            toolbar: {
                items: toolbarItems,
                shouldNotGroupWhenFull: true,
            },
            plugins: [
                AccessibilityHelp,
                Alignment,
                Autoformat,
                AutoLink,
                Autosave,
                BalloonToolbar,
                BlockQuote,
                Bold,
                Code,
                CodeBlock,
                Essentials,
                FindAndReplace,
                GeneralHtmlSupport,
                Heading,
                Highlight,
                HorizontalLine,
                Indent,
                IndentBlock,
                Italic,
                Link,
                List,
                ListProperties,
                Paragraph,
                PasteFromOffice,
                RemoveFormat,
                SelectAll,
                SourceEditing,
                SpecialCharacters,
                SpecialCharactersArrows,
                SpecialCharactersCurrency,
                SpecialCharactersEssentials,
                SpecialCharactersLatin,
                SpecialCharactersMathematical,
                SpecialCharactersText,
                Strikethrough,
                Subscript,
                Superscript,
                Table,
                TableCaption,
                TableCellProperties,
                TableColumnResize,
                TableProperties,
                TableToolbar,
                TextTransformation,
                TodoList,
                Underline,
                Undo,
                WordCount,
                Cloze,
                Math,
            ],
            balloonToolbar: ['bold', 'italic', '|', 'link', '|', 'bulletedList', 'numberedList'],
            heading: {
                options: [
                    {
                        model: 'paragraph',
                        title: 'Paragraph',
                        class: 'ck-heading_paragraph',
                    },
                    {
                        model: 'heading1',
                        view: 'h1',
                        title: 'Heading 1',
                        class: 'ck-heading_heading1',
                    },
                    {
                        model: 'heading2',
                        view: 'h2',
                        title: 'Heading 2',
                        class: 'ck-heading_heading2',
                    },
                    {
                        model: 'heading3',
                        view: 'h3',
                        title: 'Heading 3',
                        class: 'ck-heading_heading3',
                    },
                    {
                        model: 'heading4',
                        view: 'h4',
                        title: 'Heading 4',
                        class: 'ck-heading_heading4',
                    },
                    {
                        model: 'heading5',
                        view: 'h5',
                        title: 'Heading 5',
                        class: 'ck-heading_heading5',
                    },
                    {
                        model: 'heading6',
                        view: 'h6',
                        title: 'Heading 6',
                        class: 'ck-heading_heading6',
                    },
                ],
            },
            htmlSupport: {
                allow: [
                    {
                        name: /^.*$/,
                        styles: true,
                        attributes: true,
                        classes: true,
                    },
                ],
            },
            link: {
                addTargetToExternalLinks: true,
                defaultProtocol: 'https://',
                decorators: {
                    toggleDownloadable: {
                        mode: 'manual',
                        label: 'Downloadable',
                        attributes: {
                            download: 'file',
                        },
                    },
                },
            },
            menuBar: {
                isVisible: true,
            },
            language: { ui: this.Translate.currentLang },
            placeholder: this.Translate.instant('i18n_content_goes_here'),
            table: {
                contentToolbar: [
                    'tableColumn',
                    'tableRow',
                    'mergeTableCells',
                    'tableProperties',
                    'tableCellProperties',
                ],
            },
            translations: [i18nFi, i18nSv, i18nEn],
        };
        this.isLayoutReady = true;
        this.changeDetector.detectChanges();
    }

    onReady(e: Editor) {
        // Store editor instance globally for nuclear replacement access
        (window as any).ckeditorInstance = e;

        const wordCountPlugin = e.plugins.get('WordCount');
        const wordCountWrapper = document.getElementById(this.id) as HTMLElement;
        wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer);

        // Process any existing math elements after editor is ready
        setTimeout(() => this.processMathInEditor(e), 200);

        // Add CSS to ensure math elements are clickable
        const style = document.createElement('style');
        style.textContent = `
            .ck-editor__editable math-field {
                pointer-events: all !important;
                cursor: pointer !important;
                display: inline-block !important;
                min-width: 20px !important;
                min-height: 20px !important;
                position: relative !important;
            }
            .ck-editor__editable .ck-widget.math-element-selectable {
                pointer-events: all !important;
                cursor: pointer !important;
            }
            .ck-editor__editable math-field > div {
                pointer-events: all !important;
                cursor: pointer !important;
            }
        `;
        document.head.appendChild(style);

        // Listen for command execution (when math dialog saves) - this is the most reliable trigger
        const mathCommand = e.commands.get('insertMath');
        if (mathCommand) {
            mathCommand.on('execute', () => {
                // Single processing trigger with reasonable delay to let CKEditor update the view
                setTimeout(() => {
                    this.processMathInEditor(e);
                }, 100);
            });
        }

        // More conservative model change listener to avoid excessive processing
        let processingTimeout: any = null;
        let lastProcessingTime = 0;
        e.model.document.on('change:data', () => {
            // Debounce and throttle the processing to avoid excessive re-initialization
            const now = Date.now();
            if (processingTimeout) clearTimeout(processingTimeout);

            // Only process if it's been at least 500ms since last processing
            const timeSinceLastProcessing = now - lastProcessingTime;
            const delay = timeSinceLastProcessing > 500 ? 100 : 500;

            processingTimeout = setTimeout(() => {
                lastProcessingTime = Date.now();
                this.processMathInEditor(e);
            }, delay);
        });

        // Add double-click handler for math elements (more standard for widget editing)
        e.editing.view.document.on(
            'dblclick',
            (evt: any, data: any) => {
                const viewElement = data.target;
                const mathElement = this.findMathElementInView(viewElement);

                if (mathElement) {
                    // Prevent default behavior
                    data.preventDefault();
                    evt.stop();

                    // Select the model element and open dialog if successful
                    if (this.selectMathModelElement(e, mathElement)) {
                        // Give the selection time to propagate before opening dialog
                        setTimeout(() => this.openMathDialog(e, 'double-click'), 50);
                    } else {
                        console.warn('Could not find mathField model element for double-click');
                    }
                }
            },
            { priority: 'highest' },
        );

        // Add single-click handler for math elements (for direct editing)
        e.editing.view.document.on(
            'click',
            (evt: any, data: any) => {
                const viewElement = data.target;
                const mathElement = this.findMathElementInView(viewElement);

                if (mathElement) {
                    // Select the model element and open dialog if successful
                    if (this.selectMathModelElement(e, mathElement)) {
                        // Give the selection time to propagate before opening dialog
                        setTimeout(() => this.openMathDialog(e, 'single-click'), 50);
                    } else {
                        console.warn('Could not find mathField model element');
                    }
                }
            },
            { priority: 'high' },
        );
    }

    onChange({ editor }: ChangeEvent) {
        if (!editor) {
            console.warn('CKEditor onChange called but editor is undefined');
            return;
        }

        const data = editor.getData();
        this.dataChange.emit(data);
        // Note: Math processing is handled by the debounced change:data listener in onReady
    }

    onBlur({ editor }: BlurEvent) {
        if (!editor) {
            console.warn('CKEditor onBlur called but editor is undefined');
            return;
        }

        const data = editor.getData();
        this.dataChange.emit(data);
        // Note: Math processing is handled by the debounced change:data listener in onReady
    }

    /**
     * Manually trigger math processing - useful for debugging or forcing updates
     */
    public forceMathProcessing(): void {
        if (this.editor) {
            this.processMathInEditor(this.editor);
        } else {
            console.warn('⚠️ Cannot force math processing - editor not available');
        }
    }

    private async processMathInEditor(editor: any) {
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
                    const editingView = editor.editing.view;
                    const viewElement = editingView.domConverter.mapDomToView(element);
                    if (viewElement) {
                        const modelElement = editor.editing.mapper.toModelElement(viewElement);
                        if (modelElement && modelElement.is('element', 'mathField')) {
                            expectedExpression = modelElement.getAttribute('mathExpression') || '';
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
                const mathFieldElement = element as any;
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

    private async initializeMathField(
        element: HTMLElement,
        expression: string,
        editor: any,
        isReInitialization: boolean = false,
    ) {
        try {
            // Load MathLive dynamically
            await import('mathlive');

            if (typeof window !== 'undefined' && window.MathfieldElement) {
                // For re-initialization, aggressively clear MathLive internal state (but keep DOM element)
                if (isReInitialization) {
                    const mathField = element as any;
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
                const mathField = element as any;

                // Clear existing content and set the expression
                mathField.textContent = '';
                mathField.value = expression;
                mathField.readOnly = true;
                mathField.setAttribute('math-virtual-keyboard-policy', 'off');

                // Use the element directly - no more cloning since it breaks CKEditor's DOM mapping
                const freshElement = element;

                // Configure the math-field with multiple robust attempts
                const freshMathField = freshElement as any;

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
                const enforceValueMultipleTimes = (targetValue: string, attempts: number = 0) => {
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
                                    const editor = (window as any).ckeditorInstance;
                                    if (editor && editor.editing && editor.editing.view) {
                                        editor.editing.view.forceRender();
                                    }

                                    // Step 3: Create new element with all correct attributes
                                    const newMathField = document.createElement('math-field') as any;
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

                                        // Step 6: Set up click handlers on new element (crucial for subsequent clicks)
                                        this.setupMathFieldEventHandlers(newMathField, targetValue, editor);

                                        // Step 7: Force MathLive to render and verify
                                        setTimeout(() => {
                                            if (newMathField.value !== targetValue) {
                                                newMathField.value = targetValue;
                                            }

                                            // Step 8: Force CKEditor to sync its model with the new DOM state
                                            setTimeout(() => {
                                                if (editor && editor.model && editor.editing) {
                                                    try {
                                                        // Find the model element and update it
                                                        const editingView = editor.editing.view;
                                                        const viewElement =
                                                            editingView.domConverter.mapDomToView(newMathField);
                                                        if (viewElement) {
                                                            const modelElement =
                                                                editor.editing.mapper.toModelElement(viewElement);
                                                            if (modelElement) {
                                                                editor.model.change((writer: any) => {
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

                                    enforceValueMultipleTimes(targetValue, attempts + 1);
                                }, 50);
                            } catch (error) {
                                console.warn('⚠️ Error during re-rendering:', error);
                                enforceValueMultipleTimes(targetValue, attempts + 1);
                            }
                        }
                    }, delay);
                };

                // Start the multi-stage enforcement
                enforceValueMultipleTimes(expression);

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

                // Override MathLive's event handlers
                ['focus', 'mousedown', 'touchstart', 'pointerdown', 'click'].forEach((eventType) => {
                    freshMathField.addEventListener(
                        eventType,
                        (e: Event) => {
                            e.preventDefault();
                            e.stopImmediatePropagation();

                            if (eventType === 'click') {
                                // Manually trigger our handler
                                setTimeout(() => this.handleMathFieldClick(editor, freshElement, expression), 1);
                            }
                        },
                        true,
                    );
                });

                // Add hover effects for editability indication
                freshElement.style.cursor = 'pointer';
                freshElement.style.pointerEvents = 'all'; // Ensure clicks are detected
                freshElement.title = 'Click or double-click to edit formula';

                freshElement.addEventListener('mouseenter', () => {
                    freshElement.style.backgroundColor = '#e6f3ff';
                    freshElement.style.borderRadius = '4px';
                    freshElement.style.boxShadow = '0 0 0 1px #0066cc';
                });

                freshElement.addEventListener('mouseleave', () => {
                    freshElement.style.backgroundColor = 'transparent';
                    freshElement.style.boxShadow = 'none';
                });

                // Ensure the math-field itself is properly clickable without needing an overlay
                freshElement.style.position = 'relative';
                freshElement.style.cursor = 'pointer';
                freshElement.style.minWidth = '20px';
                freshElement.style.minHeight = '20px';
                freshElement.style.display = 'inline-block';

                // The CKEditor click handlers should be sufficient - no need for overlay backup
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
     * Helper method to find math element in the CKEditor view tree
     */
    private findMathElementInView(viewElement: any): any {
        let mathElement = null;
        let currentElement = viewElement;

        // Search up the DOM tree for math-field or widget with math-field
        while (currentElement && !mathElement) {
            if (currentElement.name === 'math-field') {
                mathElement = currentElement;
            } else if (
                currentElement.hasClass &&
                currentElement.hasClass('ck-widget') &&
                currentElement.getChild &&
                currentElement.getChild(0)?.name === 'math-field'
            ) {
                mathElement = currentElement.getChild(0);
            }
            currentElement = currentElement.parent;
        }

        return mathElement;
    }

    /**
     * Helper method to select a math model element from view element
     */
    private selectMathModelElement(editor: any, mathViewElement: any): boolean {
        const modelElement =
            editor.editing.mapper.toModelElement(mathViewElement) ||
            (mathViewElement.parent ? editor.editing.mapper.toModelElement(mathViewElement.parent) : null);

        if (modelElement && modelElement.is('element', 'mathField')) {
            editor.model.change((writer: any) => {
                writer.setSelection(modelElement, 'on');
            });
            return true;
        }
        return false;
    }

    private getMathUI(editor: any) {
        // Try to find the MathUI plugin by iterating through all plugins
        for (const [, plugin] of editor.plugins) {
            if (plugin.constructor.name === 'MathUI') {
                return plugin;
            }
        }
        return null;
    }

    private handleMathFieldClick(editor: any, mathFieldElement: HTMLElement, expression: string) {
        try {
            // Find the view element that corresponds to this DOM element
            const editingView = editor.editing.view;
            const viewElement = editingView.domConverter.mapDomToView(mathFieldElement);

            if (viewElement) {
                // Select the model element and open dialog if successful
                if (this.selectMathModelElement(editor, viewElement)) {
                    // Open the dialog after selection
                    setTimeout(() => this.openMathDialog(editor, 'direct-click'), 10);
                } else {
                    console.warn('Could not find model element via DOM mapping, trying alternative method');
                    // Alternative: try to find by expression match
                    this.findAndSelectMathByExpression(editor, expression);
                }
            } else {
                console.warn('Could not map DOM element to view element');
                // Alternative: try to find by expression match
                this.findAndSelectMathByExpression(editor, expression);
            }
        } catch (error) {
            console.error('Error in handleMathFieldClick:', error);
            // Fallback: try to find by expression match
            this.findAndSelectMathByExpression(editor, expression);
        }
    }

    private findAndSelectMathByExpression(editor: any, expression: string) {
        try {
            const model = editor.model;
            const root = model.document.getRoot();

            // Walk through the document to find matching math elements
            const walker = model.createRangeIn(root).getWalker({ ignoreElementEnd: true });

            for (const item of walker) {
                if (item.item.is('element', 'mathField')) {
                    const itemExpression = item.item.getAttribute('mathExpression');
                    if (itemExpression === expression) {
                        // Select this element
                        model.change((writer: any) => {
                            writer.setSelection(item.item, 'on');
                        });

                        // Open dialog
                        setTimeout(() => this.openMathDialog(editor, 'search-and-select'), 10);
                        return;
                    }
                }
            }

            console.warn('Could not find matching math element in model');
        } catch (error) {
            console.error('Error in findAndSelectMathByExpression:', error);
        }
    }

    private openMathDialog(editor: any, context: string) {
        try {
            // Debug the current selection and command state
            const selection = editor.model.document.selection;
            const selectedElement = selection.getSelectedElement();
            const mathCommand = editor.commands.get('insertMath');

            // Force refresh the command to ensure it detects the selection
            if (mathCommand) {
                mathCommand.refresh();

                // If we still don't have a command value but we have a selected math element, force it
                if (!mathCommand.value && selectedElement && selectedElement.is('element', 'mathField')) {
                    const expression = selectedElement.getAttribute('mathExpression') || '';
                    const renderer = selectedElement.getAttribute('mathRenderer') || 'mathlive';

                    // Temporarily set the command value manually
                    (mathCommand as any).value = { expression, renderer };
                }
            }

            const mathUI = this.getMathUI(editor);
            if (mathUI && typeof mathUI.showUI === 'function') {
                mathUI.showUI();

                // Add a listener for when the dialog closes to ensure processing
                if (mathUI._balloon && mathUI._balloon.visibleView) {
                    const balloon = mathUI._balloon;
                    // Listen for balloon hide events
                    balloon.on('change:visibleView', () => {
                        if (!balloon.visibleView) {
                            setTimeout(() => this.processMathInEditor(editor), 50);
                        }
                    });
                }
            } else {
                // Alternative: Use the command directly - this will trigger the UI
                editor.execute('insertMath');
            }
        } catch (error) {
            console.error(`Error accessing math UI (${context}):`, error);
        }
    }

    private selectMathElement(editor: any, viewElement: HTMLElement) {
        try {
            // Convert DOM element back to view element
            const editingView = editor.editing.view;
            const viewElementInView = editingView.domConverter.mapDomToView(viewElement);

            if (viewElementInView) {
                // Convert view element to model element
                const modelElement = editor.editing.mapper.toModelElement(viewElementInView);

                if (modelElement) {
                    // Select the model element
                    editor.model.change((writer: any) => {
                        writer.setSelection(modelElement, 'on');
                    });
                } else {
                    console.warn('Could not find model element for view element');
                }
            } else {
                console.warn('Could not find view element in editing view');
            }
        } catch (error) {
            console.error('Error selecting math element:', error);
        }
    }

    /**
     * Set up event handlers on new math field elements (for nuclear replacement)
     */
    private setupMathFieldEventHandlers(mathFieldElement: HTMLElement, expression: string, editor: any) {
        const mathField = mathFieldElement as any;

        // Override MathLive's event handlers to prevent interference
        ['focus', 'mousedown', 'touchstart', 'pointerdown', 'click'].forEach((eventType) => {
            mathField.addEventListener(
                eventType,
                (e: Event) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    if (eventType === 'click') {
                        // Manually trigger our handler
                        setTimeout(() => this.handleMathFieldClick(editor, mathFieldElement, expression), 1);
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
}
