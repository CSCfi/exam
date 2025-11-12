// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, UpperCasePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DateTime, Duration } from 'luxon';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ExamTabService } from 'src/app/exam/editor/exam-tabs.service';
import type { AutoEvaluationConfig, Exam, ExaminationDate } from 'src/app/exam/exam.model';
import { ExamService } from 'src/app/exam/exam.service';
import { SessionService } from 'src/app/session/session.service';
import { DatePickerComponent } from 'src/app/shared/date/date-picker.component';
import { ModalService } from 'src/app/shared/dialogs/modal.service';
import { isBoolean } from 'src/app/shared/miscellaneous/helpers';
import { OrderByPipe } from 'src/app/shared/sorting/order-by.pipe';
import { CustomDurationPickerDialogComponent } from './custom-duration-picker-dialog.component';
import { ExamPublicationParticipantsComponent } from './exam-publication-participants.component';
import { ExaminationEventsComponent } from './examination-events.component';
import { PublicationDialogComponent } from './publication-dialog.component';
import { PublicationErrorDialogComponent } from './publication-error-dialog.component';
import { PublicationRevocationDialogComponent } from './publication-revocation-dialog.component';

@Component({
    selector: 'xm-exam-publication',
    templateUrl: './exam-publication.component.html',
    imports: [
        DatePickerComponent,
        FormsModule,
        NgbPopover,
        NgClass,
        ExamPublicationParticipantsComponent,
        ExaminationEventsComponent,
        UpperCasePipe,
        DatePipe,
        TranslateModule,
        OrderByPipe,
    ],
    styleUrls: ['../../exam.shared.scss', './exam-publication.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamPublicationComponent {
    exam = signal<Exam>({} as Exam);

    collaborative = signal(false);
    isAdmin = signal(false);
    hostName = signal('');
    examDurations = signal<number[]>([]);

    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private translate = inject(TranslateService);
    private modal = inject(ModalService);
    private toast = inject(ToastrService);
    private Session = inject(SessionService);
    private Exam = inject(ExamService);
    private Tabs = inject(ExamTabService);

    constructor() {
        this.hostName.set(window.location.origin);
        this.isAdmin.set(this.Session.getUser().isAdmin);
        this.exam.set(this.Tabs.getExam());
        this.collaborative.set(this.Tabs.isCollaborative());
        this.http.get<{ examDurations: number[] }>('/app/settings/durations').subscribe({
            next: (data) => this.examDurations.set(data.examDurations),
            error: (err) => this.toast.error(err),
        });
        this.Tabs.notifyTabChange(4);
    }

    addExaminationDate(event: { date: Date | null }) {
        if (!event.date) return;
        const currentExam = this.exam();
        const fmt = 'dd/MM/yyyy';
        const formattedDate = DateTime.fromJSDate(event.date).toFormat(fmt);
        const alreadyExists: boolean = currentExam.examinationDates
            .map((ed) => DateTime.fromISO(ed.date).toFormat(fmt))
            .some((d: string) => d === formattedDate);
        if (!alreadyExists) {
            this.http
                .post<ExaminationDate>(`/app/exam/${currentExam.id}/examinationdate`, {
                    date: formattedDate,
                })
                .subscribe((date) => currentExam.examinationDates.push(date));
        }
    }

    removeExaminationDate(date: ExaminationDate) {
        const currentExam = this.exam();
        this.http.delete(`/app/exam/${currentExam.id}/examinationdate/${date.id}`).subscribe(() => {
            const i = currentExam.examinationDates.indexOf(date);
            currentExam.examinationDates.splice(i, 1);
        });
    }

    startDateChanged(event: { date: Date | null }) {
        const currentExam = this.exam();
        currentExam.periodStart = event.date ? event.date.toISOString() : null;
    }

    endDateChanged(event: { date: Date | null }) {
        const currentExam = this.exam();
        currentExam.periodEnd = event.date ? event.date.toISOString() : null;
    }

    autoEvaluationConfigChanged(event: { config: AutoEvaluationConfig }) {
        const currentExam = this.exam();
        currentExam.autoEvaluationConfig = event.config;
    }

    canBeAutoEvaluated() {
        const currentExam = this.exam();
        return (
            this.Exam.hasQuestions(currentExam) &&
            !this.Exam.hasEssayQuestions(currentExam) &&
            currentExam.gradeScale &&
            currentExam.executionType.type !== 'MATURITY'
        );
    }

    updateExam() {
        this.updateExam$().subscribe();
    }

    setExamDuration(hours: number, minutes: number) {
        const currentExam = this.exam();
        const duration = hours * 60 + minutes;
        currentExam.duration = duration;
        this.updateExam$().subscribe();
    }

    format(minutes: number): string {
        return Duration.fromObject({ minutes: minutes }).toFormat('hh:mm');
    }

    checkDuration(duration: number) {
        const currentExam = this.exam();
        return currentExam.duration === duration ? 'btn-primary' : '';
    }

    range(min: number, max: number, step = 1) {
        return [...Array(step + max - min).keys()].map((v) => min + v);
    }

    checkTrialCount(x: number | null) {
        const currentExam = this.exam();
        return currentExam.trialCount === x ? 'btn-primary' : '';
    }

    setTrialCount(x: number | null) {
        const currentExam = this.exam();
        currentExam.trialCount = x;
        this.updateExam$().subscribe();
    }

    previewExam(fromTab: number) {
        const currentExam = this.exam();
        this.Exam.previewExam(currentExam, fromTab, this.collaborative());
    }

    previousTab() {
        this.Tabs.notifyTabChange(3);
        this.router.navigate(['..', '3'], { relativeTo: this.route });
    }

    openCustomTimeEditor() {
        this.modal
            .open$<{ hours: number; minutes: number }>(CustomDurationPickerDialogComponent)
            .subscribe((duration) => this.setExamDuration(duration.hours, duration.minutes));
    }

    saveAndPublishExam() {
        const currentExam = this.exam();
        const errors: string[] = this.isDraftCollaborativeExam()
            ? this.errorsPreventingPrePublication()
            : this.errorsPreventingPublication();

        if (errors.length > 0) {
            const modal = this.modal.openRef(PublicationErrorDialogComponent);
            modal.componentInstance.errors = errors;
        } else {
            const modal = this.modal.openRef(PublicationDialogComponent);
            modal.componentInstance.exam = currentExam;
            modal.componentInstance.prePublication = this.isDraftCollaborativeExam();
            this.modal.result$(modal).subscribe(() => {
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
            });
        }
    }

    isDraftCollaborativeExam() {
        const currentExam = this.exam();
        return this.collaborative() && currentExam.state === 'DRAFT';
    }

    // TODO: how should this work when it comes to private exams?
    unpublishExam() {
        const currentExam = this.exam();
        if (this.isAllowedToUnpublishOrRemove()) {
            this.modal.open$(PublicationRevocationDialogComponent).subscribe(() =>
                this.updateExam$(true, { state: this.collaborative() ? 'PRE_PUBLISHED' : 'DRAFT' }).subscribe({
                    next: () => {
                        this.toast.success(this.translate.instant('i18n_exam_unpublished'));
                        currentExam.state = 'DRAFT';
                    },
                    error: (err) => this.toast.error(err),
                }),
            );
        } else {
            this.toast.warning(this.translate.instant('i18n_unpublish_not_possible'));
        }
    }

    private updateExam$(silent?: boolean, overrides?: Record<string, string>): Observable<Exam> {
        const currentExam = this.exam();
        return this.Exam.updateExam$(currentExam, overrides, this.collaborative()).pipe(
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
    }

    private isAllowedToUnpublishOrRemove() {
        const currentExam = this.exam();
        // allowed if no upcoming reservations and if no one has taken this yet
        return !currentExam.hasEnrolmentsInEffect && currentExam.children.length === 0;
    }

    private countQuestions() {
        const currentExam = this.exam();
        return currentExam.examSections.reduce((a, b) => a + b.sectionQuestions.length, 0);
    }

    private hasDuplicatePercentages() {
        const currentExam = this.exam();
        if (!currentExam.autoEvaluationConfig) return false;
        const percentages = currentExam.autoEvaluationConfig.gradeEvaluations.map((e) => e.percentage);
        return new Set(percentages).size !== percentages.length;
    }

    private errorsPreventingPrePublication(): string[] {
        const currentExam = this.exam();
        const errors = [];
        if (!currentExam.name || currentExam.name.length < 2) {
            errors.push('i18n_exam_name_missing_or_too_short');
        }
        if (currentExam.examLanguages.length === 0) {
            errors.push('i18n_error_exam_empty_exam_language');
        }
        const isPrintout = currentExam.executionType.type === 'PRINTOUT';
        if (!isPrintout && !currentExam.periodStart) {
            errors.push('i18n_exam_start_date_missing');
        }
        if (!isPrintout && !currentExam.periodEnd) {
            errors.push('i18n_exam_end_date_missing');
        }
        if (isPrintout && currentExam.examinationDates.length === 0) {
            errors.push('i18n_examination_date_missing');
        }
        if (!currentExam.duration) {
            errors.push('i18n_exam_duration_missing');
        }
        if (!currentExam.gradeScale) {
            errors.push('i18n_exam_grade_scale_missing');
        }
        if (!currentExam.examType) {
            errors.push('i18n_exam_credit_type_missing');
        }
        if (currentExam.examOwners.length == 0) {
            errors.push('i18n_exam_owner_missing');
        }
        return errors;
    }

    private errorsPreventingPublication(): string[] {
        const currentExam = this.exam();
        const errors: string[] = this.errorsPreventingPrePublication();
        if (!currentExam.course && !this.collaborative()) {
            errors.push('i18n_course_missing');
        }
        if (this.countQuestions() === 0) {
            errors.push('i18n_exam_has_no_questions');
        }
        const allSectionsNamed = currentExam.examSections.every((section) => section.name?.length > 0);
        if (!allSectionsNamed) {
            errors.push('i18n_exam_contains_unnamed_sections');
        }
        if (
            ['PRIVATE', 'MATURITY'].indexOf(currentExam.executionType.type) > -1 &&
            currentExam.examEnrolments.length < 1
        ) {
            errors.push('i18n_no_participants');
        }
        if (currentExam.executionType.type === 'MATURITY' && !isBoolean(currentExam.subjectToLanguageInspection)) {
            errors.push('i18n_language_inspection_setting_not_chosen');
        }
        if (this.hasDuplicatePercentages()) {
            errors.push('i18n_autoevaluation_percentages_not_unique');
        }
        if (currentExam.autoEvaluationConfig) {
            if (
                currentExam.autoEvaluationConfig.releaseType === 'GIVEN_AMOUNT_DAYS' &&
                !currentExam.autoEvaluationConfig.amountDays
            ) {
                errors.push('no auto-evaluation amount of days selected');
            }
            if (
                currentExam.autoEvaluationConfig.releaseType === 'GIVEN_DATE' &&
                !currentExam.autoEvaluationConfig.releaseDate
            ) {
                errors.push('no auto-evaluation date selected');
            }
        }
        if (currentExam.examFeedbackConfig) {
            if (
                currentExam.examFeedbackConfig.releaseType === 'GIVEN_AMOUNT_DAYS' &&
                !currentExam.examFeedbackConfig.amountDays
            ) {
                errors.push('no feedback amount of days selected');
            }
            if (
                currentExam.examFeedbackConfig.releaseType === 'GIVEN_DATE' &&
                !currentExam.examFeedbackConfig.releaseDate
            ) {
                errors.push('no feedback date selected');
            }
        }
        if (currentExam.implementation !== 'AQUARIUM' && currentExam.examinationEventConfigurations.length === 0) {
            errors.push('i18n_missing_examination_event_configurations');
        }
        return errors.map((e) => this.translate.instant(e));
    }
}
