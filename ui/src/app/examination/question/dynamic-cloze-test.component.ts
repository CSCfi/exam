// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { ComponentRef, OnDestroy, OnInit } from '@angular/core';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { MathJaxService } from 'src/app/shared/math/mathjax.service';
import { hashString } from 'src/app/shared/miscellaneous/helpers';

type ClozeTestAnswer = { [key: string]: string };

@Component({
    selector: 'xm-dynamic-cloze-test',
    template: ` <div #clozeContainer></div> `,
    standalone: true,
})
export class DynamicClozeTestComponent implements OnInit, OnDestroy {
    @Input() answer: ClozeTestAnswer = {};
    @Input() content = '';
    @Input() editable = false;
    @Output() answerChanged = new EventEmitter<ClozeTestAnswer>();
    @ViewChild('clozeContainer', { read: ViewContainerRef, static: true }) container?: ViewContainerRef;

    componentRef?: ComponentRef<{ el: ElementRef; onInput: (_: { target: HTMLInputElement }) => void }>;

    private el = inject(ElementRef);
    private mathJaxService = inject(MathJaxService);

    ngOnInit() {
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.content, 'text/html');

        // Set input values and temporary attributes for input events
        const inputs = doc.getElementsByTagName('input');
        Array.from(inputs).forEach((input) => {
            const answer = this.answer[input.id] || '';
            input.setAttribute('value', answer);
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
        const mathJaxService = this.mathJaxService;
        const clozeComponent = Component({
            template: clozeTemplate,
            selector: `xm-dyn-ct-${hashString(clozeTemplate)}`,
        })(
            class ClozeComponent {
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
                    mathJaxService.typeset([this.el.nativeElement]);
                }
                handleChange(event: { target: HTMLInputElement }) {
                    this.onInput(event);
                }
            },
        );

        if (this.container) {
            this.componentRef = this.container.createComponent(clozeComponent);
            this.componentRef.instance.el = this.el;
            this.componentRef.instance.onInput = this.handleInputChange;
        }
    }

    ngOnDestroy() {
        if (this.componentRef) this.componentRef.destroy();
    }

    handleInputChange = (event: { target: HTMLInputElement }) => {
        const { id, value } = event.target;
        this.answerChanged.emit({ id, value });
    };

    private getTextNodes = (el: Element) => {
        const a = [],
            walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let n;
        while ((n = walk.nextNode())) a.push(n);
        return a;
    };
}
