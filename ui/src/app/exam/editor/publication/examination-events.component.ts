// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { ExaminationEventDialogComponent } from 'src/app/exam/editor/events/examination-event-dialog.component';
import { Exam, ExaminationEventConfiguration } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { MaintenancePeriod } from 'src/app/facility/facility.model';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { ModalService } from 'src/app/shared/dialogs/modal.service';

@Component({
    imports: [NgbPopoverModule, TranslateModule, DatePipe],
    selector: 'xm-examination-events',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <!-- Examination events -->
        @if (exam().implementation !== 'AQUARIUM') {
            <div class="row mt-2">
                <div class="col-md-3">
                    {{ 'i18n_examination_events' | translate }}
                    <sup
                        triggers="mouseenter:mouseleave"
                        ngbPopover="{{ 'i18n_examination_events_description' | translate }}"
                        popoverTitle="{{ 'i18n_instructions' | translate }}"
                    >
                        <img src="/assets/images/icon_tooltip.svg" alt="" />
                    </sup>
                </div>
                <div class="col-md-3">
                    <button
                        type="button"
                        (click)="addExaminationEvent()"
                        [disabled]="isPeriodOver()"
                        class="btn btn-success"
                    >
                        {{ 'i18n_add_examination_event' | translate }}
                    </button>
                </div>
                <div class="col-md-6 justify-content-center">
                    <ul class="list-inline pt-2">
                        @for (config of sortByString(configurations()); track config) {
                            <li class="list-inline-item mb-3">
                                <span
                                    title="{{ 'i18n_edit' | translate }}"
                                    (click)="modifyExaminationEvent(config)"
                                    class="pointer examination-event-list-item rounded-start"
                                >
                                    {{ config.examinationEvent.start | date: 'dd.MM.yyyy HH:mm'
                                    }}<i class="bi-pencil ms-1"></i>
                                </span>
                                @if (!config.examEnrolments?.length) {
                                    <span (click)="removeExaminationEvent(config)" class="text text-danger pointer">
                                        <i
                                            title="{{ 'i18n_remove' | translate }}"
                                            class="bi-x rounded-end background-gray p-1"
                                        ></i
                                    ></span>
                                } @else {
                                    <span class="rounded-end text text-muted background-gray p-1">
                                        <i title="{{ 'i18n_event_enrolments_exist' | translate }}" class="bi-x"></i>
                                    </span>
                                }
                            </li>
                        }
                    </ul>
                </div>
            </div>
        }
    `,
})
export class ExaminationEventsComponent implements OnInit {
    readonly exam = input.required<Exam>();
    readonly configurations = signal<ExaminationEventConfiguration[]>([]);

    readonly maintenancePeriods = signal<MaintenancePeriod[]>([]);

    private readonly HttpClient = inject(HttpClient);
    private readonly ModalService = inject(ModalService);
    private readonly ToastrService = inject(ToastrService);
    private readonly TranslateService = inject(TranslateService);
    private readonly ConfirmationDialogService = inject(ConfirmationDialogService);
    private readonly ExamService = inject(ExamService);

    constructor() {
        this.HttpClient.get<MaintenancePeriod[]>('/app/maintenance').subscribe((periods) =>
            this.maintenancePeriods.set(periods),
        );
    }

    ngOnInit() {
        this.configurations.set(this.exam().examinationEventConfigurations);
    }

    isPeriodOver() {
        return DateTime.fromISO(this.exam().periodEnd as string).startOf('day') < DateTime.now().startOf('day');
    }

    addExaminationEvent() {
        const currentExam = this.exam();
        const modalRef = this.ModalService.openRef(ExaminationEventDialogComponent, { size: 'lg' });
        modalRef.componentInstance.requiresPassword.set(currentExam.implementation === 'CLIENT_AUTH');
        modalRef.componentInstance.examMinDate.set(currentExam.periodStart);
        modalRef.componentInstance.examMaxDate.set(currentExam.periodEnd);
        modalRef.componentInstance.maintenancePeriods.set(this.maintenancePeriods());
        modalRef.componentInstance.examId.set(currentExam.id);
        modalRef.componentInstance.duration.set(currentExam.duration);
        this.ModalService.result$<ExaminationEventConfiguration>(modalRef).subscribe((data) =>
            this.configurations.update((cs) => [...cs, data]),
        );
    }

    modifyExaminationEvent(configuration: ExaminationEventConfiguration) {
        const currentExam = this.exam();
        const modalRef = this.ModalService.openRef(ExaminationEventDialogComponent, { size: 'lg' });
        modalRef.componentInstance.config.set(configuration);
        modalRef.componentInstance.requiresPassword.set(currentExam.implementation === 'CLIENT_AUTH');
        modalRef.componentInstance.examMaxDate.set(currentExam.periodEnd);
        modalRef.componentInstance.maintenancePeriods.set(this.maintenancePeriods());
        modalRef.componentInstance.examId.set(currentExam.id);
        modalRef.componentInstance.duration.set(currentExam.duration);
        this.ModalService.result$<ExaminationEventConfiguration>(modalRef).subscribe((config) =>
            this.configurations.update((cs) => cs.map((c) => (c === configuration ? config : c))),
        );
    }

    removeExaminationEvent(configuration: ExaminationEventConfiguration) {
        if (configuration.examEnrolments?.length) {
            return;
        }
        const currentExam = this.exam();
        this.ConfirmationDialogService.open$(
            this.TranslateService.instant('i18n_remove_examination_event'),
            this.TranslateService.instant('i18n_are_you_sure'),
        ).subscribe({
            next: () =>
                this.ExamService.removeExaminationEvent$(currentExam.id, configuration).subscribe({
                    next: () => this.configurations.update((cs) => cs.filter((c) => c !== configuration)),
                    error: (err) => this.ToastrService.error(err),
                }),
        });
    }

    sortByString(prop: ExaminationEventConfiguration[]): ExaminationEventConfiguration[] {
        return [...prop].sort((a, b) => Date.parse(a.examinationEvent.start) - Date.parse(b.examinationEvent.start));
    }
}
