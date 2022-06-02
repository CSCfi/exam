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
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import { parseISO } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QuestionService } from '../question/question.service';
import { SessionService } from '../session/session.service';
import { ConfirmationDialogService } from '../shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from '../shared/miscellaneous/common-exam.service';
import type {
    Exam,
    ExamExecutionType,
    ExaminationEventConfiguration,
    ExamSection,
    ExamType,
    GradeScale,
    Implementation,
} from './exam.model';

export type ExaminationEventConfigurationInput = {
    id?: number;
    config: {
        examinationEvent: {
            start: string;
            description: string;
            capacity: number;
        };
        settingsPassword?: string;
    };
};

type SectionContainer = { examSections: ExamSection[] };
@Injectable()
export class ExamService {
    constructor(
        private translate: TranslateService,
        private State: StateService,
        private http: HttpClient,
        private toast: ToastrService,
        private CommonExam: CommonExamService,
        private Question: QuestionService,
        private Session: SessionService,
        private ConfirmationDialog: ConfirmationDialogService,
    ) {}

    getReviewablesCount = (exam: Exam) =>
        exam.children.filter((child) => child.state === 'REVIEW' || child.state === 'REVIEW_STARTED').length;

    getGradedCount = (exam: Exam) => exam.children.filter((child) => child.state === 'GRADED').length;

    getProcessedCount = (exam: Exam) =>
        exam.children.filter((child) => ['REVIEW', 'REVIEW_STARTED', 'GRADED'].indexOf(child.state) === -1).length;

    createExam = (executionType: string, examinationType: Implementation = 'AQUARIUM') => {
        this.http
            .post<Exam>('/app/exams', { executionType: executionType, implementation: examinationType })
            .subscribe({
                next: (response) => {
                    this.toast.info(this.translate.instant('sitnet_exam_added'));
                    this.State.go('staff.courseSelector', { id: response.id });
                },
                error: this.toast.error,
            });
    };

    updateExam$ = (exam: Exam, overrides = {}, collaborative = false): Observable<Exam> => {
        const data = {
            id: exam.id,
            name: exam.name || '',
            examType: exam.examType,
            instruction: exam.instruction || '',
            enrollInstruction: exam.enrollInstruction || '',
            state: exam.state,
            shared: exam.shared,
            examActiveStartDate: exam.examActiveStartDate ? new Date(exam.examActiveStartDate).getTime() : undefined,
            examActiveEndDate: exam.examActiveEndDate
                ? new Date(exam.examActiveEndDate).setHours(23, 59, 59, 999)
                : undefined,
            duration: exam.duration,
            grading: exam.gradeScale ? exam.gradeScale.id : undefined,
            expanded: exam.expanded,
            trialCount: exam.trialCount || undefined,
            subjectToLanguageInspection: exam.subjectToLanguageInspection,
            internalRef: exam.internalRef,
            objectVersion: exam.objectVersion,
            attachment: exam.attachment,
            anonymous: exam.anonymous,
            organisations: exam.organisations,
            implementation: exam.implementation,
        };
        Object.assign(data, overrides);
        const url = collaborative ? '/app/iop/exams' : '/app/exams';
        return this.http.put<Exam>(`${url}/${exam.id}`, data);
    };

    refreshExamTypes$ = (): Observable<(ExamType & { name: string })[]> =>
        this.http.get<ExamType[]>('/app/examtypes').pipe(
            map((resp) =>
                resp.map((et) => ({
                    ...et,
                    name: this.CommonExam.getExamTypeDisplayName(et.type),
                })),
            ),
        );

    refreshGradeScales$ = (isCollaborative: boolean): Observable<GradeScale[]> => {
        const url = isCollaborative ? '/app/iop/gradescales' : '/app/gradescales';
        return this.http.get<GradeScale[]>(url).pipe(
            map((resp) =>
                resp.map((gs) =>
                    Object.assign(gs, {
                        name: this.CommonExam.getScaleDisplayName(gs),
                    }),
                ),
            ),
        );
    };

    getExecutionTypeTranslation = (et: ExamExecutionType) => {
        switch (et.type) {
            case 'PUBLIC':
                return 'sitnet_public_exam';
            case 'PRIVATE':
                return 'sitnet_private_exam';
            case 'MATURITY':
                return 'sitnet_maturity';
            case 'PRINTOUT':
                return 'sitnet_printout_exam';
            default:
                return '';
        }
    };

    listExecutionTypes$ = (): Observable<(ExamExecutionType & { name: string })[]> =>
        this.http.get<ExamExecutionType[]>('/app/executiontypes').pipe(
            map((resp) =>
                resp.map((et) =>
                    Object.assign(et, {
                        name: this.getExecutionTypeTranslation(et),
                    }),
                ),
            ),
        );

    getSectionTotalNumericScore = (section: ExamSection): number => {
        const score = section.sectionQuestions.reduce((n, sq) => {
            const points = this.Question.calculateAnswerScore(sq);
            // handle only numeric scores (leave out approved/rejected type of scores)
            return n + (points.rejected === false && points.approved === false ? points.score : 0);
        }, 0);
        return this.isInteger(score) ? score : parseFloat(score.toFixed(2));
    };

    getSectionTotalScore = (section: ExamSection): number => {
        const score = section.sectionQuestions.reduce((n, sq) => {
            const points = this.Question.calculateAnswerScore(sq);
            return n + points.score;
        }, 0);
        return this.isInteger(score) ? score : parseFloat(score.toFixed(2));
    };

