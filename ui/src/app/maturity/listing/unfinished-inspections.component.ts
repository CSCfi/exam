import { DatePipe } from '@angular/common';
import type { OnChanges } from '@angular/core';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbCollapse, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { LanguageInspectionData } from 'src/app/maturity/language-inspections.component';
import { LanguageInspectionService } from 'src/app/maturity/language-inspections.service';
import type { LanguageInspection } from 'src/app/maturity/maturity.model';
import type { User } from 'src/app/session/session.service';
import { SessionService } from 'src/app/session/session.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

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
    selector: 'xm-unfinished-inspections',
    templateUrl: './unfinished-inspections.component.html',
    styleUrls: ['../maturity.shared.scss'],
    standalone: true,
    imports: [
        FormsModule,
        NgbPopover,
        NgbCollapse,
        TableSortComponent,
        CourseCodeComponent,
        RouterLink,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
})
export class UnfinishedInspectionsComponent implements OnChanges {
    @Input() inspections: LanguageInspectionData[] = [];

    filteredInspections: LanguageInspectionData[] = [];
    user: User;
    sorting = {
        predicate: 'created',
        reverse: false,
    };
    pageSize = 10;
    currentPage = 0;
    filterText = '';
    hideItems = false;

    constructor(
        private translate: TranslateService,
        private LanguageInspection: LanguageInspectionService,
        Session: SessionService,
    ) {
        this.user = Session.getUser();
    }

    ngOnChanges() {
        this.filterTextChanged();
    }

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    filterTextChanged = () =>
        (this.filteredInspections = this.inspections.filter((i) =>
            this.examToString(i).toLowerCase().match(this.filterText.toLowerCase()),
        ));

    getInspectionAmounts = () =>
        this.translate
            .instant('i18n_ongoing_language_inspections_detail')
            .replace('{0}', this.inspections.length.toString());

    assignInspection = (inspection: LanguageInspection) => this.LanguageInspection.assignInspection(inspection);

    private examToString = (li: LanguageInspectionData) => {
        const code = li.exam.course ? li.exam.course.code : '';
        const name = li.exam.name;
        const student = li.studentNameAggregate;
        const teacher = li.ownerAggregate;
        return code + name + student + teacher;
    };
}
