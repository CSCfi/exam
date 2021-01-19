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

import { LanguageInspectionData } from '../languageInspections.component';
import { LanguageInspectionService } from '../languageInspections.service';

@Component({
    selector: 'reviewed-inspections',
    template: require('./reviewedInspections.component.html'),
})
export class ReviewedInspectionsComponent implements OnInit {
    @Input() inspections: LanguageInspectionData[];
    @Output() onStartDateChange = new EventEmitter<{ date: Date }>();
    @Output() onEndDateChange = new EventEmitter<{ date: Date }>();

    filteredInspections: LanguageInspectionData[];
    sorting: { predicate: string; reverse: boolean };
    pageSize = 10;
    currentPage = 0;
    filterText: string;

    constructor(private LanguageInspections: LanguageInspectionService) {}

    ngOnInit() {
        this.sorting = {
            predicate: 'exam.created',
            reverse: true,
        };
        this.filterText = '';
        this.filterTextChanged();
    }

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    pageSelected = (event: { page: number }) => (this.currentPage = event.page);

    private examToString = (li: LanguageInspectionData) => {
        const code = li.exam.course ? li.exam.course.code : '';
        const name = li.exam.name;
        const student = li.studentNameAggregate;
        const teacher = li.ownerAggregate;
        return code + name + student + teacher;
    };

    filterTextChanged = () =>
        (this.filteredInspections = this.inspections.filter(i =>
            this.examToString(i)
                .toLowerCase()
                .match(this.filterText.toLowerCase()),
        ));

    startDateChanged = (event: { date: Date }) => this.onStartDateChange.emit({ date: event.date });

    endDateChanged = (event: { date: Date }) => this.onEndDateChange.emit({ date: event.date });

    showStatement = (statement: { comment: string }) => this.LanguageInspections.showStatement(statement);
}
