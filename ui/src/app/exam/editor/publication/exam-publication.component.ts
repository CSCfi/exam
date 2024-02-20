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
import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { format, parseISO } from 'date-fns';
import { Duration } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { Observable, from, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isBoolean } from 'src/app/shared/miscellaneous/helpers';
import { SessionService } from '../../../session/session.service';
import { DatePickerComponent } from '../../../shared/date/date-picker.component';
import { ConfirmationDialogService } from '../../../shared/dialogs/confirmation-dialog.service';
import { OrderByPipe } from '../../../shared/sorting/order-by.pipe';
import type {
    AutoEvaluationConfig,
    Exam,
    ExaminationDate,
    ExaminationEventConfiguration,
    MaintenancePeriod,
} from '../../exam.model';
import { ExamService } from '../../exam.service';
import { ExaminationEventDialogComponent } from '../events/examination-event-dialog.component';
import { ExamTabService } from '../exam-tabs.service';
import { CollaborativeExamOwnerSelectorComponent } from './collaborative-exam-owner-picker.component';
import { ExamParticipantSelectorComponent } from './exam-participant-picker.component';
import { ExamPreParticipantSelectorComponent } from './exam-pre-participant-picker.component';
import { OrganisationSelectorComponent } from './organisation-picker.component';
import { PublicationDialogComponent } from './publication-dialog.component';
import { PublicationErrorDialogComponent } from './publication-error-dialog.component';
import { PublicationRevocationDialogComponent } from './publication-revocation-dialog.component';

