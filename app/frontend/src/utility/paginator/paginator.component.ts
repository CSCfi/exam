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
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';

@Component({
    selector: 'paginator',
    template: `
        <ul class="pagination pagination-sm">
            <li [ngClass]="previousPageDisabled()"><a href="" (click)="previousPage()">&#60;</a></li>
            <li *ngFor="let n of range()" [ngClass]="{ active: isCurrent(n) }" (click)="setPage(n)">
                <a href="">{{ printRange(n) }}</a>
            </li>
            <li [ngClass]="nextPageDisabled()"><a target="_blank" (click)="nextPage()">&#62;</a></li>
        </ul>
    `,
})
export class PaginatorComponent implements OnChanges {
    @Input() items: any[] = [];
    @Input() pageSize = 1;
    @Input() currentPage = 0;
    @Output() onSelectPage = new EventEmitter<{ page: number }>();

    pageCount = 0;

    ngOnChanges(props: SimpleChanges) {
        if (props.items && _.isArray(props.items)) {
            this.pageCount = Math.ceil(this.items.length / this.pageSize) - 1;
            // Go to first page always when the underlying collection gets modified
            this.currentPage = 0;
            this.onSelectPage.emit({ page: 0 });
        }
    }

    printRange = (n: number) => n + 1;

    previousPage = () => {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.onSelectPage.emit({ page: this.currentPage });
        }
    };

    isCurrent = (n: number) => n === this.currentPage;

    previousPageDisabled = () => (this.currentPage === 0 ? 'disabled' : '');

    nextPage = () => {
        if (this.currentPage < this.pageCount) {
            this.currentPage++;
            this.onSelectPage.emit({ page: this.currentPage });
        }
    };

    nextPageDisabled = () => (this.currentPage === this.pageCount ? 'disabled' : '');

    range = () => _.range(0, this.pageCount + 1);

    setPage = (n: number) => {
        this.currentPage = n;
        this.onSelectPage.emit({ page: n });
    };
}
