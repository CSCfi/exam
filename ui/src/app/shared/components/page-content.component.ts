// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core';

@Component({
    selector: 'xm-page-content',
    imports: [NgTemplateOutlet],
    template: `
        <div class="row mx-3">
            <div class="col-md-12 my-4">
                <ng-container [ngTemplateOutlet]="content()"></ng-container>
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageContentComponent {
    content = input.required<TemplateRef<unknown>>();
}
