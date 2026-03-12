// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageInspectionService } from 'src/app/maturity/language-inspections.service';
import type { LanguageInspection, LanguageInspectionData } from 'src/app/maturity/maturity.model';
import type { User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-unfinished-inspections',
    templateUrl: './unfinished-inspections.component.html',
    styleUrls: ['../maturity.shared.scss'],
    imports: [
        NgbPopover,
        NgbCollapse,
        TableSortComponent,
        CourseCodeComponent,
        RouterLink,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnfinishedInspectionsComponent {
    readonly inspections = input<LanguageInspectionData[]>([]);

    readonly sorting = signal<{ predicate: string; reverse: boolean }>({
        predicate: 'created',
        reverse: false,
    });
    readonly currentPage = signal(0);
    readonly hideItems = signal(false);

    readonly filteredInspections = computed(() => {
        const inspections = this.inspections();
        const filterText = this._filterText().toLowerCase();
        if (!filterText) {
            return inspections;
        }
        return inspections.filter((i) => this.examToString(i).toLowerCase().match(filterText));
    });
    readonly user: User;
    readonly pageSize = 10;

    private readonly _filterText = signal('');
    private readonly translate = inject(TranslateService);
    private readonly LanguageInspection = inject(LanguageInspectionService);

    constructor() {
        const Session = inject(SessionService);
        this.user = Session.getUser();
    }

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

    onFilterInput = (event: Event) => {
        this.filterText = (event.target as HTMLInputElement).value;
    };

    getInspectionAmounts() {
        return this.translate
            .instant('i18n_ongoing_language_inspections_detail')
            .replace('{0}', this.inspections().length.toString());
    }

    assignInspection(inspection: LanguageInspection) {
        this.LanguageInspection.assignInspection(inspection);
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
