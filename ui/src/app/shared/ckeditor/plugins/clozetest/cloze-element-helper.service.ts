// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Editor, findAttributeRange, ViewElement, Writer } from 'ckeditor5';

/**
 * Type for CKEditor view elements with common properties
 */
type ViewElementLike = {
    name?: string;
    hasClass?: (className: string) => boolean;
    getAttribute?: (name: string) => string | null;
    parent?: ViewElementLike | null;
};

/**
 * Helper service for finding and selecting cloze test elements in CKEditor
 */
export class ClozeElementHelperService {
    /**
     * Find cloze element in the CKEditor view tree
     */
    findClozeElementInView(viewElement: ViewElementLike): ViewElementLike | null {
        let currentElement: ViewElementLike | null | undefined = viewElement;

        // Search up the DOM tree for span with cloze attribute
        while (currentElement) {
            if (currentElement.name === 'span') {
                // Check for cloze attribute (could be "true" or an actual value)
                const clozeAttr = currentElement.getAttribute ? currentElement.getAttribute('cloze') : null;
                const hasClass = currentElement.hasClass ? currentElement.hasClass('marker') : false;

                if (clozeAttr !== null || hasClass) {
                    return currentElement;
                }
            }
            currentElement = currentElement.parent;
        }

        return null;
    }

    /**
     * Select a cloze element in the model
     */
    selectClozeElement(editor: Editor, clozeViewElement: ViewElement): boolean {
        try {
            const model = editor.model;
            const mapper = editor.editing.mapper;

            // Get the model position from the view element
            const viewPosition = editor.editing.view.createPositionAt(clozeViewElement, 0);
            const modelPosition = mapper.toModelPosition(viewPosition);

            if (modelPosition) {
                // Look at the node before or after the position
                const nodeBefore = modelPosition.nodeBefore;
                const nodeAfter = modelPosition.nodeAfter;
                const parent = modelPosition.parent;

                // Try to find the ctCaseSensitive or ctCloze attribute
                let caseSensitiveValue;
                let searchPosition = modelPosition;

                if (nodeBefore && nodeBefore.hasAttribute('ctCaseSensitive')) {
                    caseSensitiveValue = nodeBefore.getAttribute('ctCaseSensitive');
                    searchPosition = model.createPositionBefore(nodeBefore);
                } else if (nodeAfter && nodeAfter.hasAttribute('ctCaseSensitive')) {
                    caseSensitiveValue = nodeAfter.getAttribute('ctCaseSensitive');
                    searchPosition = model.createPositionBefore(nodeAfter);
                } else if (parent && parent.is('$text') && parent.hasAttribute('ctCaseSensitive')) {
                    caseSensitiveValue = parent.getAttribute('ctCaseSensitive');
                } else {
                    // Try with ctCloze as fallback
                    if (nodeBefore && nodeBefore.hasAttribute('ctCloze')) {
                        caseSensitiveValue = nodeBefore.getAttribute('ctCaseSensitive');
                        searchPosition = model.createPositionBefore(nodeBefore);
                    } else if (nodeAfter && nodeAfter.hasAttribute('ctCloze')) {
                        caseSensitiveValue = nodeAfter.getAttribute('ctCaseSensitive');
                        searchPosition = model.createPositionBefore(nodeAfter);
                    }
                }

                if (caseSensitiveValue !== undefined) {
                    const attributeRange = findAttributeRange(
                        searchPosition,
                        'ctCaseSensitive',
                        caseSensitiveValue,
                        model,
                    );

                    if (attributeRange) {
                        model.change((writer: Writer) => {
                            writer.setSelection(attributeRange);
                        });
                        return true;
                    }
                }
            }

            console.warn('Could not select cloze element');
            return false;
        } catch (error) {
            console.error('Error selecting cloze element:', error);
            return false;
        }
    }

    /**
     * Get ClozeUI plugin from editor
     */
    getClozeUI(editor: Editor): { showUI: () => void } | null {
        // Try to find the ClozeUI plugin by iterating through all plugins
        for (const [, plugin] of editor.plugins) {
            if (plugin.constructor.name === 'ClozeUI' && 'showUI' in plugin && typeof plugin.showUI === 'function') {
                return plugin as { showUI: () => void };
            }
        }
        return null;
    }

    /**
     * Open the cloze dialog by calling the ClozeUI's showUI method
     */
    openClozeDialog(editor: Editor): void {
        try {
            // Find the ClozeUI plugin
            const clozeUI = this.getClozeUI(editor);
            if (clozeUI) {
                // Call showUI directly
                clozeUI.showUI();
            } else {
                console.warn('ClozeUI plugin not found');
            }
        } catch (error) {
            console.error('Error opening cloze dialog:', error);
        }
    }
}
