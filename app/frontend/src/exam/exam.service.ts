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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as toast from 'toastr';

import { ReviewedExam } from '../enrolment/enrolment.model';
import { QuestionService } from '../question/question.service';
import { SessionService } from '../session/session.service';
import { ConfirmationDialogService } from '../utility/dialogs/confirmationDialog.service';
import { Exam, ExamExecutionType, ExaminationEventConfiguration, ExamSection, GradeScale } from './exam.model';

type SectionContainer = { examSections: ExamSection[] };

@Injectable()
export class ExamService {
    constructor(
        private translate: TranslateService,
        private State: StateService,
        private http: HttpClient,
        private Question: QuestionService,
        private Session: SessionService,
        private ConfirmationDialog: ConfirmationDialogService,
    ) {}

    getReviewablesCount = (exam: Exam) =>
        exam.children.filter(child => child.state === 'REVIEW' || child.state === 'REVIEW_STARTED').length;

    getGradedCount = (exam: Exam) => exam.children.filter(child => child.state === 'GRADED').length;

    getProcessedCount = (exam: Exam) =>
        exam.children.filter(child => ['REVIEW', 'REVIEW_STARTED', 'GRADED'].indexOf(child.state) === -1).length;

    createExam = (executionType: string) => {
        this.http
            .post<Exam>('/app/exams', { executionType: executionType })
            .subscribe(
                response => {
                    toast.info(this.translate.instant('sitnet_exam_added'));
                    this.State.go('courseSelector', { id: response.id });
                },
                err => toast.error(err.data),
            );
    };

