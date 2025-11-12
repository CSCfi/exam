// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { HistoryBackComponent } from 'src/app/shared/history/history-back.component';

@Component({
    selector: 'xm-page-header',
    imports: [NgTemplateOutlet, NgClass, TranslateModule, HistoryBackComponent],
    template: `
        <div class="row mx-3 mt-4 mb-2 align-items-center">
            <div [ngClass]="appendWide() ? 'col-md-6' : 'col-md-9'" class="col-s-3">
                <div class="d-flex">
                    @if (history()) {
                        <span class="pe-4"><xm-history-back></xm-history-back></span>
                    }
                    @if (prependTemplate()) {
                        <ng-container [ngTemplateOutlet]="prependTemplate()"></ng-container>
                    }
                    <h1 class="xm-page-header-title">
                        {{ text() | translate }}
                    </h1>
                </div>
            </div>
            @if (appendTemplate()) {
                <div [ngClass]="appendWide() ? 'col-md-6' : 'col-md-3'">
                    <ng-container [ngTemplateOutlet]="appendTemplate()"></ng-container>
                </div>
            }
        </div>
    `,
    styles: [
        `
            .xm-page-header-title {
                font-size: 1.75rem;
                color: #2c2c2c;
                border-bottom: 2px solid #2c7639;
                padding-bottom: 7px;
                width: fit-content;
            }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
    text = input(''); // header title text
    history = input(false); // show history back component
    appendWide = input(false); // reserve extra horizontal space for appendTemplate
    prependTemplate = input<TemplateRef<unknown>>(); // template to appear before title text
    appendTemplate = input<TemplateRef<unknown>>(); // template to appear after title text
}
