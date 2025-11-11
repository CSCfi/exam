// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Editor, ViewElement, Writer } from 'ckeditor5';

/**
 * Type for CKEditor view elements with common properties
 */
type ViewElementLike = {
    name?: string;
    hasClass?: (className: string) => boolean;
    getChild?: (index: number) => ViewElementLike | undefined;
    getAttribute?: (name: string) => string | null;
    parent?: ViewElementLike | null;
};

/**
 * Helper service for finding and selecting math elements in CKEditor
 */
export class MathElementHelperService {
    /**
     * Find math element in the CKEditor view tree
     */
    findMathElementInView(viewElement: ViewElementLike): ViewElementLike | null {
        let mathElement: ViewElementLike | null = null;
        let currentElement: ViewElementLike | null | undefined = viewElement;

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
                const child = currentElement.getChild(0);
                if (child) {
                    mathElement = child;
                }
            }
            currentElement = currentElement.parent;
        }

        return mathElement;
    }

    /**
     * Select a math model element from view element
     */
    selectMathModelElement(editor: Editor, mathViewElement: ViewElement): boolean {
        let modelElement = editor.editing.mapper.toModelElement(mathViewElement);
        if (!modelElement && mathViewElement.parent && 'name' in mathViewElement.parent) {
            modelElement = editor.editing.mapper.toModelElement(mathViewElement.parent as ViewElement);
        }

        if (modelElement && modelElement.is('element', 'mathField')) {
            editor.model.change((writer: Writer) => {
                writer.setSelection(modelElement, 'on');
            });
            return true;
        }
        return false;
    }

    /**
     * Find and select math element by expression
     */
    findAndSelectMathByExpression(editor: Editor, expression: string): boolean {
        try {
            const model = editor.model;
            const root = model.document.getRoot();
            if (!root) {
                return false;
            }

            // Walk through the document to find matching math elements
            const walker = model.createRangeIn(root).getWalker({ ignoreElementEnd: true });

            for (const item of walker) {
                if (item.item.is('element', 'mathField')) {
                    const itemExpression = item.item.getAttribute('mathExpression');
                    if (itemExpression === expression) {
                        // Select this element - item.item is an Item, but if it's an element we can use it directly
                        const element = item.item.is('element') ? item.item : null;
                        if (element) {
                            model.change((writer: Writer) => {
                                writer.setSelection(element, 'on');
                            });
                            return true;
                        }
                    }
                }
            }

            console.warn('Could not find matching math element in model');
            return false;
        } catch (error) {
            console.error('Error in findAndSelectMathByExpression:', error);
            return false;
        }
    }

    /**
     * Get MathUI plugin from editor
     */
    getMathUI(editor: Editor): {
        showUI: () => void;
        _balloon?: { visibleView?: unknown; on: (event: string, callback: () => void) => void };
    } | null {
        // Try to find the MathUI plugin by iterating through all plugins
        for (const [, plugin] of editor.plugins) {
            if (plugin.constructor.name === 'MathUI' && 'showUI' in plugin && typeof plugin.showUI === 'function') {
                return plugin as {
                    showUI: () => void;
                    _balloon?: { visibleView?: unknown; on: (event: string, callback: () => void) => void };
                };
            }
        }
        return null;
    }

    /**
     * Open the math dialog
     */
    openMathDialog(editor: Editor, context: string): void {
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
                    const expression = (selectedElement.getAttribute('mathExpression') as string) || '';
                    const renderer = (selectedElement.getAttribute('mathRenderer') as string) || 'mathlive';

                    // Temporarily set the command value manually
                    (mathCommand as { value?: { expression: string; renderer: string } }).value = {
                        expression,
                        renderer,
                    };
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
                            setTimeout(() => {
                                // This will be handled by the component's processMathInEditor
                            }, 50);
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

    /**
     * Handle math field click event
     */
    handleMathFieldClick(editor: Editor, mathFieldElement: HTMLElement, expression: string): void {
        try {
            // Find the view element that corresponds to this DOM element
            const editingView = editor.editing.view;
            const viewElement = editingView.domConverter.mapDomToView(mathFieldElement);

            // Check if viewElement is an Element (not DocumentFragment)
            if (viewElement && !('getChild' in viewElement)) {
                // Select the model element and open dialog if successful
                if (this.selectMathModelElement(editor, viewElement as ViewElement)) {
                    // Open the dialog after selection
                    setTimeout(() => this.openMathDialog(editor, 'direct-click'), 10);
                } else {
                    console.warn('Could not find model element via DOM mapping, trying alternative method');
                    // Alternative: try to find by expression match
                    if (this.findAndSelectMathByExpression(editor, expression)) {
                        setTimeout(() => this.openMathDialog(editor, 'search-and-select'), 10);
                    }
                }
            } else {
                console.warn('Could not map DOM element to view element');
                // Alternative: try to find by expression match
                if (this.findAndSelectMathByExpression(editor, expression)) {
                    setTimeout(() => this.openMathDialog(editor, 'search-and-select'), 10);
                }
            }
        } catch (error) {
            console.error('Error in handleMathFieldClick:', error);
            // Fallback: try to find by expression match
            if (this.findAndSelectMathByExpression(editor, expression)) {
                setTimeout(() => this.openMathDialog(editor, 'search-and-select'), 10);
            }
        }
    }
}
