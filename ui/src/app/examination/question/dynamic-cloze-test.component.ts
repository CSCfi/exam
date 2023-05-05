/*
 * Copyright (c) 2021 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import type { ComponentRef, OnDestroy, OnInit } from '@angular/core';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, ViewContainerRef } from '@angular/core';

type ClozeTestAnswer = { [key: string]: string };

@Component({
    selector: 'xm-dynamic-cloze-test',
    template: ` <div #clozeContainer></div> `,
})
export class DynamicClozeTestComponent implements OnInit, OnDestroy {
    @Input() answer: ClozeTestAnswer = {};
    @Input() content = '';
    @Input() editable = false;
    @Output() answerChanged = new EventEmitter<ClozeTestAnswer>();
    @ViewChild('clozeContainer', { read: ViewContainerRef, static: true }) container?: ViewContainerRef;

    componentRef?: ComponentRef<{ el: ElementRef; onInput: (_: { target: HTMLInputElement }) => void }>;

    constructor(private el: ElementRef) {}

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
            }
        });

        // Replace temporary input attributes with Angular input-directives
        const clozeTemplate = doc.body.innerHTML.replace(/data-input-handler/g, '(input)');
        // Compile component and module with formatted cloze template
        const clozeComponent = Component({ template: clozeTemplate, selector: 'xm-dyn-ct' })(
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
                            if (n.textContent) n.textContent = n.textContent.replace(/&#123;/g, '{');
                        });
                    MathJax.Hub.Queue(['Typeset', MathJax.Hub, this.el.nativeElement]);
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
