/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */
import { Component } from '@angular/core';

@Component({
    selector: 'xm-history-back',
    template: `
        <a (click)="goBack($event)" (keydown)="onKeyDown($event)">
            <img class="pointer arrow_icon" src="/assets/images/icon_history.png" alt="go back" />
        </a>
    `,
})
export class HistoryBackComponent {
    goBack = (event: Event) => {
        event.preventDefault();
        window.history.back();
    };

    onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.code === 'Enter') {
            this.goBack(event);
        }
    };
}
