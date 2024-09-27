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
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-history-back',
    template: `
        <button
            class="btn btn-link"
            (click)="goBack($event)"
            (keydown)="onKeyDown($event)"
            [attr.aria-label]="'i18n_go_back' | translate"
        >
            <img class="pointer arrow_icon h-80 align-self-center" src="/assets/images/icon_history.png" alt="" />
        </button>
    `,
    standalone: true,
    imports: [TranslateModule],
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
