import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

@Component({
    selector: 'xm-table-sort',
    template: `
        <span class="pointer" [attr.arial-label]="text | translate" [title]="text | translate">
            {{ sliced ? (text | translate).slice(0, 3) + '.' : (text | translate) }}&nbsp;
            <i [ngClass]="getSortClass()"></i>
        </span>
    `,
    standalone: true,
    imports: [NgClass, TranslateModule],
})
export class TableSortComponent {
    @Input() by = '';
    @Input() predicate = '';
    @Input() text = '';
    @Input() reverse = false;
    @Input() sliced = false;

    getSortClass = () =>
        this.by === this.predicate ? (this.reverse ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up') : 'bi-arrow-down-up';
}
