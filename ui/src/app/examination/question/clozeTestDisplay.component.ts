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
import type { OnInit, OnDestroy, ComponentRef } from '@angular/core';
import { Input, ViewChild, ViewContainerRef, Compiler, Component, NgModule, Output, EventEmitter } from '@angular/core';

type ClozeTestAnswer = { [key: string]: string };

const regexMultipleCurlyBraces = /\{{2,}(.*?)\}{2,}/g;

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
    componentRef: ComponentRef<unknown>;

    constructor(private compiler: Compiler) {}

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

        // Replace temporary input attributes with Angular input-directives, escape possible interpolation braces
        const clozeTemplate = doc.body.innerHTML
            .replace(/data-input-handler/g, '(input)')
            .replace(regexMultipleCurlyBraces, (match) => `<span ngNonBindable>${match}</span>`);

        // Compile component and module with formatted cloze template
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const parent = this;
        const clozeComponent = Component({ template: clozeTemplate })(
            class ClozeComponent {
                handleChange(event: { target: HTMLInputElement }) {
                    parent.handleInputChange(event);
                }
            },
        );
        const clozeModule = NgModule({ declarations: [clozeComponent] })(class {});
        this.compiler.compileModuleAndAllComponentsAsync(clozeModule).then((factories) => {
            const f = factories.componentFactories[0];
            this.componentRef = this.container.createComponent(f);
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
