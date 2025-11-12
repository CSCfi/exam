import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

@Component({
    selector: 'xm-table-sort',
    template: `
        <span class="pointer" [attr.arial-label]="text() | translate" [title]="text() | translate">
            {{ sliced() ? (text() | translate).slice(0, 3) + '.' : (text() | translate) }}&nbsp;
            <i [ngClass]="getSortClass()"></i>
        </span>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, TranslateModule],
})
export class TableSortComponent {
    by = input('');
    predicate = input('');
    text = input('');
    reverse = input(false);
    sliced = input(false);

    getSortClass() {
        return this.by() === this.predicate()
            ? this.reverse()
                ? 'bi-sort-alpha-down'
                : 'bi-sort-alpha-up'
            : 'bi-arrow-down-up';
    }
}
