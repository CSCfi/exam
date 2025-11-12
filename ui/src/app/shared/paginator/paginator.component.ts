// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { range as _range } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-paginator',
    template: `
        <ul class="paginator">
            <li [ngClass]="previousPageDisabled()">
                <a tabindex="0" (click)="previousPage()" (keyup.enter)="previousPage()">&#60;</a>
            </li>
            @for (n of range(); track $index) {
                <li [ngClass]="{ active: isCurrent(n) }" (click)="setPage(n)" (keyup.enter)="setPage(n)">
                    <a tabindex="0" class="fs-6 text badge">{{ n + 1 }}</a>
                </li>
            }
            <li [ngClass]="nextPageDisabled()">
                <a tabindex="0" (click)="nextPage()" (keyup.enter)="nextPage()">&#62;</a>
            </li>
        </ul>
    `,
    styleUrls: ['./paginator.component.scss'],
    imports: [NgClass],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
    items = input<unknown[]>([]);
    pageSize = input(1);
    currentPage = input(0);
    pageSelected = output<{ page: number }>();

    pageCount = computed(() => {
        const itemsValue = this.items();
        const pageSizeValue = this.pageSize();
        return Math.ceil(itemsValue.length / pageSizeValue) - 1;
    });

    private _currentPage = signal(0);

    constructor() {
        // Sync input currentPage to internal signal
        effect(() => {
            this._currentPage.set(this.currentPage());
        });

        // Effect to react to items changes - reset to first page
        effect(() => {
            const itemsValue = this.items();
            if (itemsValue.length > 0) {
                // Go to first page always when the underlying collection gets modified
                this._currentPage.set(0);
                this.pageSelected.emit({ page: 0 });
            }
        });
    }

    previousPage() {
        const current = this._currentPage();
        if (current > 0) {
            const newPage = current - 1;
            this._currentPage.set(newPage);
            this.pageSelected.emit({ page: newPage });
        }
    }

    isCurrent(n: number) {
        return n === this._currentPage();
    }

    previousPageDisabled() {
        return this._currentPage() === 0 ? 'disabled' : '';
    }

    nextPage() {
        const current = this._currentPage();
        const pageCountValue = this.pageCount();
        if (current < pageCountValue) {
            const newPage = current + 1;
            this._currentPage.set(newPage);
            this.pageSelected.emit({ page: newPage });
        }
    }

    nextPageDisabled() {
        return this._currentPage() === this.pageCount() ? 'disabled' : '';
    }

    range() {
        return _range(0, this.pageCount() + 1);
    }

    setPage(n: number) {
        this._currentPage.set(n);
        this.pageSelected.emit({ page: n });
    }
}
