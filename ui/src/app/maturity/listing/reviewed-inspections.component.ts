// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewedInspectionsComponent {
    readonly inspections = input<LanguageInspectionData[]>([]);
    readonly startDateChanged = output<{ date: Date | null }>();
    readonly endDateChanged = output<{ date: Date | null }>();

    readonly sorting = signal<{ predicate: string; reverse: boolean }>({
        predicate: 'exam.created',
        reverse: true,
    });
    readonly currentPage = signal(0);
    readonly hideItems = signal(false);
    readonly pageSize = 10;
    readonly filteredInspections = computed(() => {
        const inspections = this.inspections();
        const filterText = this._filterText().toLowerCase();
        if (!filterText) {
            return inspections;
        }
        return inspections.filter((i) => this.examToString(i).toLowerCase().match(filterText));
    });

    private readonly _filterText = signal('');
    private readonly LanguageInspections = inject(LanguageInspectionService);

    get filterText(): string {
        return this._filterText();
    }

    set filterText(value: string) {
        this._filterText.set(value);
    }

    setPredicate(predicate: string) {
        const currentSorting = this.sorting();
        if (currentSorting.predicate === predicate) {
            this.sorting.update((s) => ({ ...s, reverse: !s.reverse }));
        } else {
            this.sorting.update((s) => ({ ...s, predicate }));
        }
    }

    pageSelected(event: { page: number }) {
        this.currentPage.set(event.page);
    }

    onFilterInput = (event: Event) => {
        this.filterText = (event.target as HTMLInputElement).value;
    };

    onStartDateChanged(event: { date: Date | null }) {
        this.startDateChanged.emit({ date: event.date });
    }

    onEndDateChanged(event: { date: Date | null }) {
        this.endDateChanged.emit({ date: event.date });
    }

    showStatement(statement: { comment?: string }) {
        this.LanguageInspections.showStatement({ comment: statement.comment || '' });
    }

    toggleHideItems() {
        this.hideItems.update((v) => !v);
    }

    private examToString(li: LanguageInspectionData) {
        const code = li.exam.course ? li.exam.course.code : '';
        const name = li.exam.name;
        const student = li.studentNameAggregate;
        const teacher = li.ownerAggregate;
        return code + name + student + teacher;
    }
}
