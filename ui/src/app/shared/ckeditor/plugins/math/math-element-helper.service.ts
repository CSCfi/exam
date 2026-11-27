// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Editor, ModelWriter, ViewElement } from 'ckeditor5';
import { MathUI } from './ui';

export class MathElementHelperService {
    selectMathModelElement(editor: Editor, mathViewElement: ViewElement): boolean {
        let modelElement = editor.editing.mapper.toModelElement(mathViewElement);
        if (!modelElement && mathViewElement.parent && 'name' in mathViewElement.parent) {
            modelElement = editor.editing.mapper.toModelElement(mathViewElement.parent as ViewElement);
        }

        if (modelElement && modelElement.is('element', 'mathField')) {
            editor.model.change((writer: ModelWriter) => {
                writer.setSelection(modelElement, 'on');
            });
            return true;
        }
        return false;
    }

    findAndSelectMathByExpression(editor: Editor, expression: string): boolean {
        try {
            const model = editor.model;
            const root = model.document.getRoot();
            if (!root) return false;

            const walker = model.createRangeIn(root).getWalker({ ignoreElementEnd: true });
            for (const item of walker) {
                if (item.item.is('element', 'mathField') && item.item.getAttribute('mathExpression') === expression) {
                    const element = item.item.is('element') ? item.item : null;
                    if (element) {
                        model.change((writer: ModelWriter) => {
                            writer.setSelection(element, 'on');
                        });
                        return true;
                    }
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    getMathUI(editor: Editor): { showUI: (expression?: string, target?: HTMLElement) => void } | null {
        try {
            const plugin = (editor.plugins as { get(key: unknown): unknown }).get(MathUI);
            if (plugin && typeof (plugin as { showUI?: () => void }).showUI === 'function') {
                return plugin as { showUI: (expression?: string, target?: HTMLElement) => void };
            }
        } catch {
            // MathUI plugin not loaded
        }
        return null;
    }

    openMathDialogWithExpression(editor: Editor, expression: string, targetElement?: HTMLElement): void {
        try {
            const mathUI = this.getMathUI(editor);
            if (mathUI?.showUI) {
                mathUI.showUI(expression || undefined, targetElement);
            } else {
                editor.execute('insertMath', { expression, renderer: 'mathlive' });
            }
        } catch (error) {
            console.error('[Math] Error opening math dialog:', error);
        }
    }
}
