import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { SessionService, User } from '../../session/session.service';
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
    template: require('./unfinishedInspections.component.html'),
})
export class UnfinishedInspectionsComponent implements OnInit {
    @Input() inspections: LanguageInspection[];

    filteredInspections: LanguageInspection[];
    user: User;
    sorting: { predicate: string; reverse: boolean };
    pageSize = 10;
    currentPage: number;
    filterText: string;
    hideItems = false;

    constructor(
        private translate: TranslateService,
        private LanguageInspection: LanguageInspectionService,
        private Session: SessionService,
    ) {}

    ngOnInit() {
        this.currentPage = 0;
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

    pageSelected = (page: number) => (this.currentPage = page);

    filterTextChanged = () =>
        (this.filteredInspections = this.inspections.filter(i => JSON.stringify(i).match(this.filterText)));

    getInspectionAmounts = () => {
        const amount = this.inspections.length.toString();
        return this.translate.instant('sitnet_ongoing_language_inspections_detail').replace('{0}', amount);
    };

    assignInspection = (inspection: LanguageInspection) => {
        this.LanguageInspection.assignInspection(inspection);
    };
}
