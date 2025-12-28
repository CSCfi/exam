// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnDestroy } from '@angular/core';
import {
    afterNextRender,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    output,
    Renderer2,
    ViewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

type ClozeTestAnswer = Record<string, string>;

@Component({
    selector: 'xm-dynamic-cloze-test',
    template: `<div #clozeContainer [innerHTML]="sanitizedContent()"></div>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicClozeTestComponent implements AfterViewInit, OnDestroy {
    @ViewChild('clozeContainer', { static: true }) container?: ElementRef<HTMLDivElement>;

    answer = input<ClozeTestAnswer>({});
    content = input('');
    answerChanged = output<{ id: string; value: string }>();

    // Only recompute when content changes, not when answer changes
    sanitizedContent = computed(() => {
        const currentContent = this.content();
        // html is already sanitized by the server
        if (!currentContent) return this.sanitizer.bypassSecurityTrustHtml('');

        const parser = new DOMParser();
        const doc = parser.parseFromString(currentContent, 'text/html');

        // Use bypassSecurityTrustHtml to allow input elements
        // Don't set answer values here - that would make this reactive to answer changes
        return this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
    });

    private renderer = inject(Renderer2);
    private sanitizer = inject(DomSanitizer);
    private inputListener?: () => void;
    private focusInTracker?: () => void;
    private focusOutTracker?: () => void;
    private focusedInputId: string | null = null;

    constructor() {
        // React to answer changes - update values without recreating HTML
        effect(() => {
            const currentAnswer = this.answer();
            if (!this.container?.nativeElement) return;
            this.updateInputValues(currentAnswer);
        });

        // React to content changes - re-setup when HTML is re-rendered
        effect(() => {
            const currentContent = this.content();
            if (!currentContent) return;

            // afterNextRender is needed because effects run during change detection,
            // before Angular has finished updating the [innerHTML] binding
            afterNextRender(() => {
                if (!this.container?.nativeElement) return;
                this.setupInputs();
            });
        });
    }

    ngAfterViewInit() {
        // Initial setup - afterNextRender ensures innerHTML has been processed
        afterNextRender(() => {
            if (!this.container?.nativeElement) return;
            this.setupInputs();
        });
    }

    ngOnDestroy() {
        if (this.inputListener) {
            this.inputListener();
        }
        if (this.focusInTracker) {
            this.focusInTracker();
        }
        if (this.focusOutTracker) {
            this.focusOutTracker();
        }
    }

    private setupInputs() {
        this.updateInputValues();
        this.attachListeners();
    }

    private updateInputValues(answer?: ClozeTestAnswer) {
        if (!this.container?.nativeElement) return;
        const currentAnswer = answer ?? this.answer();
        const inputs = this.container.nativeElement.querySelectorAll('input');
        inputs.forEach((input: HTMLInputElement) => {
            if (input.id && currentAnswer[input.id] !== undefined) {
                // Don't update if this input is currently focused (user is typing)
                if (input.id === this.focusedInputId) return;
                input.value = currentAnswer[input.id] || '';
            }
        });
    }

    private attachListeners() {
        // Remove existing listener
        if (this.inputListener) {
            this.inputListener();
            this.inputListener = undefined;
        }

        if (this.focusInTracker) {
            this.focusInTracker();
            this.focusInTracker = undefined;
        }
        if (this.focusOutTracker) {
            this.focusOutTracker();
            this.focusOutTracker = undefined;
        }
        if (!this.container?.nativeElement) return;

        // Use event delegation on the container
        this.inputListener = this.renderer.listen(this.container.nativeElement, 'input', (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.tagName === 'INPUT' && target.id) {
                this.answerChanged.emit({ id: target.id, value: target.value });
            }
        });

        // Track which input has focus
        this.focusInTracker = this.renderer.listen(this.container.nativeElement, 'focusin', (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.tagName === 'INPUT' && target.id) {
                this.focusedInputId = target.id;
            }
        });

        this.focusOutTracker = this.renderer.listen(this.container.nativeElement, 'focusout', () => {
            // Clear immediately - updateInputValues already checks for focused input
            this.focusedInputId = null;
        });
    }
}
