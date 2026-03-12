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
    Injector,
    input,
    output,
    Renderer2,
    runInInjectionContext,
    viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

type ClozeTestAnswer = Record<string, string>;

@Component({
    selector: 'xm-dynamic-cloze-test',
    template: `<div #clozeContainer [innerHTML]="sanitizedContent()"></div>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicClozeTestComponent implements AfterViewInit, OnDestroy {
    readonly container = viewChild<ElementRef<HTMLDivElement>>('clozeContainer');

    readonly answer = input<ClozeTestAnswer>({});
    readonly content = input('');
    readonly answerChanged = output<{ id: string; value: string }>();

    // Only recompute when content changes, not when answer changes
    readonly sanitizedContent = computed(() => {
        const currentContent = this.content();
        // html is already sanitized by the server
        if (!currentContent) return this.sanitizer.bypassSecurityTrustHtml('');

        const parser = new DOMParser();
        const doc = parser.parseFromString(currentContent, 'text/html');

        // Use bypassSecurityTrustHtml to allow input elements
        // Don't set answer values here - that would make this reactive to answer changes
        return this.sanitizer.bypassSecurityTrustHtml(doc.body.innerHTML);
    });

    private inputListener?: () => void;
    private focusInTracker?: () => void;
    private focusOutTracker?: () => void;
    private focusedInputId: string | null = null;

    private readonly injector = inject(Injector);
    private readonly renderer = inject(Renderer2);
    private readonly sanitizer = inject(DomSanitizer);

    constructor() {
        // React to answer changes - update values without recreating HTML
        effect(() => {
            const currentAnswer = this.answer();
            if (!this.container()?.nativeElement) return;
            this.updateInputValues(currentAnswer);
        });

        // React to content changes - re-setup when HTML is re-rendered
        effect(() => {
            const currentContent = this.content();
            if (!currentContent) return;

            // afterNextRender requires injection context; effect runs outside it
            runInInjectionContext(this.injector, () => {
                afterNextRender(() => {
                    if (!this.container()?.nativeElement) return;
                    this.setupInputs();
                });
            });
        });
    }

    ngAfterViewInit() {
        // Initial setup - afterNextRender ensures innerHTML has been processed.
        // Lifecycle hooks run outside injection context, so use runInInjectionContext.
        runInInjectionContext(this.injector, () => {
            afterNextRender(() => {
                if (!this.container()?.nativeElement) return;
                this.setupInputs();
            });
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
        const containerEl = this.container()?.nativeElement;
        if (!containerEl) return;
        const currentAnswer = answer ?? this.answer();
        const inputs = containerEl.querySelectorAll('input');
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
        const containerEl = this.container()?.nativeElement;
        if (!containerEl) return;

        // Use event delegation on the container
        this.inputListener = this.renderer.listen(containerEl, 'input', (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.tagName === 'INPUT' && target.id) {
                this.answerChanged.emit({ id: target.id, value: target.value });
            }
        });

        // Track which input has focus
        this.focusInTracker = this.renderer.listen(containerEl, 'focusin', (event: Event) => {
            const target = event.target as HTMLInputElement;
            if (target.tagName === 'INPUT' && target.id) {
                this.focusedInputId = target.id;
            }
        });

        this.focusOutTracker = this.renderer.listen(containerEl, 'focusout', () => {
            // Clear immediately - updateInputValues already checks for focused input
            this.focusedInputId = null;
        });
    }
}
