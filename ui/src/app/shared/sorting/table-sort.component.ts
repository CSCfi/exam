import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

@Component({
    selector: 'xm-table-sort',
    template: `
        <span class="pointer" [ariaLabel]="text() | translate" [title]="text() | translate">
            {{ sliced() ? (text() | translate).slice(0, 3) + '.' : (text() | translate) }}&nbsp;
            <i [class]="getSortClass()"></i>
        </span>
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
        return this.by() === this.predicate()
            ? this.reverse()
                ? 'bi-sort-alpha-down'
                : 'bi-sort-alpha-up'
            : 'bi-arrow-down-up';
    }
}
