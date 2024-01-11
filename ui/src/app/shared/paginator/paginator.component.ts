/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */
import { NgClass } from '@angular/common';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { range as _range } from 'ramda';

@Component({
    selector: 'xm-paginator',
    template: `
        <ul class="paginator">
            <li [ngClass]="previousPageDisabled()">
                <a tabindex="0" (click)="previousPage()" (keyup.enter)="previousPage()">&#60;</a>
            </li>
            @for (n of range(); track $index) {
                <li [ngClass]="{ active: isCurrent(n) }" (click)="setPage(n)" (keyup.enter)="setPage(n)">
                    <a tabindex="0">{{ printRange(n) }}</a>
                </li>
            }
            <li [ngClass]="nextPageDisabled()">
                <a tabindex="0" (click)="nextPage()" (keyup.enter)="nextPage()">&#62;</a>
            </li>
        </ul>
    `,
    standalone: true,
    imports: [NgClass],
})
export class PaginatorComponent implements OnChanges {
    @Input() items: unknown[] = [];
    @Input() pageSize = 1;
    @Input() currentPage = 0;
    @Output() pageSelected = new EventEmitter<{ page: number }>();

    pageCount = 0;

    ngOnChanges(props: SimpleChanges) {
        if (props.items) {
            this.pageCount = Math.ceil(this.items.length / this.pageSize) - 1;
            // Go to first page always when the underlying collection gets modified
            this.currentPage = 0;
            this.pageSelected.emit({ page: 0 });
        }
    }

    printRange = (n: number) => (n < 9 ? '0' + (n + 1) : n + 1);

    previousPage = () => {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.pageSelected.emit({ page: this.currentPage });
        }
    };

    isCurrent = (n: number) => n === this.currentPage;

    previousPageDisabled = () => (this.currentPage === 0 ? 'disabled' : '');

    nextPage = () => {
        if (this.currentPage < this.pageCount) {
            this.currentPage++;
            this.pageSelected.emit({ page: this.currentPage });
        }
    };

    nextPageDisabled = () => (this.currentPage === this.pageCount ? 'disabled' : '');

    range = () => _range(0, this.pageCount + 1);

    setPage = (n: number) => {
        this.currentPage = n;
        this.pageSelected.emit({ page: n });
    };
}