    updateExam$ = (exam: Exam, overrides: any = {}, collaborative = false): Observable<Exam> => {
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
            requiresUserAgentAuth: exam.requiresUserAgentAuth,
        };
        Object.assign(data, overrides);
        const url = collaborative ? '/integration/iop/exams' : '/app/exams';
        return this.http.put<Exam>(`${url}/${exam.id}`, data);
    };

    getExamTypeDisplayName = (type: string) => {
        let name = '';
        switch (type) {
            case 'PARTIAL':
                name = 'sitnet_exam_credit_type_partial';
                break;
            case 'FINAL':
                name = 'sitnet_exam_credit_type_final';
                break;
            default:
                break;
        }
        return this.translate.instant(name);
    };

    getExamGradeDisplayName = (grade: string): string => {
        let name;
        switch (grade) {
            case 'NONE':
                name = this.translate.instant('sitnet_no_grading');
                break;
            case 'I':
                name = 'Improbatur';
                break;
            case 'A':
                name = 'Approbatur';
                break;
            case 'B':
                name = 'Lubenter approbatur';
                break;
            case 'N':
                name = 'Non sine laude approbatur';
                break;
            case 'C':
                name = 'Cum laude approbatur';
                break;
            case 'M':
                name = 'Magna cum laude approbtur';
                break;
            case 'E':
                name = 'Eximia cum laude approbatur';
                break;
            case 'L':
                name = 'Laudatur approbatur';
                break;
            case 'REJECTED':
                name = this.translate.instant('sitnet_rejected');
                break;
            case 'APPROVED':
                name = this.translate.instant('sitnet_approved');
                break;
            default:
                name = grade;
                break;
        }
        return name;
    };

    refreshExamTypes = (): Observable<ExamExecutionType[]> =>
        this.http.get<ExamExecutionType[]>('/app/examtypes').pipe(
            map(resp =>
                resp.map(et =>
                    Object.assign(et, {
                        name: this.getExamTypeDisplayName(et.type),
                    }),
                ),
            ),
        );

    getScaleDisplayName = (gs: GradeScale | null): string => {
        if (!gs) {
            return '';
        }
        let name = '';
        const description = gs.description;
        switch (description) {
            case 'ZERO_TO_FIVE':
                name = '0-5';
                break;
            case 'LATIN':
                name = 'Improbatur-Laudatur';
                break;
            case 'APPROVED_REJECTED':
                name = this.translate.instant('sitnet_evaluation_select');
                break;
            case 'OTHER':
                name = gs.displayName;
        }
        return name;
    };

    refreshGradeScales = (isCollaborative: boolean): Observable<GradeScale[]> => {
        const url = isCollaborative ? '/integration/iop/gradescales' : '/app/gradescales';
        return this.http.get<GradeScale[]>(url).pipe(
            map(resp =>
                resp.map(gs =>
                    Object.assign(gs, {
                        name: this.getScaleDisplayName(gs),
                    }),
                ),
            ),
        );
    };

    getCredit = (exam: Exam | ReviewedExam) => {
        if (this.hasCustomCredit(exam)) {
            return exam.customCredit;
        } else {
            return exam.course && exam.course.credits ? exam.course.credits : 0;
        }
    };

    hasCustomCredit = (exam: Exam | ReviewedExam) => !isNaN(exam.customCredit) && exam.customCredit >= 0;

    getExamDisplayCredit = (exam: Exam) => {
        const courseCredit = exam.course ? exam.course.credits : 0;
        return this.hasCustomCredit(exam) ? exam.customCredit : courseCredit;
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

    listExecutionTypes = (): Observable<ExamExecutionType[]> =>
        this.http.get<ExamExecutionType[]>('/app/executiontypes').pipe(
            map(resp =>
                resp.map(et =>
                    Object.assign(et, {
                        name: this.getExecutionTypeTranslation(et),
                    }),
                ),
            ),
        );

    getSectionTotalScore = (section: ExamSection) =>
        section.sectionQuestions.reduce((n, sq) => {
            let score = 0;
            switch (sq.question.type) {
                case 'MultipleChoiceQuestion':
                    score = this.Question.scoreMultipleChoiceAnswer(sq, false);
                    break;
                case 'WeightedMultipleChoiceQuestion':
                    score = this.Question.scoreWeightedMultipleChoiceAnswer(sq, false);
                    break;
                case 'ClozeTestQuestion':
                    score = this.Question.scoreClozeTestAnswer(sq);
                    break;
                case 'EssayQuestion':
                    if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Points') {
                        score = sq.essayAnswer.evaluatedScore;
                    }
                    break;
                case 'ClaimChoiceQuestion':
                    score += this.Question.scoreClaimChoiceAnswer(sq, false);
                    break;
            }
            return n + score;
        }, 0);

    getSectionMaxScore = (section: ExamSection) => {
        let maxScore = section.sectionQuestions.reduce((n, sq) => {
            let score = 0;
            if (!sq || !sq.question) {
                return n;
            }
            switch (sq.question.type) {
                case 'MultipleChoiceQuestion':
                case 'ClozeTestQuestion':
                    score = sq.maxScore;
                    break;
                case 'WeightedMultipleChoiceQuestion':
                    score = this.Question.calculateMaxPoints(sq);
                    break;
                case 'EssayQuestion':
                    if (sq.evaluationType === 'Points') {
                        score = sq.maxScore;
                    }
                    break;
                case 'ClaimChoiceQuestion':
                    score += this.Question.getCorrectClaimChoiceOptionScore(sq);
                    break;
            }
            return n + score;
        }, 0);
        if (section.lotteryOn) {
            maxScore = (maxScore * section.lotteryItemCount) / Math.max(1, section.sectionQuestions.length);
        }

        const isInteger = (n: number) => typeof n === 'number' && isFinite(n) && Math.floor(n) === n;

        return isInteger(maxScore) ? maxScore : parseFloat(maxScore.toFixed(2));
    };

    hasQuestions = (exam: SectionContainer) => exam.examSections.reduce((a, b) => a + b.sectionQuestions.length, 0) > 0;

    hasEssayQuestions = (exam: SectionContainer) =>
        exam.examSections.filter(es => es.sectionQuestions.some(sq => sq.question.type === 'EssayQuestion')).length > 0;

    getMaxScore = (exam: SectionContainer) => exam.examSections.reduce((n, es) => n + this.getSectionMaxScore(es), 0);

    getTotalScore = (exam: SectionContainer): string => {
        const score = exam.examSections.reduce((n, es) => n + this.getSectionTotalScore(es), 0).toFixed(2);
        return parseFloat(score) > 0 ? score : '0';
    };

    isOwner = (exam: Exam, collaborative = false) => {
        const user = this.Session.getUser();
        const examToCheck: Exam = exam && exam.parent ? exam.parent : exam;
        return (
            examToCheck &&
            examToCheck.examOwners.filter(
                o => o.id === user.id || (collaborative && (o.eppn === user.eppn || o.email === user.email)),
            ).length > 0
        );
    };

    isOwnerOrAdmin = (exam: Exam, collaborative = false) => {
        const user = this.Session.getUser();
        return exam && user && (user.isAdmin || this.isOwner(exam, collaborative));
    };

    removeExam = (exam: Exam, collaborative = false) => {
        if (this.isAllowedToUnpublishOrRemove(exam, collaborative)) {
            const dialog = this.ConfirmationDialog.open(
                this.translate.instant('sitnet_confirm'),
                this.translate.instant('sitnet_remove_exam'),
            );
            dialog.result.then(() =>
                this.http.delete(this.getResource(`/app/exams/${exam.id}`, collaborative)).subscribe(
                    () => {
                        toast.success(this.translate.instant('sitnet_exam_removed'));
                        this.State.go('dashboard');
                    },
                    err => toast.error(err),
                ),
            );
        } else {
            toast.warning(this.translate.instant('sitnet_exam_removal_not_possible'));
        }
    };

    getResource = (url: string, collaborative = false) =>
        collaborative ? url.replace('/app/exams/', '/integration/iop/exams/') : url;

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
            this.State.go('collaborativePreview', params);
        } else if (exam.executionType.type === 'PRINTOUT') {
            this.State.go('printout', params);
        } else {
            this.State.go('collaborativeExamEditor', params);
        }
    };

    reorderSections = (from: number, to: number, exam: Exam, collaborative: boolean): Observable<any> =>
        this.http.put(this.getResource(`/app/exams/${exam.id}/reorder`, collaborative), { from: from, to: to });

    addSection = (exam: Exam, collaborative: boolean): Observable<ExamSection> =>
        this.http.post<ExamSection>(this.getResource(`/app/exams/${exam.id}/sections`, collaborative), {});

    removeSection = (exam: Exam, section: ExamSection): Observable<any> =>
        this.http.delete(this.getResource(`/app/exams/${exam.id}/sections/${section.id}`));

    addExaminationEvent = (
        examId: number,
        config: ExaminationEventConfiguration,
    ): Observable<ExaminationEventConfiguration> =>
        this.http.post<ExaminationEventConfiguration>(`/app/exam/${examId}/examinationevents`, config);

    updateExaminationEvent = (
        examId: number,
        config: ExaminationEventConfiguration,
    ): Observable<ExaminationEventConfiguration> =>
        this.http.put<ExaminationEventConfiguration>(`/app/exam/${examId}/examinationevents/${config.id}`, config);

    removeExaminationEvent = (examId: number, config: ExaminationEventConfiguration) =>
        this.http.delete<void>(`/app/exam/${examId}/examinationevents/${config.id}`);
}
