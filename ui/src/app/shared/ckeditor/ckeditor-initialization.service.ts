// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChangeDetectorRef } from '@angular/core';
import { Editor, ViewElement } from 'ckeditor5';
import { ClozeElementHelperService } from './plugins/clozetest/cloze-element-helper.service';
import { MathElementHelperService } from './plugins/math/math-element-helper.service';
import { MathFieldService } from './plugins/math/math-field.service';

export class CKEditorInitializationService {
    private mathFieldService = new MathFieldService();
    private mathElementHelper = new MathElementHelperService();
    private clozeElementHelper = new ClozeElementHelperService();

    private readonly timers = new Set<number>();
    private processingTimeout?: number;
    private disposed = false;

    constructor(private changeDetector: ChangeDetectorRef) {}

    initializeEditor(editor: Editor, wordCountId: string): void {
        this.setupWordCount(editor, wordCountId);
        this.setupMathFieldProcessing(editor);
        this.setupMathCommandListener(editor);
        this.setupModelChangeListener(editor);
        this.setupClickHandlers(editor);
    }

    /**
     * Cancels every pending timer. Must be called when the owning component is destroyed:
     * a timer left running holds the editor (and everything it references) reachable, and
     * fires markForCheck() on an already destroyed view.
     */
    dispose(): void {
        this.disposed = true;
        this.timers.forEach((id) => window.clearTimeout(id));
        this.timers.clear();
        this.processingTimeout = undefined;
    }

    /** setTimeout that dispose() can cancel, and that turns into a no-op once disposed. */
    private schedule(callback: () => void, delay: number): number | undefined {
        if (this.disposed) return undefined;
        const id = window.setTimeout(() => {
            this.timers.delete(id);
            if (this.disposed) return;
            callback();
        }, delay);
        this.timers.add(id);
        return id;
    }

    /** Renders the math fields, then re-attaches their handlers once MathLive has painted. */
    private processMathFields(editor: Editor): void {
        void this.mathFieldService.processMathInEditor(editor);
        this.changeDetector.markForCheck();
        this.schedule(() => this.injectHandlersAndStylesForMathFields(editor), 100);
    }

    private setupWordCount(editor: Editor, wordCountId: string): void {
        const wordCountPlugin = editor.plugins.get('WordCount');
        const wordCountWrapper = document.getElementById(wordCountId) as HTMLElement;
        if (wordCountWrapper) {
            wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer);
        }
    }

    private setupMathFieldProcessing(editor: Editor): void {
        this.schedule(() => this.processMathFields(editor), 200);
    }

    private setupMathCommandListener(editor: Editor): void {
        const mathCommand = editor.commands.get('insertMath');
        if (mathCommand) {
            mathCommand.on('execute', () => {
                this.schedule(() => this.processMathFields(editor), 100);
            });
        }
    }

    private setupModelChangeListener(editor: Editor): void {
        let lastProcessingTime = 0;

        editor.model.document.on('change:data', () => {
            if (this.disposed) return;
            const now = Date.now();
            if (this.processingTimeout !== undefined) {
                window.clearTimeout(this.processingTimeout);
                this.timers.delete(this.processingTimeout);
            }

            const timeSinceLastProcessing = now - lastProcessingTime;
            const delay = timeSinceLastProcessing > 500 ? 100 : 500;

            this.processingTimeout = this.schedule(() => {
                this.processingTimeout = undefined;
                lastProcessingTime = Date.now();
                this.processMathFields(editor);
            }, delay);
        });
    }

    private setupClickHandlers(editor: Editor): void {
        editor.editing.view.document.on(
            'click',
            (evt: any, data: any) => {
                const clozeElement = this.clozeElementHelper.findClozeElementInView(data.target);
                if (clozeElement) {
                    if (this.clozeElementHelper.selectClozeElement(editor, clozeElement as unknown as ViewElement)) {
                        this.schedule(() => {
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
     * Attach click handlers and inject shadow DOM styles for each math-field element.
     *
     * MathLive renders formula glyphs inside a shadow root, where it suppresses clicks
     * with stopImmediatePropagation(). Setting pointer-events:none on all shadow DOM
     * content makes every click fall through to the <math-field> host element, which
     * our capture listener then handles.
     *
     * Guards (data-click-attached, style[data-cursor-fix]) prevent duplicates when this
     * method is called repeatedly after model changes.
     */
    private injectHandlersAndStylesForMathFields(editor: Editor): void {
        const viewRoot = editor.editing.view.document.getRoot();
        if (!viewRoot) return;
        const editable = editor.editing.view.domConverter.mapViewToDom(viewRoot);
        if (!editable) return;

        const mathFields = editable.querySelectorAll('math-field');
        mathFields.forEach((mathField) => {
            const el = mathField as HTMLElement;

            if (!el.hasAttribute('data-click-attached')) {
                el.setAttribute('data-click-attached', 'true');

                el.addEventListener('mousedown', (domEvt: Event) => domEvt.preventDefault(), { capture: true });

                el.addEventListener(
                    'click',
                    (domEvt: Event) => {
                        domEvt.stopPropagation();

                        let expression = el.getAttribute('data-math-expression') || '';
                        const viewEl = editor.editing.view.domConverter.mapDomToView(el);
                        if (viewEl && 'name' in viewEl) {
                            const modelEl = editor.editing.mapper.toModelElement(viewEl as unknown as ViewElement);
                            if (modelEl?.is('element', 'mathField')) {
                                expression = (modelEl.getAttribute('mathExpression') as string) || expression;
                            }
                            this.mathElementHelper.selectMathModelElement(editor, viewEl as unknown as ViewElement);
                        } else {
                            this.mathElementHelper.findAndSelectMathByExpression(editor, expression);
                        }

                        this.schedule(() => {
                            this.mathElementHelper.openMathDialogWithExpression(editor, expression, el);
                            this.changeDetector.markForCheck();
                        }, 0);
                    },
                    { capture: true },
                );
            }

            // pointer-events:none makes formula glyphs transparent to hit testing so
            // clicks always land on the host element and the listener above handles them.
            const shadowRoot = el.shadowRoot;
            if (shadowRoot && !shadowRoot.querySelector('style[data-cursor-fix]')) {
                const shadowStyle = document.createElement('style');
                shadowStyle.setAttribute('data-cursor-fix', 'true');
                shadowStyle.textContent = '* { cursor: pointer !important; pointer-events: none !important; }';
                shadowRoot.appendChild(shadowStyle);
            }
        });
    }
}