@Component({
    selector: 'xm-exam-publication',
    templateUrl: './exam-publication.component.html',
    standalone: true,
    imports: [
        DatePickerComponent,
        FormsModule,
        NgbPopover,
        NgClass,
        ExamParticipantSelectorComponent,
        ExamPreParticipantSelectorComponent,
        CollaborativeExamOwnerSelectorComponent,
        OrganisationSelectorComponent,
        UpperCasePipe,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
})
export class ExamPublicationComponent implements OnInit {
    exam!: Exam;
    maintenancePeriods: MaintenancePeriod[] = [];

    collaborative = signal(false);
    isAdmin = signal(false);
    hostName = signal('');
    examDurations = signal<number[]>([]);
    visibleParticipantSelector = signal('participant');
    hourValue = signal(0);
    minuteValue = signal(0);
    maxDuration = signal(300);
    minDuration = signal(1);
    showCustomTimeField = signal(false);

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private Session: SessionService,
        private Exam: ExamService,
        private Confirmation: ConfirmationDialogService,
        private Tabs: ExamTabService,
    ) {
        this.hostName.set(window.location.origin);
        this.isAdmin.set(this.Session.getUser().isAdmin);
    }

    ngOnInit() {
        this.exam = this.Tabs.getExam();
        this.collaborative.set(this.Tabs.isCollaborative());
        this.http.get<{ examDurations: number[] }>('/app/settings/durations').subscribe({
            next: (data) => this.examDurations.set(data.examDurations),
            error: (err) => this.toast.error(err),
        });
        this.http.get<{ maxDuration: number }>('/app/settings/maxDuration').subscribe({
            next: (data) => this.maxDuration.set(data.maxDuration),
            error: (err) => this.toast.error(err),
        });
        this.http.get<{ minDuration: number }>('/app/settings/minDuration').subscribe({
            next: (data) => this.minDuration.set(data.minDuration),
            error: (err) => this.toast.error(err),
        });
        if (this.exam.implementation !== 'AQUARIUM') {
            this.http
                .get<MaintenancePeriod[]>('/app/maintenance')
                .subscribe((periods) => (this.maintenancePeriods = periods));
        }
        this.Tabs.notifyTabChange(4);
    }

    addExaminationDate = (event: { date: Date | null }) => {
        if (!event.date) return;
        const fmt = 'DD/MM/YYYY';
        const formattedDate = format(event.date, fmt);
        const alreadyExists: boolean = this.exam.examinationDates
            .map((ed) => format(parseISO(ed.date), fmt))
            .some((d: string) => d === formattedDate);
        if (!alreadyExists) {
            this.http
                .post<ExaminationDate>(`/app/exam/${this.exam.id}/examinationdate`, {
                    date: formattedDate,
                })
                .subscribe((date) => this.exam.examinationDates.push(date));
        }
    };

    removeExaminationDate = (date: ExaminationDate) => {
        this.http.delete(`/app/exam/${this.exam.id}/examinationdate/${date.id}`).subscribe(() => {
            const i = this.exam.examinationDates.indexOf(date);
            this.exam.examinationDates.splice(i, 1);
        });
    };

    startDateChanged = (event: { date: Date | null }) =>
        (this.exam.periodStart = event.date ? event.date.toISOString() : null);
    endDateChanged = (event: { date: Date | null }) =>
        (this.exam.periodEnd = event.date ? event.date.toISOString() : null);

    autoEvaluationConfigChanged = (event: { config: AutoEvaluationConfig }) => {
        this.exam.autoEvaluationConfig = event.config;
    };

    canBeAutoEvaluated = () =>
        this.Exam.hasQuestions(this.exam) &&
        !this.Exam.hasEssayQuestions(this.exam) &&
        this.exam.gradeScale &&
        this.exam.executionType.type !== 'MATURITY';

    updateExam = () => this.updateExam$().subscribe();

    setExamDuration = (hours: number, minutes: number) => {
        const duration = hours * 60 + minutes;
        if (duration < this.minDuration() || duration > this.maxDuration()) {
            this.toast.warning(this.translate.instant('DIALOGS_ERROR'));
            return;
        }
        this.exam.duration = duration;
        this.updateExam$().subscribe();
    };

    toHoursAndMinutes = (minutes: number): string => Duration.fromObject({ minutes: minutes }).toFormat('hh:mm');

    checkDuration = (duration: number) => (this.exam.duration === duration ? 'btn-primary' : '');

    range = (min: number, max: number, step = 1) => [...Array(step + max - min).keys()].map((v) => min + v);

    checkTrialCount = (x: number | null) => (this.exam.trialCount === x ? 'btn-primary' : '');

    setTrialCount = (x: number | null) => {
        this.exam.trialCount = x;
        this.updateExam$().subscribe();
    };

    previewExam = (fromTab: number) => this.Exam.previewExam(this.exam, fromTab, this.collaborative());

    previousTab = () => {
        this.Tabs.notifyTabChange(3);
        this.router.navigate(['..', '3'], { relativeTo: this.route });
    };

    saveAndPublishExam = () => {
        const errors: string[] = this.isDraftCollaborativeExam()
            ? this.errorsPreventingPrePublication()
            : this.errorsPreventingPublication();

        if (errors.length > 0) {
            const modal = this.modal.open(PublicationErrorDialogComponent, {
                backdrop: 'static',
                keyboard: true,
            });
            modal.componentInstance.errors = errors;
        } else {
            const modal = this.modal.open(PublicationDialogComponent, {
                backdrop: 'static',
                keyboard: true,
            });
            modal.componentInstance.exam = this.exam;
            modal.componentInstance.prePublication = this.isDraftCollaborativeExam();
            from(modal.result).subscribe({
                next: () => {
                    const state = {
                        state: this.isDraftCollaborativeExam() ? 'PRE_PUBLISHED' : 'PUBLISHED',
                    };
                    // OK button clicked
                    this.updateExam$(true, state).subscribe({
                        next: () => {
                            const text = this.isDraftCollaborativeExam()
                                ? 'i18n_exam_saved_and_pre_published'
                                : 'i18n_exam_saved_and_published';
                            this.toast.success(this.translate.instant(text));
                            this.router.navigate(['/staff', this.isAdmin() ? 'admin' : 'teacher']);
                        },
                        error: (err) => this.toast.error(err),
                    });
                },
                error: (err) => this.toast.error(err),
            });
        }
    };

    isDraftCollaborativeExam = () => this.collaborative() && this.exam.state === 'DRAFT';

    // TODO: how should this work when it comes to private exams?
    unpublishExam = () => {
        if (this.isAllowedToUnpublishOrRemove()) {
            this.modal
                .open(PublicationRevocationDialogComponent, {
                    backdrop: 'static',
                    keyboard: true,
                })
                .result.then(() =>
                    this.updateExam$(true, {
                        state: this.collaborative() ? 'PRE_PUBLISHED' : 'DRAFT',
                    }).subscribe({
                        next: () => {
                            this.toast.success(this.translate.instant('i18n_exam_unpublished'));
                            this.exam.state = 'DRAFT';
                        },
                        error: (err) => this.toast.error(err),
                    }),
                );
        } else {
            this.toast.warning(this.translate.instant('i18n_unpublish_not_possible'));
        }
    };

    addExaminationEvent = () => {
        const modalRef = this.modal.open(ExaminationEventDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.requiresPassword = this.exam.implementation === 'CLIENT_AUTH';
        modalRef.componentInstance.examMaxDate = this.exam.periodEnd;
        modalRef.componentInstance.maintenancePeriods = this.maintenancePeriods;
        modalRef.componentInstance.examId = this.exam.id;
        modalRef.componentInstance.duration = this.exam.duration;
        modalRef.result
            .then((data: ExaminationEventConfiguration) => this.exam.examinationEventConfigurations.push(data))
            .catch((err) => {
                if (err) this.toast.error(err);
            });
    };

    modifyExaminationEvent = (configuration: ExaminationEventConfiguration) => {
        const modalRef = this.modal.open(ExaminationEventDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.config = configuration;
        modalRef.componentInstance.requiresPassword = this.exam.implementation === 'CLIENT_AUTH';
        modalRef.componentInstance.examMaxDate = this.exam.periodEnd;
        modalRef.componentInstance.maintenancePeriods = this.maintenancePeriods;
        modalRef.componentInstance.examId = this.exam.id;
        modalRef.componentInstance.duration = this.exam.duration;
        modalRef.result
            .then((config: ExaminationEventConfiguration) => {
                const index = this.exam.examinationEventConfigurations.indexOf(configuration);
                this.exam.examinationEventConfigurations.splice(index, 1, config);
            })
            .catch((err) => {
                if (err) this.toast.error(err);
            });
    };

    removeExaminationEvent = (configuration: ExaminationEventConfiguration) => {
        if (configuration.examEnrolments.length > 0) {
            return;
        }
        this.Confirmation.open$(
            this.translate.instant('i18n_remove_examination_event'),
            this.translate.instant('i18n_are_you_sure'),
        ).subscribe({
            next: () =>
                this.Exam.removeExaminationEvent$(this.exam.id, configuration).subscribe({
                    next: () => {
                        this.exam.examinationEventConfigurations.splice(
                            this.exam.examinationEventConfigurations.indexOf(configuration),
                            1,
                        );
                    },
                    error: (err) => this.toast.error(err),
                }),
            error: (err) => this.toast.error(err),
        });
    };

    sortByString = (prop: ExaminationEventConfiguration[]): Array<ExaminationEventConfiguration> =>
        prop.sort((a, b) => Date.parse(a.examinationEvent.start) - Date.parse(b.examinationEvent.start));

    private updateExam$ = (silent?: boolean, overrides?: Record<string, string>): Observable<Exam> => {
        return this.Exam.updateExam$(this.exam, overrides, this.collaborative()).pipe(
            tap(() => {
                if (!silent) {
                    this.toast.info(this.translate.instant('i18n_exam_saved'));
                }
            }),
            catchError((err) => {
                this.toast.error(err);
                return throwError(() => new Error(err));
            }),
        );
    };

    private isAllowedToUnpublishOrRemove = () =>
        // allowed if no upcoming reservations and if no one has taken this yet
        !this.exam.hasEnrolmentsInEffect && this.exam.children.length === 0;

    private countQuestions = () => this.exam.examSections.reduce((a, b) => a + b.sectionQuestions.length, 0);

    private hasDuplicatePercentages = () => {
        if (!this.exam.autoEvaluationConfig) return false;
        const percentages = this.exam.autoEvaluationConfig.gradeEvaluations.map((e) => e.percentage).sort();
        for (let i = 0; i < percentages.length - 1; ++i) {
            if (percentages[i + 1] === percentages[i]) {
                return true;
            }
        }
        return false;
    };

    private errorsPreventingPrePublication(): string[] {
        const errors: string[] = [];

        if (!this.exam.name || this.exam.name.length < 2) {
            errors.push('i18n_exam_name_missing_or_too_short');
        }

        if (this.exam.examLanguages.length === 0) {
            errors.push('i18n_error_exam_empty_exam_language');
        }

        const isPrintout = this.exam.executionType.type === 'PRINTOUT';
        if (!isPrintout && !this.exam.periodStart) {
            errors.push('i18n_exam_start_date_missing');
        }

        if (!isPrintout && !this.exam.periodEnd) {
            errors.push('i18n_exam_end_date_missing');
        }
        if (isPrintout && this.exam.examinationDates.length === 0) {
            errors.push('i18n_examination_date_missing');
        }
        if (!this.exam.duration) {
            errors.push('i18n_exam_duration_missing');
        }

        if (!this.exam.gradeScale) {
            errors.push('i18n_exam_grade_scale_missing');
        }

        if (!this.exam.examType) {
            errors.push('i18n_exam_credit_type_missing');
        }
        if (this.exam.examOwners.length == 0) {
            errors.push('i18n_exam_owner_missing');
        }

        return errors;
    }

    private errorsPreventingPublication(): string[] {
        const errors: string[] = this.errorsPreventingPrePublication();

        if (!this.exam.course && !this.collaborative) {
            errors.push('i18n_course_missing');
        }

        if (this.countQuestions() === 0) {
            errors.push('i18n_exam_has_no_questions');
        }

        const allSectionsNamed = this.exam.examSections.every((section) => section.name?.length > 0);
        if (!allSectionsNamed) {
            errors.push('i18n_exam_contains_unnamed_sections');
        }

        if (['PRIVATE', 'MATURITY'].indexOf(this.exam.executionType.type) > -1 && this.exam.examEnrolments.length < 1) {
            errors.push('i18n_no_participants');
        }

        if (this.exam.executionType.type === 'MATURITY' && !isBoolean(this.exam.subjectToLanguageInspection)) {
            errors.push('i18n_language_inspection_setting_not_chosen');
        }

        if (this.hasDuplicatePercentages()) {
            errors.push('i18n_autoevaluation_percentages_not_unique');
        }
        if (this.exam.autoEvaluationConfig) {
            if (
                this.exam.autoEvaluationConfig.releaseType === 'GIVEN_AMOUNT_DAYS' &&
                !this.exam.autoEvaluationConfig.amountDays
            ) {
                errors.push('no auto-evaluation amount of days selected');
            }
            if (
                this.exam.autoEvaluationConfig.releaseType === 'GIVEN_DATE' &&
                !this.exam.autoEvaluationConfig.releaseDate
            ) {
                errors.push('no auto-evaluation date selected');
            }
        }
        if (this.exam.examFeedbackConfig) {
            if (
                this.exam.examFeedbackConfig.releaseType === 'GIVEN_AMOUNT_DAYS' &&
                !this.exam.examFeedbackConfig.amountDays
            ) {
                errors.push('no feedback amount of days selected');
            }
            if (
                this.exam.examFeedbackConfig.releaseType === 'GIVEN_DATE' &&
                !this.exam.examFeedbackConfig.releaseDate
            ) {
                errors.push('no feedback date selected');
            }
        }
        if (this.exam.implementation !== 'AQUARIUM' && this.exam.examinationEventConfigurations.length === 0) {
            errors.push('i18n_missing_examination_event_configurations');
        }
        return errors.map((e) => this.translate.instant(e));
    }
}
