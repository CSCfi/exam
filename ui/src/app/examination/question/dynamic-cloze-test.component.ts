// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { OnDestroy } from '@angular/core';
import {
    AfterViewInit,
    ComponentRef as AngularComponentRef,
    ChangeDetectionStrategy,
    Component,
    effect,
    ElementRef,
    inject,
    input,
    output,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { hashString } from 'src/app/shared/miscellaneous/helpers';

type ClozeTestAnswer = { [key: string]: string };

@Component({
    selector: 'xm-dynamic-cloze-test',
    template: ` <div #clozeContainer></div> `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicClozeTestComponent implements AfterViewInit, OnDestroy {
    private static componentCounter = 0;

    @ViewChild('clozeContainer', { read: ViewContainerRef, static: true }) container?: ViewContainerRef;

    answer = input<ClozeTestAnswer>({});
    content = input('');
    editable = input(false);
    answerChanged = output<ClozeTestAnswer>();

    componentRef?: AngularComponentRef<{ el: ElementRef; onInput: (_: { target: HTMLInputElement }) => void }>;

    private el = inject(ElementRef);

    constructor() {
        // React to input changes and recreate component
        effect(() => {
            const currentContent = this.content();
            const currentAnswer = this.answer();
            if (currentContent && this.container) {
                this.createComponent(currentContent, currentAnswer);
            }
        });
    }

    ngAfterViewInit() {
        // Initial creation will be handled by effect, but ensure it runs if container is ready
        const currentContent = this.content();
        const currentAnswer = this.answer();
        if (currentContent && this.container) {
            this.createComponent(currentContent, currentAnswer);
        }
    }

    ngOnDestroy() {
        if (this.componentRef) this.componentRef.destroy();
    }

    handleInputChange(event: { target: HTMLInputElement }) {
        const { id, value } = event.target;
        this.answerChanged.emit({ id, value });
    }

    private createComponent(content: string, answer: ClozeTestAnswer) {
        // Destroy existing component if any
        if (this.componentRef) {
            this.componentRef.destroy();
            this.componentRef = undefined;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        // Set input values and temporary attributes for input events
        const inputs = doc.getElementsByTagName('input');
        Array.from(inputs).forEach((input) => {
            const answerValue = answer[input.id] || '';
            input.setAttribute('value', answerValue);
            input.setAttribute('data-input-handler', 'handleChange($event)');
        });
        // Replace all left curly braces with urlencoded symbols to please angular compiler
        this.getTextNodes(doc.body).forEach((n) => {
            if (n.textContent) {
                n.textContent = n.textContent.replace(/\{/g, '&#123;');
                n.textContent = n.textContent.replace(/\}/g, '&#125;');
            }
        });

        // Replace temporary input attributes with Angular input-directives
        const clozeTemplate = doc.body.innerHTML.replace(/data-input-handler/g, '(input)');
        // Compile component and module with formatted cloze template
        const hash = hashString(clozeTemplate);
        // Use a counter to ensure each component class is unique (Angular uses class name for component ID)
        const componentId = DynamicClozeTestComponent.componentCounter++;

        // Create a new class with a unique name to avoid component ID collisions
        // Each class instance must be unique for Angular's component ID generation
        const ClozeComponentClass = class {
            static readonly __componentId = componentId;
            el!: ElementRef;
            onInput!: (_: { target: HTMLInputElement }) => void;
            ngAfterViewInit() {
                // this is ugly but I didn't find any other way
                // see: https://github.com/angular/angular/issues/11859
                Array.from(this.el.nativeElement.querySelectorAll('*') as Element[])
                    .flatMap((e: Element) => Array.from(e.childNodes))
                    .filter((n) => n.nodeName === '#text')
                    .forEach((n) => {
                        if (n.textContent) {
                            n.textContent = n.textContent.replace(/&#123;/g, '{');
                            n.textContent = n.textContent.replace(/&#125;/g, '}');
                        }
                    });
                // Math content is now in MathLive format, no typesetting needed
            }
            handleChange(event: { target: HTMLInputElement }) {
                this.onInput(event);
            }
        };

        // Set unique name on the class to ensure Angular generates unique component IDs
        Object.defineProperty(ClozeComponentClass, 'name', {
            value: `ClozeComponent_${hash}_${componentId}`,
            configurable: true,
            writable: false,
        });

        const clozeComponent = Component({
            template: clozeTemplate,
            selector: `xm-dyn-ct-${hash}-${componentId}`,
        })(ClozeComponentClass);

        if (this.container) {
            this.componentRef = this.container.createComponent(clozeComponent);
            this.componentRef.instance.el = this.el;
            this.componentRef.instance.onInput = this.handleInputChange;
        }
    }

    private getTextNodes(el: Element) {
        const a = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let n;
        while ((n = walk.nextNode())) a.push(n);
        return a;
    }
}
