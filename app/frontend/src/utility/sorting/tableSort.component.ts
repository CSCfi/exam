import { Component, Input, Output, EventEmitter } from '@angular/core';

/*
 * Copyright (c) 2018 Exam Consortium
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

@Component({
    selector: 'table-sort',
    template: `
        <span class="pointer"
            >{{ text | translate }}&nbsp;
            <i class="fa" [ngClass]="getSortClass()"></i>
        </span>
    `,
})
export class TableSortComponent {
    @Input() by: string;
    @Input() predicate: string;
    @Input() text: string;
    @Input() reverse: boolean;
    @Output() onSort = new EventEmitter<string>();

    sort = () => this.onSort.emit(this.by);

    getSortClass = () => (this.by === this.predicate ? (this.reverse ? 'fa-caret-down' : 'fa-caret-up') : 'fa-sort');
}
