import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

@Component({
    selector: 'xm-table-sort',
    template: `
        <span class="pointer" [ariaLabel]="text() | translate" [title]="text() | translate">
            {{ sliced() ? (text() | translate).slice(0, 3) + '.' : (text() | translate)
            }}<i [class]="getSortClass()"></i>
        </span>
    `,
    styles: `
        /* bootstrap-icons draws the glyph as an inline-block ::before, and CSS allows a line
           break next to an atomic inline box even when no whitespace sits there. Rendering it
           as a plain inline box removes that break opportunity, so the icon stays with the last
           word of the label now that table headers are allowed to wrap. */
        .xm-sort-icon::before {
            display: inline;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslateModule],
})
export class TableSortComponent {
    readonly by = input('');
    readonly predicate = input('');
    readonly text = input('');
    readonly reverse = input(false);
    readonly sliced = input(false);

    getSortClass() {
        const direction =
            this.by() === this.predicate()
                ? this.reverse()
                    ? 'bi-sort-alpha-down'
                    : 'bi-sort-alpha-up'
                : 'bi-arrow-down-up';
        // The gap is a margin rather than the &nbsp; that used to sit here: any real whitespace
        // between label and icon is a line-break opportunity, which strands the icon alone on a
        // second line now that table headers are allowed to wrap.
        return `ms-1 xm-sort-icon ${direction}`;
    }
}