    getSectionMaxScore = (section: ExamSection): number => {
        let maxScore = section.sectionQuestions.reduce((n, sq) => {
            if (!sq || !sq.question) {
                return n;
            }
            return n + this.Question.calculateMaxScore(sq);
        }, 0);
        if (section.lotteryOn) {
            maxScore = (maxScore * section.lotteryItemCount) / Math.max(1, section.sectionQuestions.length);
        }
        return this.isInteger(maxScore) ? maxScore : parseFloat(maxScore.toFixed(2));
    };

    hasQuestions = (exam: SectionContainer) => exam.examSections.reduce((a, b) => a + b.sectionQuestions.length, 0) > 0;

    hasEssayQuestions = (exam: SectionContainer) =>
        exam.examSections.filter((es) => es.sectionQuestions.some((sq) => sq.question.type === 'EssayQuestion'))
            .length > 0;

    getMaxScore = (exam: SectionContainer) => exam.examSections.reduce((n, es) => n + this.getSectionMaxScore(es), 0);

    getTotalScore = (exam: SectionContainer): string => {
        const score = exam.examSections.reduce((n, es) => n + this.getSectionTotalNumericScore(es), 0).toFixed(2);
        return parseFloat(score) > 0 ? score : '0';
    };

    isOwner = (exam: Exam, collaborative = false) => {
        const user = this.Session.getUser();
        const examToCheck: Exam = exam && exam.parent ? exam.parent : exam;
        return (
            examToCheck &&
            examToCheck.examOwners.filter(
                (o) => o.id === user.id || (collaborative && (o.eppn === user.eppn || o.email === user.email)),
            ).length > 0
        );
    };

    isOwnerOrAdmin = (exam: Exam, collaborative = false) => {
        const user = this.Session.getUser();
        return exam && user && (user.isAdmin || this.isOwner(exam, collaborative));
    };

    removeExam = (exam: Exam, collaborative = false) => {
        if (this.isAllowedToUnpublishOrRemove(exam, collaborative)) {
            this.ConfirmationDialog.open$(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_remove_exam'),
            ).subscribe({
                next: () =>
                    this.http.delete(this.getResource(`/app/exams/${exam.id}`, collaborative)).subscribe({
                        next: () => {
                            this.toast.success(this.translate.instant('sitnet_exam_removed'));
                            this.State.go('dashboard');
                        },
                        error: this.toast.error,
                    }),
                error: this.toast.error,
            });
        } else {
            this.toast.warning(this.translate.instant('sitnet_exam_removal_not_possible'));
        }
    };

    getResource = (url: string, collaborative = false) =>
        collaborative ? url.replace('/app/exams/', '/app/iop/exams/') : url;

    isAllowedToUnpublishOrRemove = (exam: Exam, collaborative = false) => {
        if (collaborative) {
            return this.Session.getUser().isAdmin && (exam.state === 'DRAFT' || exam.state === 'PRE_PUBLISHED');
        }
        // allowed if no upcoming reservations and if no one has taken this yet
        return !exam.hasEnrolmentsInEffect && (!exam.children || exam.children.length === 0);
    };

    previewExam = (exam: Exam, fromTab: number, collaborative: boolean) => {
        const params = { id: exam.id, tab: fromTab };
        if (collaborative) {
            this.State.go('staff.collaborativePreview', params);
        } else if (exam.executionType.type === 'PRINTOUT') {
            this.State.go('staff.printout', params);
        } else {
            this.State.go('staff.examPreview', params);
        }
    };

    reorderSections$ = (from: number, to: number, exam: Exam, collaborative: boolean): Observable<void> =>
        this.http.put<void>(this.getResource(`/app/exams/${exam.id}/reorder`, collaborative), { from: from, to: to });

    addSection$ = (exam: Exam, collaborative: boolean): Observable<ExamSection> =>
        this.http.post<ExamSection>(this.getResource(`/app/exams/${exam.id}/sections`, collaborative), {});

    removeSection$ = (exam: Exam, section: ExamSection): Observable<void> =>
        this.http.delete<void>(this.getResource(`/app/exams/${exam.id}/sections/${section.id}`));

    addExaminationEvent$ = (
        examId: number,
        config: ExaminationEventConfigurationInput,
    ): Observable<ExaminationEventConfiguration> =>
        this.http.post<ExaminationEventConfiguration>(`/app/exam/${examId}/examinationevents`, config);

    updateExaminationEvent$ = (
        examId: number,
        config: ExaminationEventConfigurationInput,
    ): Observable<ExaminationEventConfiguration> =>
        this.http.put<ExaminationEventConfiguration>(`/app/exam/${examId}/examinationevents/${config.id}`, config);

    removeAllEventEnrolmentConfigs$ = (config: ExaminationEventConfiguration) =>
        this.http.delete<void>(`/app/enrolments/${config.id}/configs`);

    removeExaminationEvent$ = (examId: number, config: ExaminationEventConfiguration) =>
        this.http.delete<void>(`/app/exam/${examId}/examinationevents/${config.id}`);

    downloadExam$ = (id: number) =>
        this.http
            .get<Exam>(`/app/exams/${id}`)
            .pipe(map((exam) => ({ ...exam, hasEnrolmentsInEffect: this.hasEffectiveEnrolments(exam) })));

    private hasEffectiveEnrolments = (exam: Exam) =>
        exam.examEnrolments.some((ee) => ee.reservation && parseISO(ee.reservation.endAt) > new Date());

    private isInteger = (n: number) => isFinite(n) && Math.floor(n) === n;
}
