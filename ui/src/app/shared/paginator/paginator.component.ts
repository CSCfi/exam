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
            <li [ngClass]="{ disabled: previousPageDisabled() }">
                <a tabindex="0" (click)="previousPage()" (keyup.enter)="previousPage()">&#60;</a>
            </li>
            @for (n of range(); track $index) {
                <li [ngClass]="{ active: isCurrent(n) }" (click)="setPage(n)" (keyup.enter)="setPage(n)">
                    <a tabindex="0" class="fs-6 text badge">{{ n + 1 }}</a>
                </li>
            }
            <li [ngClass]="{ disabled: nextPageDisabled() }">
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

    pageCount = computed(() => Math.max(0, Math.ceil(this.items().length / this.pageSize()) - 1));

    previousPageDisabled = computed(() => this._internalPage() === 0);
    nextPageDisabled = computed(() => this._internalPage() === this.pageCount());

    private _internalPage = signal(0);
    private lastItemsLength = 0;

    constructor() {
        // Initialize from input
        this._internalPage.set(this.currentPage());
        this.lastItemsLength = this.items().length;

        // Effect to reset page when items change (side effect: emitting event)
        effect(() => {
            const itemsValue = this.items();
            if (itemsValue.length > 0 && itemsValue.length !== this.lastItemsLength) {
                this.lastItemsLength = itemsValue.length;
                this._internalPage.set(0);
                this.pageSelected.emit({ page: 0 });
            }
        });
        effect(() => {
            this._internalPage.set(this.currentPage());
        });
    }

    previousPage() {
        const current = this.getCurrentPage();
        if (current > 0) {
            const newPage = current - 1;
            this._internalPage.set(newPage);
            this.pageSelected.emit({ page: newPage });
        }
    }

    isCurrent(n: number) {
        return n === this.getCurrentPage();
    }

    nextPage() {
        const current = this.getCurrentPage();
        const pageCountValue = this.pageCount();
        if (current < pageCountValue) {
            const newPage = current + 1;
            this._internalPage.set(newPage);
            this.pageSelected.emit({ page: newPage });
        }
    }

    range() {
        return _range(0, this.pageCount());
    }

    setPage(n: number) {
        if (n !== this._internalPage()) {
            this._internalPage.set(n);
            this.pageSelected.emit({ page: n });
        }
    }

    private getCurrentPage(): number {
        return this._internalPage();
    }
}
