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
import { Component } from '@angular/core';
import { formatISO, startOfMonth } from 'date-fns';
import * as _ from 'lodash';

import { WindowRef } from '../../utility/window/window.service';
import { LanguageInspectionService } from '../languageInspections.service';

import type { Attachment } from '../../exam/exam.model';

import type { OnInit } from '@angular/core';
import type { LanguageInspection } from '../maturity.model';
import type { Option } from '../../utility/select/dropDownSelect.component';

@Component({
    selector: 'maturity-reporting',
    templateUrl: './maturityReporting.component.html',
})
export class MaturityReportingComponent implements OnInit {
    month?: number;
    year?: number;
    processedInspections: LanguageInspection[] = [];
    months: Option<number, unknown>[] = [];
    years: Option<number, unknown>[] = [];

    constructor(private LanguageInspection: LanguageInspectionService, private Window: WindowRef) {}

    ngOnInit() {
        this.months = _.range(1, 13).map((m) => ({ id: m, label: m.toString() }));
        const year = new Date().getFullYear();
        this.years = _.range(0, 20).map((n) => ({ id: year - n, label: (year - n).toString() }));
        this.query();
    }

    printReport = () => this.Window.nativeWindow.setTimeout(() => this.Window.nativeWindow.print(), 500);

    monthChanged = (event?: Option<number, unknown>) => {
        this.month = event?.value;
        this.query();
    };

    yearChanged = (event?: Option<number, unknown>) => {
        this.year = event?.value;
        this.query();
    };

    query = () => {
        const params: { month?: string } = {};
        if (this.month && this.year) {
            const date = new Date(this.year, this.month - 1, 1);
            const beginning = startOfMonth(date);
            params.month = formatISO(beginning);
        }
        this.LanguageInspection.query(params).subscribe(
            (inspections) => (this.processedInspections = inspections.filter((i) => i.finishedAt)),
        );
    };

    showStatement = (statement: { attachment?: Attachment; comment?: string }) => {
        this.LanguageInspection.showStatement({ comment: statement.comment || '' });
    };
}
