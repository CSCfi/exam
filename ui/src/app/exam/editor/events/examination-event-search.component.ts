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
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { addDays } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import { Exam, ExaminationEventConfiguration } from '../../exam.model';
import { ExamService } from '../../exam.service';

@Component({
    selector: 'xm-examination-event-search',
    templateUrl: './examination-event-search.component.html',
    animations: [
        trigger('listAnimation', [
            transition('* <=> *', [
                query(
                    ':enter',
                    [style({ opacity: 0 }), stagger('60ms', animate('600ms ease-out', style({ opacity: 1 })))],
                    { optional: true },
                ),
                query(':leave', animate('100ms', style({ opacity: 0 })), { optional: true }),
            ]),
        ]),
    ],
})
export class ExaminationEventSearchComponent implements OnInit {
    date = new Date();
    startDate: Date | null = this.date;
    endDate: Date | null = this.date;
    processedEvents: ExaminationEventConfiguration[] = [];
    sorting = {
        predicate: 'exam.created',
        reverse: true,
    };
    filterText = '';

    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private ConfirmationDialog: ConfirmationDialogService,
        private Exam: ExamService,
        private toast: ToastrService,
    ) {}

    ngOnInit() {
        this.query();
    }

    query = () => {
        if (!this.startDate || !this.endDate) return;
        const params: { start?: string; end?: string } = {};
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        if (this.startDate) {
            params.start = new Date(this.startDate.getTime() + tzOffset).toISOString();
        }
        if (this.endDate) {
            params.end = addDays(this.endDate, 1).toISOString();
        }
        this.httpQuery$(params).subscribe((resp: ExaminationEventConfiguration[]) => {
            this.processedEvents = resp
                .map((i: ExaminationEventConfiguration) =>
                    Object.assign(i, {
                        id: i.examinationEvent.id,
                        exam: i.exam,
                        settingsPassword: i.settingsPassword,
                        examinationEvent: i.examinationEvent
                            ? {
                                  id: i.examinationEvent.id,
                                  start: i.examinationEvent.start,
                                  description: i.examinationEvent.description,
                                  capacity: i.examinationEvent.capacity,
                                  examinationEventConfiguration: i.examinationEvent.examinationEventConfiguration,
                              }
                            : undefined,
                        examEnrolments: i.examEnrolments,
                    }),
                )
                .filter((e) => this.examToString(e).toLowerCase().match(this.filterText.toLowerCase()));
        });
    };

    httpQuery$ = (params: { start?: string; end?: string }): Observable<ExaminationEventConfiguration[]> =>
        this.http.get<ExaminationEventConfiguration[]>('/app/examinationevents', { params: params });

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
        this.query();
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
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

    removeEvent = (exam: Exam, configuration: ExaminationEventConfiguration) =>
        this.Exam.removeExaminationEvent$(exam.id, configuration).subscribe({
            next: () => {
                exam.examinationEventConfigurations?.splice(
                    exam.examinationEventConfigurations.indexOf(configuration),
                    1,
                );
                this.query();
            },
            error: this.toast.error,
        });

    forceRemoveExam = (exam: Exam, configuration: ExaminationEventConfiguration) => {
        this.ConfirmationDialog.open$(
            this.translate.instant('sitnet_confirm'),
            this.translate.instant('sitnet_remove_byod_exam'),
        ).subscribe({
            next: () => {
                if (configuration.examEnrolments?.length > 0) {
                    this.Exam.removeAllEventEnrolmentConfigs$(configuration).subscribe({
                        next: () => {
                            this.removeEvent(exam, configuration).unsubscribe();
                        },
                        error: this.toast.error,
                    });
                } else {
                    this.removeEvent(exam, configuration).unsubscribe();
                }
            },
            error: this.toast.error,
        });
    };

    private examToString = (eec: ExaminationEventConfiguration) => {
        const code = eec.id || '';
        const name = eec.exam?.name || '';
        const teacher = (eec.exam?.creator.firstName || '') + eec.exam?.creator.lastName || '';
        return code + name + teacher;
    };
}
