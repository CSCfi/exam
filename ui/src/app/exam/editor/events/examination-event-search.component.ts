// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { EnrolmentService } from 'src/app/enrolment/enrolment.service';
import { ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { CourseCodeComponent } from 'src/app/shared/miscellaneous/course-code.component';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { TableSortComponent } from 'src/app/shared/sorting/table-sort.component';

@Component({
    selector: 'xm-examination-event-search',
    templateUrl: './examination-event-search.component.html',
    styleUrls: ['../../exam.shared.scss'],
    imports: [
        DatePickerComponent,
        FormsModule,
        NgbPopover,
        TableSortComponent,
        CourseCodeComponent,
        RouterLink,
        DatePipe,
        TranslateModule,
        OrderByPipe,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class ExaminationEventSearchComponent implements OnInit {
    date = new Date();
    startDate: Date | null = new Date();
    endDate: Date | null = new Date();
    events: ExaminationEventConfiguration[] = [];
    sorting = {
        predicate: 'examinationEvent.start',
        reverse: true,
    };
    filterText = '';

    private translate = inject(TranslateService);
    private http = inject(HttpClient);
    private ConfirmationDialog = inject(ConfirmationDialogService);
    private Enrolment = inject(EnrolmentService);
    private toast = inject(ToastrService);

    ngOnInit() {
        this.endDate?.setHours(24, 0, 0);
        this.startDate?.setHours(0, 0, 0);
        this.query();
    }

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
        this.startDate?.setHours(0, 0, 0);
        this.query();
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
        this.endDate?.setHours(24, 0, 0);
        this.query();
    };

    getEventEndTime = (start?: string, duration?: number): string => {
        if (!start || !duration) return '';
        const startDate = new Date(start);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        return endDate.toString();
    };

    setPredicate = (predicate: string) => {
        if (this.sorting.predicate === predicate) {
            this.sorting.reverse = !this.sorting.reverse;
        }
        this.sorting.predicate = predicate;
    };

    isActive = (configuration: ExaminationEventConfiguration) =>
        DateTime.fromISO(configuration.examinationEvent.start) > DateTime.now();

    removeEvent = (configuration: ExaminationEventConfiguration) => {
        this.ConfirmationDialog.open$(
            this.translate.instant('i18n_confirm'),
            this.translate.instant('i18n_remove_byod_exam'),
        ).subscribe({
            next: () => {
                this.Enrolment.removeAllEventEnrolmentConfigs$(configuration).subscribe({
                    next: () => {
                        this.toast.info(this.translate.instant('i18n_removed'));
                        this.events.splice(this.events.indexOf(configuration), 1);
                    },
                    error: (err) => this.toast.error(err),
                });
            },
        });
    };

    query = () => {
        const params: { start?: string; end?: string } = {};
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        if (this.startDate) {
            params.start = new Date(this.startDate.getTime() + tzOffset).toISOString();
        }
        if (this.endDate) {
            params.end = new Date(this.endDate.getTime() + tzOffset).toISOString();
        }
        this.http
            .get<ExaminationEventConfiguration[]>('/app/examinationevents', { params: params })
            .subscribe((resp: ExaminationEventConfiguration[]) => {
                this.events = resp.filter((e) =>
                    this.examToString(e).toLowerCase().match(this.filterText.toLowerCase()),
                );
            });
    };

    private examToString = (eec: ExaminationEventConfiguration) => {
        const code = eec.id || '';
        const name = eec.exam?.name || '';
        const teacher = (eec.exam?.creator.firstName || '') + eec.exam?.creator.lastName || '';
        return code + name + teacher;
    };
}
