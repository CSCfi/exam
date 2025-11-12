// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { LanguageInspectionService } from 'src/app/maturity/language-inspections.service';
import type { LanguageInspection } from 'src/app/maturity/maturity.model';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { range } from 'src/app/shared/miscellaneous/helpers';
import { DropdownSelectComponent } from 'src/app/shared/select/dropdown-select.component';
import { Option } from 'src/app/shared/select/select.model';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'xm-maturity-reporting',
    templateUrl: './maturity-reporting.component.html',
    styleUrls: ['./maturity-reporting.component.scss'],
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
export class MaturityReportingComponent {
    month = signal<number | undefined>(undefined);
    year = signal<number | undefined>(undefined);
    processedInspections = signal<LanguageInspection[]>([]);
    months = signal<Option<number, number>[]>([]);
    years = signal<Option<number, number>[]>([]);

    private LanguageInspection = inject(LanguageInspectionService);

    constructor() {
        this.months.set(range(1, 13).map((m) => ({ id: m, label: m.toString() })));
        const year = new Date().getFullYear();
        this.years.set(range(0, 20).map((n) => ({ id: year - n, label: (year - n).toString() })));
    }

    printReport() {
        window.setTimeout(() => window.print(), 500);
    }

    monthChanged(event?: Option<number, number>) {
        this.month.set(event?.id);
        this.query();
    }

    yearChanged(event?: Option<number, number>) {
        this.year.set(event?.id);
        this.query();
    }

    query() {
        const currentMonth = this.month();
        const currentYear = this.year();
        const params: { month?: string } = {};
        if (currentMonth && currentYear) {
            const date = new Date(currentYear, currentMonth - 1, 1);
            const beginning = DateTime.fromJSDate(date).startOf('month');
            params.month = encodeURIComponent(beginning.toISO() || '');
            this.LanguageInspection.query(params).subscribe((inspections) => {
                this.processedInspections.set(inspections.filter((i) => i.finishedAt));
            });
        }
    }

    showStatement(statement: { attachment?: Attachment; comment?: string }) {
        this.LanguageInspection.showStatement({ comment: statement.comment || '' });
    }

    getMonthDate(): Date | undefined {
        const currentMonth = this.month();
        const currentYear = this.year();
        if (currentMonth && currentYear) {
            return new Date(currentYear, currentMonth - 1, 1);
        }
        return undefined;
    }
}
