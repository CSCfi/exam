/*
 * Copyright (c) 2017 Exam Consortium
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
import { Directive, ElementRef, Injector, Input } from '@angular/core';
import { UpgradeComponent } from '@angular/upgrade/static';

type ClozeTestResult = { [key: string]: string };

@Directive({ selector: 'cloze-test' })
export class ClozeTestComponent extends UpgradeComponent {
    @Input() results: ClozeTestResult;
    @Input() content: string;
    @Input() editable: boolean;

    constructor(elementRef: ElementRef, injector: Injector) {
        super('clozeTest', elementRef, injector);
    }
}
