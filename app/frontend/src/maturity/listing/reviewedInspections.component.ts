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
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { LanguageInspectionService } from '../languageInspections.service';
import { LanguageInspection } from '../maturity.model';

@Component({
    selector: 'reviewed-inspections',
    template: require('./reviewedInspections.component.html'),
})
export class ReviewedInspectionsComponent implements OnInit {
    @Input() inspections: LanguageInspection[];
    @Output() onStartDateChange = new EventEmitter<{ date: Date }>();
    @Output() onEndDateChange = new EventEmitter<{ date: Date }>();

    filteredInspections: LanguageInspection[];
    sorting: { predicate: string; reverse: boolean };
    pageSize = 10;
    currentPage: number;
    filterText: string;
    filterChanged = new Subject<string>();

    constructor(private LanguageInspections: LanguageInspectionService) {
        this.filterChanged
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
            )
            .subscribe(text => {
                this.filterText = text;
                this.filteredInspections = this.inspections.filter(i => JSON.stringify(i).match(this.filterText));
            });
    }

    ngOnInit() {
        this.currentPage = 0;
        this.sorting = {
            predicate: 'exam.created',
            reverse: true,
        };
        this.filteredInspections = this.inspections;
    }

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    pageSelected = (page: number) => (this.currentPage = page);

    filterTextChanged = (text: string) => this.filterChanged.next(text);

    startDateChanged = (event: { date: Date }) => this.onStartDateChange.emit({ date: event.date });

    endDateChanged = (event: { date: Date }) => this.onEndDateChange.emit({ date: event.date });

    showStatement = (statement: { comment: string }) => this.LanguageInspections.showStatement(statement);
}
