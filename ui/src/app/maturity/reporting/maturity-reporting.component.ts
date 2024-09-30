// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { formatISO, startOfMonth } from 'date-fns';
import { range } from 'ramda';
import { LanguageInspectionService } from 'src/app/maturity/language-inspections.service';
import type { LanguageInspection } from 'src/app/maturity/maturity.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    selector: 'xm-maturity-reporting',
    templateUrl: './maturity-reporting.component.html',
    styleUrls: ['./maturity-reporting.component.scss'],
    standalone: true,
    imports: [
        FormsModule,
        DropdownSelectComponent,
        CourseCodeComponent,
        NgClass,
        DatePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class MaturityReportingComponent implements OnInit {
    month?: number;
    year?: number;
    processedInspections: LanguageInspection[] = [];
    months: Option<number, number>[] = [];
    years: Option<number, number>[] = [];

    constructor(private LanguageInspection: LanguageInspectionService) {}

    ngOnInit() {
        this.months = range(1, 13).map((m) => ({ id: m, label: m.toString() }));
        const year = new Date().getFullYear();
        this.years = range(0, 20).map((n) => ({ id: year - n, label: (year - n).toString() }));
    }

    printReport = () => window.setTimeout(() => window.print(), 500);

    monthChanged = (event?: Option<number, number>) => {
        this.month = event?.id;
        this.query();
    };

    yearChanged = (event?: Option<number, number>) => {
        this.year = event?.id;
        this.query();
    };

    query = () => {
        const params: { month?: string } = {};
        if (this.month && this.year) {
            const date = new Date(this.year, this.month - 1, 1);
            const beginning = startOfMonth(date);
            params.month = encodeURIComponent(formatISO(beginning));
            this.LanguageInspection.query(params).subscribe(
                (inspections) => (this.processedInspections = inspections.filter((i) => i.finishedAt)),
            );
        }
    };

    showStatement = (statement: { attachment?: Attachment; comment?: string }) => {
        this.LanguageInspection.showStatement({ comment: statement.comment || '' });
    };
}
