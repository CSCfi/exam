// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { SessionService } from 'src/app/session/session.service';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';
import { FileService } from 'src/app/shared/file/file.service';
import {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    Question,
    QuestionDraft,
} from './question.model';

@Injectable({ providedIn: 'root' })
export class QuestionService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private toast: ToastrService,
        private Session: SessionService,
        private Files: FileService,
        private Attachment: AttachmentService,
        private errorHandler: ErrorHandlingService,
    ) {}

    getQuestionType = (type: string) => {
        let questionType;
        switch (type) {
            case 'essay':
                questionType = 'EssayQuestion';
                break;
            case 'multichoice':
                questionType = 'MultipleChoiceQuestion';
                break;
            case 'weighted':
                questionType = 'WeightedMultipleChoiceQuestion';
                break;
            case 'cloze':
                questionType = 'ClozeTestQuestion';
                break;
            case 'claim':
                questionType = 'ClaimChoiceQuestion';
                break;
            default:
                throw Error('question type not found!');
        }
        return questionType;
    };

    getQuestionDraft(): QuestionDraft {
        return {
            id: undefined,
            question: '',
            type: '',
            examSectionQuestions: [],
            options: [],
            questionOwners: [this.Session.getUser()],
            state: 'NEW',
            tags: [],
        };
    }

    getQuestion$ = (id: number): Observable<Question> =>
        this.http
            .get<Question>(this.questionsApi(id))
            .pipe(catchError((error) => this.errorHandler.handle(error, 'QuestionService.getQuestion$')));

    getQuestionDraft$ = (id: number): Observable<Question> =>
        this.http
            .get<Question>(`/app/questions/${id}/draft`)
            .pipe(catchError((error) => this.errorHandler.handle(error, 'QuestionService.getQuestionDraft$')));

    createQuestion$ = (question: QuestionDraft): Observable<Question> => {
        const body = this.getQuestionData(question);
        return this.http.post<Question>(this.questionsApi(), body).pipe(
            tap(() => this.toast.info(this.translate.instant('i18n_question_added'))),
            switchMap((response) => {
                if (question.attachment?.file && question.attachment.modified) {
                    return this.Files.upload$(
                        '/app/attachment/question',
                        question.attachment.file,
                        { questionId: response.id.toString() },
                        { attachment: question.attachment },
                    ).pipe(map(() => response));
                }
                return of(response);
            }),
            catchError((error) => this.errorHandler.handle(error, 'QuestionService.createQuestion$')),
        );
    };

    updateQuestion$ = (question: Question): Observable<Question> => {
        const body = this.getQuestionData(question);
        return this.http.put<Question>(this.questionsApi(question.id), body).pipe(
            tap(() => this.toast.info(this.translate.instant('i18n_question_saved'))),
            switchMap((response) => {
                if (question.attachment?.file && question.attachment.modified) {
                    return this.Files.upload$(
                        '/app/attachment/question',
                        question.attachment.file,
                        { questionId: question.id.toString() },
                        { attachment: question.attachment },
                    ).pipe(map(() => response));
                }
                if (question.attachment?.removed) {
                    return from(this.Attachment.eraseQuestionAttachment$(question)).pipe(map(() => response));
                }
                return of(response);
            }),
            catchError((error) => this.errorHandler.handle(error, 'QuestionService.updateQuestion$')),
        );
    };

    deleteQuestion$ = (id: number) =>
        this.http
            .delete<void>(`/app/questions/${id}`)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'QuestionService.deleteQuestion$')));

    addOwnerForQuestions$ = (uid: number, qids: number[]): Observable<void> => {
        const data = {
            uid: uid,
            questionIds: qids.join(),
        };
        return this.http
            .post<void>(this.questionOwnerApi(uid), data)
            .pipe(catchError((error) => this.errorHandler.handle(error, 'QuestionService.addOwnerForQuestions$')));
    };

    removeOwnerForQuestions$ = (questionIds: number[], ownerId: number) =>
        this.http
            .delete<void>(`/app/questions/owners/${ownerId}`, { body: questionIds })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'QuestionService.removeOwnerForQuestions$')));

    addTagForQuestions$ = (questionIds: number[], tagId: number) =>
        this.http
            .post<void>(`/app/questions/tags/${tagId}`, questionIds)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'QuestionService.addTagForQuestions$')));

    removeTagForQuestions$ = (questionIds: number[], tagId: number) =>
        this.http
            .delete<void>(`/app/questions/tags/${tagId}`, { body: questionIds })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'QuestionService.removeTagForQuestions$')));

    updateDistributedExamQuestion$ = (
        question: Question,
        sectionQuestion: ExamSectionQuestion,
        examId: number,
        sectionId: number,
    ): Observable<ExamSectionQuestion> => {
        const data: Partial<ExamSectionQuestion> = {
            id: sectionQuestion.id,
            maxScore: sectionQuestion.maxScore,
            answerInstructions: sectionQuestion.answerInstructions,
            evaluationCriteria: sectionQuestion.evaluationCriteria,
            options: sectionQuestion.options,
            question: question,
        };

        // update question specific attributes
        switch (question.type) {
            case 'EssayQuestion':
                data.expectedWordCount = sectionQuestion.expectedWordCount;
                data.evaluationType = sectionQuestion.evaluationType;
                break;
        }

        return this.http
            .put<ExamSectionQuestion>(
                `/app/exams/${examId}/sections/${sectionId}/questions/${sectionQuestion.id}/distributed`,
                data,
            )
            .pipe(
                map((response) => {
                    Object.assign(response.question, question);
                    return response;
                }),
                switchMap((response) => {
                    if (question.attachment?.modified && question.attachment.file) {
                        return this.Files.upload$(
                            '/app/attachment/question',
                            question.attachment.file,
                            { questionId: question.id.toString() },
                            { attachment: question.attachment },
                        ).pipe(
                            tap(() => {
                                response.question.attachment = question.attachment;
                            }),
                            map(() => response),
                        );
                    }
                    if (question.attachment?.removed) {
                        return from(this.Attachment.eraseQuestionAttachment$(question)).pipe(
                            tap(() => {
                                delete response.question.attachment;
                            }),
                            map(() => response),
                        );
                    }
                    return of(response);
                }),
                catchError((error) =>
                    this.errorHandler.handle(error, 'QuestionService.updateDistributedExamQuestion$'),
                ),
            );
    };

    toggleCorrectOption = (option: MultipleChoiceOption, options: MultipleChoiceOption[]) => {
        option.correctOption = true;
        options.forEach((o) => (o.correctOption = o === option));
    };

    getInvalidClaimOptionTypes = (options: MultipleChoiceOption[]) => {
        const invalidOptions: string[] = [];

        const hasCorrectOption = options.some(
            (opt) => opt.claimChoiceType === 'CorrectOption' && opt.defaultScore > 0 && opt.option,
        );
        const hasIncorrectOption = options.some(
            (opt) => opt.claimChoiceType === 'IncorrectOption' && opt.defaultScore <= 0 && opt.option,
        );
        const hasSkipOption = options.some(
            (opt) => opt.claimChoiceType === 'SkipOption' && opt.defaultScore === 0 && opt.option,
        );

        if (!hasCorrectOption) {
            invalidOptions.push('CorrectOption');
        }

        if (!hasIncorrectOption) {
            invalidOptions.push('IncorrectOption');
        }

        if (!hasSkipOption) {
            invalidOptions.push('SkipOption');
        }

        return invalidOptions;
    };

    getOptionTypeTranslation = (type: string) => {
        switch (type) {
            case 'CorrectOption':
                return 'i18n_question_claim_correct';
            case 'IncorrectOption':
                return 'i18n_question_claim_incorrect';
            case 'SkipOption':
                return 'i18n_question_claim_skip';
            default:
                return '';
        }
    };

    determineClaimChoiceOptionClass = (optionType: string): string => {
        switch (optionType) {
            case 'CorrectOption':
                return 'claim-choice-correct-answer';
            case 'IncorrectOption':
                return 'claim-choice-incorrect-answer';
            case 'SkipOption':
                return 'claim-choice-skip-answer';
            default:
                return '';
        }
    };

    determineOptionDescriptionTranslation = (optionType: string): string => {
        switch (optionType) {
            case 'CorrectOption':
                return this.translate.instant('i18n_claim_choice_correct_option_description');
            case 'IncorrectOption':
                return this.translate.instant('i18n_claim_choice_incorrect_option_description');
            default:
                return '';
        }
    };

    determineClaimOptionTypeForExamQuestionOption = (examOption: ExamSectionQuestionOption) => {
        const parentOption = examOption.option;
        if (parentOption.claimChoiceType === 'SkipOption') {
            return 'SkipOption';
        }

        if (examOption.score <= 0) {
            return 'IncorrectOption';
        }

        if (examOption.score > 0) {
            return 'CorrectOption';
        }

        return '';
    };

    getInvalidDistributedClaimOptionTypes = (options: ExamSectionQuestionOption[]) => {
        const invalidOptions = [];

        const hasCorrectOption = options.some((opt) => {
            const claimChoiceType = this.determineClaimOptionTypeForExamQuestionOption(opt);
            const parentOption = opt.option;
            return claimChoiceType === 'CorrectOption' && opt.score > 0 && parentOption.option;
        });
        const hasIncorrectOption = options.some((opt) => {
            const claimChoiceType = this.determineClaimOptionTypeForExamQuestionOption(opt);
            const parentOption = opt.option;
            return claimChoiceType === 'IncorrectOption' && opt.score <= 0 && parentOption.option;
        });
        const hasSkipOption = options.some((opt) => {
            const claimChoiceType = this.determineClaimOptionTypeForExamQuestionOption(opt);
            const parentOption = opt.option;
            return claimChoiceType === 'SkipOption' && opt.score === 0 && parentOption.option;
        });

        if (!hasCorrectOption) {
            invalidOptions.push('CorrectOption');
        }

        if (!hasIncorrectOption) {
            invalidOptions.push('IncorrectOption');
        }

        if (!hasSkipOption) {
            invalidOptions.push('SkipOption');
        }

        return invalidOptions;
    };

    private questionsApi = (id?: number) => (!id ? '/app/questions' : `/app/questions/${id}`);
    private questionOwnerApi = (uid: number) => `/app/questions/owners/${uid}`;

    private getQuestionData = (question: Question | QuestionDraft) => ({
        ...question,
        attachment: question.attachment?.file
            ? {
                  ...question.attachment,
                  file: undefined,
              }
            : question.attachment,
    });
}
