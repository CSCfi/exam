import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { SessionService, User } from '../../session/session.service';
import { LanguageInspectionData } from '../languageInspections.component';
import { LanguageInspectionService } from '../languageInspections.service';
import { LanguageInspection } from '../maturity.model';

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
    selector: 'unfinished-inspections',
    templateUrl: './unfinishedInspections.component.html',
})
export class UnfinishedInspectionsComponent implements OnInit {
    @Input() inspections: LanguageInspectionData[];

    filteredInspections: LanguageInspectionData[];
    user: User;
    sorting: { predicate: string; reverse: boolean };
    pageSize = 10;
    currentPage = 0;
    filterText: string;
    hideItems = false;

    constructor(
        private translate: TranslateService,
        private LanguageInspection: LanguageInspectionService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.user = this.Session.getUser();
        this.sorting = {
            predicate: 'created',
            reverse: false,
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

    getInspectionAmounts = () =>
        this.translate
            .instant('sitnet_ongoing_language_inspections_detail')
            .replace('{0}', this.inspections.length.toString());

    assignInspection = (inspection: LanguageInspection) => this.LanguageInspection.assignInspection(inspection);
}
