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
import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../../../session/session.service';
import { ConfirmationDialogService } from '../../../utility/dialogs/confirmationDialog.service';
import { WindowRef } from '../../../utility/window/window.service';
import { Exam } from '../../exam.model';
import { ExamService } from '../../exam.service';
import { ExaminationEventDialogComponent } from '../events/examinationEventDialog.component';
import { ExamTabService } from '../examTabs.service';
import { PublicationDialogComponent } from './publicationDialog.component';
import { PublicationErrorDialogComponent } from './publicationErrorDialog.component';
import { PublicationRevocationDialogComponent } from './publicationRevocationDialog.component';

import type { OnInit } from '@angular/core';
import type { Observable } from 'rxjs';
import type { User } from '../../../session/session.service';
import type { AutoEvaluationConfig, ExaminationDate, ExaminationEventConfiguration } from '../../exam.model';
@Component({
    selector: 'exam-publication',
    templateUrl: './examPublication.component.html',
})
export class ExamPublicationComponent implements OnInit {
    @Input() exam: Exam;
    @Input() collaborative: boolean;

    user: User;
    hostName: string;
    autoEvaluation: { enabled: boolean };
    examDurations: number[];
    visibleParticipantSelector = 'participant';

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private state: StateService,
        private modal: NgbModal,
        private windowRef: WindowRef,
        private Session: SessionService,
        private Exam: ExamService,
        private Confirmation: ConfirmationDialogService,
        private Tabs: ExamTabService,
    ) {}

    ngOnInit() {
        this.hostName = this.windowRef.nativeWindow.location.origin;
        this.user = this.Session.getUser();
        this.autoEvaluation = {
            enabled: !!this.exam.autoEvaluationConfig,
        };
        this.http.get<{ examDurations: number[] }>('/app/settings/durations').subscribe(
            (data) => (this.examDurations = data.examDurations),
            (error) => toast.error(error),
        );
        this.Tabs.notifyTabChange(3);
    }

    addExaminationDate = (date: Date) => {
        const fmt = 'DD/MM/YYYY';
        const formattedDate = moment(date).format(fmt);
        const alreadyExists: boolean = this.exam.examinationDates
            .map((ed: { date: Date | number }) => moment(ed.date).format(fmt))
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

    startDateChanged = (event: { date: string }) => (this.exam.examActiveStartDate = event.date);
    endDateChanged = (event: { date: string }) => (this.exam.examActiveEndDate = event.date);

    autoEvaluationConfigChanged = (event: { config: AutoEvaluationConfig }) => {
        this.exam.autoEvaluationConfig = event.config;
    };

    canBeAutoEvaluated = () =>
        this.Exam.hasQuestions(this.exam) &&
        !this.Exam.hasEssayQuestions(this.exam) &&
        this.exam.gradeScale &&
        this.exam.executionType.type !== 'MATURITY';

    private updateExam$ = (silent?: boolean, overrides?: Record<string, string>): Observable<Exam> => {
        const config = {
            evaluationConfig:
                this.autoEvaluation.enabled && this.canBeAutoEvaluated()
                    ? {
                          releaseType: this.exam.autoEvaluationConfig?.releaseType,
                          releaseDate: this.exam.autoEvaluationConfig?.releaseDate
                              ? new Date(this.exam.autoEvaluationConfig.releaseDate).getTime()
                              : null,
                          amountDays: this.exam.autoEvaluationConfig?.amountDays,
                          gradeEvaluations: this.exam.autoEvaluationConfig?.gradeEvaluations,
                      }
                    : null,
        };

        Object.assign(config, overrides);
        return this.Exam.updateExam$(this.exam, config, this.collaborative).pipe(
            tap(() => {
                if (!silent) {
                    toast.info(this.translate.instant('sitnet_exam_saved'));
                }
            }),
            catchError((err) => {
                toast.error(err);
                return throwError(err);
            }),
        );
    };

    updateExam = () => this.updateExam$().subscribe();

    setExamDuration = (duration: number) => {
        this.exam.duration = duration;
        this.updateExam$().subscribe();
    };

    checkDuration = (duration: number) => (this.exam.duration === duration ? 'btn-primary' : '');

    range = (min: number, max: number, step = 1) => {
        const input: number[] = [];
        for (let i = min; i <= max; i += step) {
            input.push(i);
        }
        return input;
    };

    checkTrialCount = (x: number) => (this.exam.trialCount === x ? 'btn-primary' : '');

    setTrialCount = (x: number) => {
        this.exam.trialCount = x;
        this.updateExam$().subscribe();
    };

    previewExam = (fromTab: number) => this.Exam.previewExam(this.exam, fromTab, this.collaborative);

    nextTab = () => {
        this.Tabs.notifyTabChange(4);
        this.state.go('examEditor.assessments');
    };
    previousTab = () => {
        this.Tabs.notifyTabChange(2);
        this.state.go('examEditor.sections');
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
            modal.result.then(() => {
                const state = {
                    state: this.isDraftCollaborativeExam() ? 'PRE_PUBLISHED' : 'PUBLISHED',
                };
                // OK button clicked
                this.updateExam$(true, state).subscribe(
                    () => {
                        const text = this.isDraftCollaborativeExam()
                            ? 'sitnet_exam_saved_and_pre_published'
                            : 'sitnet_exam_saved_and_published';
                        toast.success(this.translate.instant(text));
                        this.state.go('dashboard');
                    },
                    (err) => toast.error(err.data),
                );
            });
        }
    };

    isDraftCollaborativeExam = () => this.collaborative && this.exam.state === 'DRAFT';

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
                        state: this.collaborative ? 'PRE_PUBLISHED' : 'DRAFT',
                    }).subscribe(
                        () => {
                            toast.success(this.translate.instant('sitnet_exam_unpublished'));
                            this.exam.state = 'DRAFT';
                        },
                        (err) => toast.error(err.data),
                    ),
                );
        } else {
            toast.warning(this.translate.instant('sitnet_unpublish_not_possible'));
        }
    };

    autoEvaluationDisabled = () => (this.autoEvaluation.enabled = false);
    autoEvaluationEnabled = () => (this.autoEvaluation.enabled = true);

    addExaminationEvent = () => {
        const modalRef = this.modal.open(ExaminationEventDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.requiresPassword = this.exam.implementation === 'CLIENT_AUTH';
        modalRef.result.then((data: ExaminationEventConfiguration) => {
            this.Exam.addExaminationEvent$(this.exam.id, data).subscribe((config: ExaminationEventConfiguration) => {
                this.exam.examinationEventConfigurations.push(config);
            });
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
        modalRef.result.then((data: ExaminationEventConfiguration) => {
            this.Exam.updateExaminationEvent$(this.exam.id, Object.assign(data, { id: configuration.id })).subscribe(
                (config: ExaminationEventConfiguration) => {
                    const index = this.exam.examinationEventConfigurations.indexOf(configuration);
                    console.log(index);
                    this.exam.examinationEventConfigurations.splice(index, 1, config);
                    console.log(this.exam.examinationEventConfigurations[0].settingsPassword);
                },
            );
        });
    };

    removeExaminationEvent = (configuration: ExaminationEventConfiguration) => {
        if (configuration.examEnrolments.length > 0) {
            return;
        }
        this.Confirmation.open(
            this.translate.instant('sitnet_remove_examination_event'),
            this.translate.instant('sitnet_are_you_sure'),
        )
            .result.then(() =>
                this.Exam.removeExaminationEvent$(this.exam.id, configuration).subscribe(
                    () => {
                        this.exam.examinationEventConfigurations.splice(
                            this.exam.examinationEventConfigurations.indexOf(configuration),
                            1,
                        );
                    },
                    (resp) => toast.error(resp),
                ),
            )
            .catch((err) => toast.error(err.data));
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
            errors.push('sitnet_exam_name_missing_or_too_short');
        }

        if (this.exam.examLanguages.length === 0) {
            errors.push('sitnet_error_exam_empty_exam_language');
        }

        const isPrintout = this.exam.executionType.type === 'PRINTOUT';
        if (!isPrintout && !this.exam.examActiveStartDate) {
            errors.push('sitnet_exam_start_date_missing');
        }

        if (!isPrintout && !this.exam.examActiveEndDate) {
            errors.push('sitnet_exam_end_date_missing');
        }
        if (isPrintout && this.exam.examinationDates.length === 0) {
            errors.push('sitnet_examination_date_missing');
        }
        if (!this.exam.duration) {
            errors.push('sitnet_exam_duration_missing');
        }

        if (!this.exam.gradeScale) {
            errors.push('sitnet_exam_grade_scale_missing');
        }

        if (!this.exam.examType) {
            errors.push('sitnet_exam_credit_type_missing');
        }
        if (this.exam.examOwners.length == 0) {
            errors.push('sitnet_exam_owner_missing');
        }

        return errors;
    }

    private errorsPreventingPublication(): string[] {
        const errors: string[] = this.errorsPreventingPrePublication();

        if (!this.exam.course && !this.collaborative) {
            errors.push('sitnet_course_missing');
        }

        if (this.countQuestions() === 0) {
            errors.push('sitnet_exam_has_no_questions');
        }

        const allSectionsNamed = this.exam.examSections.every((section) => !_.isEmpty(section.name));
        if (!allSectionsNamed) {
            errors.push('sitnet_exam_contains_unnamed_sections');
        }

        if (['PRIVATE', 'MATURITY'].indexOf(this.exam.executionType.type) > -1 && this.exam.examEnrolments.length < 1) {
            errors.push('sitnet_no_participants');
        }

        if (this.exam.executionType.type === 'MATURITY' && !_.isBoolean(this.exam.subjectToLanguageInspection)) {
            errors.push('sitnet_language_inspection_setting_not_chosen');
        }

        if (this.autoEvaluation.enabled && this.hasDuplicatePercentages()) {
            errors.push('sitnet_autoevaluation_percentages_not_unique');
        }

        if (this.exam.implementation !== 'AQUARIUM' && this.exam.examinationEventConfigurations.length === 0) {
            errors.push('sitnet_missing_examination_event_configurations');
        }
        return errors.map((e) => this.translate.instant(e));
    }
}
