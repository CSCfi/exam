// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { parseISO } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QuestionScoringService } from 'src/app/question/question-scoring.service';
import { SessionService } from 'src/app/session/session.service';
import { ConfirmationDialogService } from 'src/app/shared/dialogs/confirmation-dialog.service';
import { CommonExamService } from 'src/app/shared/miscellaneous/common-exam.service';
import type {
    Exam,
    ExamExecutionType,
    ExaminationEventConfiguration,
    ExamSection,
    ExamType,
    GradeScale,
    Implementation,
} from './exam.model';

type ExaminationEventConfigurationInput = {
    id?: number;
    config: {
        examinationEvent: {
            start: string;
            description: string;
            capacity: number;
        };
        quitPassword?: string;
        settingsPassword?: string;
    };
};

type SectionContainer = { examSections: ExamSection[] };

@Injectable({ providedIn: 'root' })
export class ExamService {
    constructor(
        private router: Router,
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private CommonExam: CommonExamService,
        private QuestionScore: QuestionScoringService,
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
                    this.toast.info(this.translate.instant('i18n_exam_added'));
                    this.router.navigate(['/staff/exams', response.id, 'course']);
                },
                error: (err) => this.toast.error(err),
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
            periodStart: exam.periodStart ? new Date(exam.periodStart).getTime() : undefined,
            periodEnd: exam.periodEnd ? new Date(exam.periodEnd).setHours(23, 59, 59, 999) : undefined,
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
                return 'i18n_public_exam';
            case 'PRIVATE':
                return 'i18n_private_exam';
            case 'MATURITY':
                return 'i18n_maturity';
            case 'PRINTOUT':
                return 'i18n_printout_exam';
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

    hasQuestions = (exam: SectionContainer) => exam.examSections.reduce((a, b) => a + b.sectionQuestions.length, 0) > 0;

    hasEssayQuestions = (exam: SectionContainer) =>
        exam.examSections.filter((es) => es.sectionQuestions.some((sq) => sq.question.type === 'EssayQuestion'))
            .length > 0;

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

    removeExam = (exam: Exam, collaborative = false, isAdmin = false) => {
        if (this.isAllowedToUnpublishOrRemove(exam, collaborative)) {
            this.ConfirmationDialog.open$(
                this.translate.instant('i18n_confirm'),
                this.translate.instant('i18n_remove_exam'),
            ).subscribe({
                next: () =>
                    this.http.delete(this.getResource(`/app/exams/${exam.id}`, collaborative)).subscribe({
                        next: () => {
                            this.toast.success(this.translate.instant('i18n_exam_removed'));
                            this.router.navigate(['/staff', isAdmin ? 'admin' : 'teacher']);
                        },
                        error: (err) => this.toast.error(err),
                    }),
                error: (err) => this.toast.error(err),
            });
        } else {
            this.toast.warning(this.translate.instant('i18n_exam_removal_not_possible'));
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
        if (collaborative) {
            this.router.navigate(['/staff/exams', exam.id, 'preview', 'collaborative'], {
                queryParams: { tab: fromTab },
            });
        } else if (exam.executionType.type === 'PRINTOUT') {
            this.router.navigate(['/staff/exams', exam.id, 'printout'], { queryParams: { tab: fromTab } });
        } else {
            this.router.navigate(['/staff/exams', exam.id, 'preview'], { queryParams: { tab: fromTab } });
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

    removeExaminationEvent$ = (examId: number, config: ExaminationEventConfiguration) =>
        this.http.delete<void>(`/app/exam/${examId}/examinationevents/${config.id}`);

    downloadExam$ = (id: number) =>
        this.http
            .get<Exam>(`/app/exams/${id}`)
            .pipe(map((exam) => ({ ...exam, hasEnrolmentsInEffect: this.hasEffectiveEnrolments(exam) })));

    getMaxScore = (exam: SectionContainer) => exam.examSections.reduce((n, es) => n + this.getSectionMaxScore(es), 0);

    getTotalScore = (exam: SectionContainer): number => {
        const score = exam.examSections.reduce((n, es) => n + this.getSectionTotalNumericScore(es), 0).toFixed(2);
        // total score cannot be negative as for now
        return Math.max(0, parseFloat(score) > 0 ? parseFloat(score) : 0);
    };

    getSectionTotalNumericScore = (section: ExamSection): number => {
        const score = section.sectionQuestions.reduce((n, sq) => {
            const points = this.QuestionScore.calculateAnswerScore(sq);
            // handle only numeric scores (leave out approved/rejected type of scores)
            return n + (points.rejected === false && points.approved === false ? points.score : 0);
        }, 0);
        return Number.isInteger(score) ? score : parseFloat(score.toFixed(2));
    };

    getSectionTotalScore = (section: ExamSection): number => {
        const score = section.sectionQuestions.reduce((n, sq) => {
            const points = this.QuestionScore.calculateAnswerScore(sq);
            return n + points.score;
        }, 0);
        return Number.isInteger(score) ? score : parseFloat(score.toFixed(2));
    };

    getSectionMaxScore = (section: ExamSection): number => {
        let maxScore = section.sectionQuestions.reduce((n, sq) => {
            if (!sq || !sq.question) {
                return n;
            }
            return n + this.QuestionScore.calculateMaxScore(sq);
        }, 0);
        if (section.lotteryOn) {
            maxScore = (maxScore * section.lotteryItemCount) / Math.max(1, section.sectionQuestions.length);
        }
        return Number.isInteger(maxScore) ? maxScore : parseFloat(maxScore.toFixed(2));
    };

    private hasEffectiveEnrolments = (exam: Exam) =>
        exam.examEnrolments.some((ee) => ee.reservation && parseISO(ee.reservation.endAt) > new Date());
}
