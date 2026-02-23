// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-history-back',
    template: `
        <button
            class="btn btn-link"
            (click)="goBack($event)"
            (keydown)="onKeyDown($event)"
            [ariaLabel]="'i18n_go_back' | translate"
        >
            <img class="pointer arrow_icon h-80 align-self-center" src="/assets/images/icon_history.png" alt="" />
        </button>
    `,
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
