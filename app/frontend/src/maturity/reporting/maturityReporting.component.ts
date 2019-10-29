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
import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';

import { WindowRef } from '../../utility/window/window.service';
import { LanguageInspectionService } from '../languageInspections.service';
import { LanguageInspection } from '../maturity.model';

@Component({
    selector: 'maturity-reporting',
    template: require('./maturityReporting.component.html'),
})
export class MaturityReportingComponent implements OnInit {
    month: Date;
    processedInspections: LanguageInspection[];

    constructor(private LanguageInspection: LanguageInspectionService, private Window: WindowRef) {}

    ngOnInit() {
        this.month = new Date();
        this.query();
    }

    printReport = () => this.Window.nativeWindow.setTimeout(() => this.Window.nativeWindow.print(), 500);

    query = (event?: { date: Date }) => {
        const params: { month?: string } = {};
        if (event) {
            params.month = moment(event.date).toISOString();
            this.month = event.date;
        }
        this.LanguageInspection.query(params).subscribe(
            inspections => (this.processedInspections = inspections.filter(i => i.finishedAt)),
        );
    };

    showStatement = (statement: { comment: string }) => {
        this.LanguageInspection.showStatement(statement);
    };
}
