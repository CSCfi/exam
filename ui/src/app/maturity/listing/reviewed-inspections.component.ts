// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe } from '@angular/common';
import type { OnChanges, SimpleChanges } from '@angular/core';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageInspectionService } from 'src/app/maturity/language-inspections.service';
import { LanguageInspectionData } from 'src/app/maturity/maturity.model';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { PageFillPipe } from 'src/app/shared/paginator/page-fill.pipe';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-reviewed-inspections',
    templateUrl: './reviewed-inspections.component.html',
    styleUrls: ['../maturity.shared.scss'],
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

    private LanguageInspections = inject(LanguageInspectionService);

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
