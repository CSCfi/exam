// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { AutoEvaluationConfig, Exam, ExaminationDate } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { isBoolean } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { CollaborativeExamOwnerSelectorComponent } from './collaborative-exam-owner-picker.component';
import { CustomDurationPickerDialogComponent } from './custom-duration-picker-dialog.component';
import { ExamPublicationParticipantsComponent } from './exam-publication-participants.component';
import { ExaminationEventsComponent } from './examination-events.component';
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
        ExamPublicationParticipantsComponent,
        CollaborativeExamOwnerSelectorComponent,
        OrganisationSelectorComponent,
        ExaminationEventsComponent,
        UpperCasePipe,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
    styleUrls: ['../../exam.shared.scss', './exam-publication.component.scss'],
})
export class ExamPublicationComponent implements OnInit {
    exam!: Exam;

    collaborative = signal(false);
    isAdmin = signal(false);
    hostName = signal('');
    examDurations = signal<number[]>([]);

    constructor(
        private http: HttpClient,
        private route: ActivatedRoute,
        private router: Router,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private Session: SessionService,
        private Exam: ExamService,
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
        this.exam.duration = duration;
        this.updateExam$().subscribe();
    };

    format = (minutes: number): string => Duration.fromObject({ minutes: minutes }).toFormat('hh:mm');

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

    openCustomTimeEditor = () => {
        from(
            this.modal.open(CustomDurationPickerDialogComponent, {
                backdrop: 'static',
                keyboard: true,
            }).result,
        ).subscribe((duration: { hours: number; minutes: number }) =>
            this.setExamDuration(duration.hours, duration.minutes),
        );
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
        const percentages = this.exam.autoEvaluationConfig.gradeEvaluations.map((e) => e.percentage);
        return new Set(percentages).size !== percentages.length;
    };

    private errorsPreventingPrePublication(): string[] {
        const errors = [];
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
        if (!this.exam.course && !this.collaborative()) {
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
