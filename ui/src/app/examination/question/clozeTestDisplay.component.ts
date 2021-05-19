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
import {
    Compiler,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgModule,
    Output,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import type { OnInit, OnDestroy, ComponentRef } from '@angular/core';
type ClozeTestAnswer = { [key: string]: string };

const regexMathContent = /<span class="math-tex">(.*?)<\/span>/g;
@Component({
    selector: 'cloze-test-display',
    template: ` <div #clozeContainer></div> `,
})
export class ClozeTestDisplayComponent implements OnInit, OnDestroy {
    @Input() answer: ClozeTestAnswer;
    @Input() content: string;
    @Input() editable: boolean;
    @Output() onAnswerChange: EventEmitter<ClozeTestAnswer> = new EventEmitter();
    @ViewChild('clozeContainer', { read: ViewContainerRef, static: true }) container: ViewContainerRef;
    componentRef: ComponentRef<{ el: ElementRef; onInput: (_: { target: HTMLInputElement }) => void }>;

    constructor(private compiler: Compiler, private el: ElementRef) {}

    ngOnInit() {
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.content, 'text/html');

        // Set input values and temporary attributes for input events
        const inputs = doc.getElementsByTagName('input');
        Array.from(inputs).forEach((input) => {
            const { id } = input;
            if (!this.answer[id]) {
                this.answer = { [id]: '' };
            }
            input.setAttribute('value', this.answer[id]);
            input.setAttribute('data-input-handler', 'handleChange($event)');
        });
        // Replace all curly braces outside math elements with urlencoded symbols to please angular compiler
        Array.from(doc.querySelectorAll('span:not(.math-tex)'))
            .flatMap((e) => Array.from(e.childNodes))
            .filter((n) => n.nodeName === '#text')
            .forEach((n) => {
                if (n.textContent) {
                    n.textContent = n.textContent.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
                }
            });

        // Replace temporary input attributes with Angular input-directives, escape possible interpolation braces
        // Also surround all math content with double braces so angular compiler stays happy
        const clozeTemplate = doc.body.innerHTML
            .replace(/data-input-handler/g, '(input)')
            .replace(regexMathContent, (match) => `{{'${match}'}}`);

        // Compile component and module with formatted cloze template
        const clozeComponent = Component({ template: clozeTemplate, selector: 'dyn-cloze-test' })(
            class ClozeComponent {
                el: ElementRef;
                onInput: (_: { target: HTMLInputElement }) => void;
                ngAfterViewInit() {
                    // this is ugly but I didn't find any other way to deal with the LaTeX markup
                    Array.from(this.el.nativeElement.getElementsByTagName('dyn-cloze-test')[0].childNodes)
                        .flatMap((e: Element) => Array.from(e.childNodes))
                        .filter((n) => n.nodeName === '#text')
                        .forEach((n) => {
                            if (n.textContent)
                                n.textContent = n.textContent.replace(/\{\{'/g, '').replace(/'\}\}/g, '');
                        });
                    MathJax.Hub.Queue(['Typeset', MathJax.Hub, this.el.nativeElement]);
                }
                handleChange(event: { target: HTMLInputElement }) {
                    this.onInput(event);
                }
            },
        );

        const clozeModule = NgModule({ declarations: [clozeComponent] })(class {});
        this.compiler.compileModuleAndAllComponentsAsync(clozeModule).then((factories) => {
            const f = factories.componentFactories.find((cf) => cf.selector === 'dyn-cloze-test');
            if (f) {
                this.componentRef = this.container.createComponent(f);
                this.componentRef.instance.el = this.el;
                this.componentRef.instance.onInput = this.handleInputChange;
            }
        });
    }

    ngOnDestroy() {
        this.componentRef.destroy();
    }

    handleInputChange = (event: { target: HTMLInputElement }) => {
        const { id, value } = event.target;
        this.onAnswerChange.emit({ id, value });
    };
}
