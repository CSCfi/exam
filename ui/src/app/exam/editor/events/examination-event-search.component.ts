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
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { parseISO } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EnrolmentService } from '../../../enrolment/enrolment.service';
import { DatePickerComponent } from '../../../shared/date/date-picker.component';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import { CourseCodeComponent } from '../../../shared/miscellaneous/course-code.component';
import { OrderByPipe } from '../../../shared/sorting/order-by.pipe';
import { TableSortComponent } from '../../../shared/sorting/table-sort.component';
import { ExaminationEventConfiguration } from '../../exam.model';

@Component({
    selector: 'xm-examination-event-search',
    templateUrl: './examination-event-search.component.html',
    standalone: true,
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

    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private ConfirmationDialog: ConfirmationDialogService,
        private Enrolment: EnrolmentService,
        private toast: ToastrService,
    ) {}

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
        parseISO(configuration.examinationEvent.start) > new Date();

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
