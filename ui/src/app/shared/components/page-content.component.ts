// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgTemplateOutlet } from '@angular/common';
import { Component, input, TemplateRef } from '@angular/core';

@Component({
    selector: 'xm-page-content',
    imports: [NgTemplateOutlet],
    template: `
        <div class="page-content">
            <ng-container [ngTemplateOutlet]="content()"></ng-container>
        </div>
    `,
    styles: [
        `
            // Same inset as the page header, so the two line up on every page
            .page-content {
                padding: var(--xm-space-4) var(--xm-page-inset);
            }
        `,
    ],
})
export class PageContentComponent {
    readonly content = input.required<TemplateRef<unknown>>();
}
