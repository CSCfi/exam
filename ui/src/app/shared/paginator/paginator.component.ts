// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { range as _range } from 'src/app/shared/miscellaneous/helpers';

@Component({
    selector: 'xm-paginator',
    template: `
        <ul class="paginator">
            <li [class.disabled]="previousPageDisabled()">
                <a tabindex="0" (click)="previousPage()" (keyup.enter)="previousPage()">&#60;</a>
            </li>
            @for (n of range(); track $index) {
                <li [class.active]="isCurrent(n)" (click)="setPage(n)" (keyup.enter)="setPage(n)">
                    <a tabindex="0" class="fs-6 text badge">{{ n + 1 }}</a>
                </li>
            }
            <li [class.disabled]="nextPageDisabled()">
                <a tabindex="0" (click)="nextPage()" (keyup.enter)="nextPage()">&#62;</a>
            </li>
        </ul>
    `,
    styleUrls: ['./paginator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginatorComponent {
    readonly items = input<unknown[]>([]);
    readonly pageSize = input(1);
    readonly currentPage = input(0);
    readonly pageSelected = output<{ page: number }>();

    readonly pageCount = computed(() => Math.max(0, Math.ceil(this.items().length / this.pageSize()) - 1));
    readonly range = computed(() => _range(0, this.pageCount()));
    readonly previousPageDisabled = computed(() => this.currentPage() === 0);
    readonly nextPageDisabled = computed(() => this.currentPage() === this.pageCount());

    previousPage() {
        const current = this.currentPage();
        if (current > 0) {
            this.pageSelected.emit({ page: current - 1 });
        }
    }

    nextPage() {
        const current = this.currentPage();
        if (current < this.pageCount()) {
            this.pageSelected.emit({ page: current + 1 });
        }
    }

    setPage(n: number) {
        if (n !== this.currentPage()) {
            this.pageSelected.emit({ page: n });
        }
    }

    isCurrent(n: number) {
        return n === this.currentPage();
    }
}
