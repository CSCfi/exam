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
import { DatePipe, SlicePipe } from '@angular/common';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { DatePickerComponent } from '../../shared/date/date-picker.component';
import { CourseCodeComponent } from '../../shared/miscellaneous/course-code.component';
import { PageFillPipe } from '../../shared/paginator/page-fill.pipe';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { OrderByPipe } from '../../shared/sorting/order-by.pipe';
import { TableSortComponent } from '../../shared/sorting/table-sort.component';
import type { LanguageInspectionData } from '../language-inspections.component';
import { LanguageInspectionService } from '../language-inspections.service';

@Component({
    selector: 'xm-reviewed-inspections',
    templateUrl: './reviewed-inspections.component.html',
    styleUrls: ['../maturity.shared.scss'],
    standalone: true,
    imports: [
        RouterLink,
        FormsModule,
        NgbPopover,
        NgbCollapse,
        DatePickerComponent,
        TableSortComponent,
        CourseCodeComponent,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        PageFillPipe,
        OrderByPipe,
    ],
})
export class ReviewedInspectionsComponent implements OnChanges {
    @Input() inspections: LanguageInspectionData[] = [];
    @Output() startDateChanged = new EventEmitter<{ date: Date | null }>();
    @Output() endDateChanged = new EventEmitter<{ date: Date | null }>();

    filteredInspections: LanguageInspectionData[] = [];
    sorting = {
        predicate: 'exam.created',
        reverse: true,
    };
    pageSize = 10;
    currentPage = 0;
    filterText = '';
    hideItems = false;

    constructor(private LanguageInspections: LanguageInspectionService) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.inspections) {
            this.filterTextChanged();
        }
    }

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    pageSelected = (event: { page: number }) => (this.currentPage = event.page);

    filterTextChanged = () =>
        (this.filteredInspections = this.inspections.filter((i) =>
            this.examToString(i).toLowerCase().match(this.filterText.toLowerCase()),
        ));

    onStartDateChanged = (event: { date: Date | null }) => this.startDateChanged.emit({ date: event.date });

    onEndDateChanged = (event: { date: Date | null }) => this.endDateChanged.emit({ date: event.date });

    showStatement = (statement: { comment?: string }) =>
        this.LanguageInspections.showStatement({ comment: statement.comment || '' });

    private examToString = (li: LanguageInspectionData) => {
        const code = li.exam.course ? li.exam.course.code : '';
        const name = li.exam.name;
        const student = li.studentNameAggregate;
        const teacher = li.ownerAggregate;
        return code + name + student + teacher;
    };
}
