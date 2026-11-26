// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Location, NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, TemplateRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'xm-page-header',
    imports: [NgTemplateOutlet, TranslateModule],
    template: `
        <div class="page-header" [class.append-wide]="appendWide()">
            <div class="title-row">
                @if (back()) {
                    <button type="button" class="btn btn-link back" (click)="location.back()">
                        <img src="/assets/images/icon_history.png" [alt]="'i18n_go_back' | translate" />
                    </button>
                }
                <h1 class="xm-page-header-title">
                    {{ text() | translate }}
                </h1>
            </div>
            @if (appendTemplate()) {
                <div class="header-actions">
                    <ng-container [ngTemplateOutlet]="appendTemplate()"></ng-container>
                </div>
            }
        </div>
    `,
    styles: [
        `
            @use '../grid';

            @use '../breakpoints' as bp;

            // Title (with an optional back button) and an optional area for actions beside it, which
            // takes a quarter of the row (half with appendWide) from md up and goes under the
            // title on phones. The header starts at the same inset as the page content, and
            // nothing in it adds an inset of its own: the header never starts right of the
            // content. The column widths are those of the former grid columns.
            .page-header {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                align-items: center;
                column-gap: grid.$gutter;
                margin-block: var(--xm-space-4) var(--xm-space-2);
                padding-inline: var(--xm-page-inset);

                > * {
                    min-width: 0;
                }

                @include bp.up(md) {
                    grid-template-columns: minmax(0, 1fr) grid.share(0.25);

                    &.append-wide {
                        grid-template-columns: minmax(0, 1fr) grid.share(0.5);
                    }
                }
            }
            // Buttons and status at the end of the row (also on phones, under the title)
            .header-actions {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: flex-end;
                gap: var(--xm-space-3);
            }
            .title-row {
                display: flex;
                gap: var(--xm-space-3);
            }
            // No inline padding or border: the arrow starts exactly where the content starts
            .back {
                padding-inline: 0;
                border-inline: 0;
            }
            .xm-page-header-title {
                font-size: 1.75rem;
                color: var(--xm-color-text);
                border-bottom: 2px solid var(--xm-color-brand);
                padding-bottom: 7px;
                width: fit-content;
            }
        `,
    ],
})
export class PageHeaderComponent {
    readonly text = input(''); // header title text
    readonly back = input(false); // show a back button (browser history back) before the title
    readonly appendWide = input(false); // reserve extra horizontal space for appendTemplate
    readonly appendTemplate = input<TemplateRef<unknown>>(); // template to appear after title text

    protected readonly location = inject(Location);
}
