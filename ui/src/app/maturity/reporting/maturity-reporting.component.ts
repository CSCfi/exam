/*
 * Copyright (c) 2017 Exam Consortium
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
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { range } from 'ramda';
import type { Attachment } from '../../exam/exam.model';
import type { Option } from '../../shared/select/dropdown-select.component';
import { LanguageInspectionService } from '../language-inspections.service';
import type { LanguageInspection } from '../maturity.model';

@Component({
    selector: 'xm-maturity-reporting',
    templateUrl: './maturity-reporting.component.html',
})
export class MaturityReportingComponent implements OnInit {
    month?: number;
    year?: number;
    processedInspections: LanguageInspection[] = [];
    inspectionList: LanguageInspection[] = [];
    months: Option<number, unknown>[] = [];
    years: Option<number, unknown>[] = [];
    hideList: boolean = true;
    loading: boolean = false;

    constructor(private LanguageInspection: LanguageInspectionService) {}

    ngOnInit() {
        this.months = range(1, 13).map((m) => ({ id: m, label: m.toString() }));
        const year = new Date().getFullYear();
        this.years = range(0, 20).map((n) => ({ id: year - n, label: (year - n).toString() }));
        this.query();
    }

    printReport = () => window.setTimeout(() => window.print(), 500);

    query = () => {
        this.loading = true;
        const params = {};
        this.LanguageInspection.query(params).subscribe((inspections) => {
            this.processedInspections = inspections.filter((i) => i.finishedAt);
            this.loading = false;
        });
    };
    updateList = () => {
        this.inspectionList = this.processedInspections.filter(
            (i) => i.finishedAt && this.isInSelectedMonth(i.finishedAt),
        );
        this.hideList = false;
    };

    isInSelectedMonth = (date: Date): boolean => {
        if (!this.month || this.month == 0) {
            return new Date(date).getFullYear() == this.year;
        }
        return new Date(date).getMonth() + 1 == this.month && new Date(date).getFullYear() == this.year;
    };

    showStatement = (statement: { attachment?: Attachment; comment?: string }) => {
        this.LanguageInspection.showStatement({ comment: statement.comment || '' });
    };
}
