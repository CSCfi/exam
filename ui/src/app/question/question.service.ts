// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SessionService } from 'src/app/session/session.service';
import { Attachment } from 'src/app/shared/attachment/attachment.model';
import { AttachmentService } from 'src/app/shared/attachment/attachment.service';
import { FileService } from 'src/app/shared/file/file.service';
import {
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    Question,
    QuestionDraft,
    ReverseQuestion,
} from './question.model';

@Injectable({ providedIn: 'root' })
export class QuestionService {
    private http = inject(HttpClient);
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private Session = inject(SessionService);
    private Files = inject(FileService);
    private Attachment = inject(AttachmentService);

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
            defaultNegativeScoreAllowed: false,
            defaultOptionShufflingOn: true,
        };
    }

    getQuestion = (id: number): Observable<ReverseQuestion> => this.http.get<ReverseQuestion>(this.questionsApi(id));

    createQuestion = (question: QuestionDraft): Promise<Question> => {
        const body = this.getQuestionData(question);
        // TODO: make this a pipe
        return new Promise<Question>((resolve, reject) => {
            this.http.post<Question>(this.questionsApi(), body).subscribe({
                next: (response) => {
                    this.toast.info(this.translate.instant('i18n_question_added'));
                    if (question.attachment && question.attachment.file && question.attachment.modified) {
                        this.Files.upload<Attachment>('/app/attachment/question', question.attachment.file, {
                            questionId: response.id.toString(),
                        }).then((resp) => {
                            question.attachment = resp;
                            resolve(response);
                        });
                    } else {
                        resolve(response);
                    }
                },
                error: reject,
            });
        });
    };

    updateQuestion = (question: Question): Promise<Question> => {
        const body = this.getQuestionData(question);
        return new Promise<Question>((resolve) => {
            this.http.put<Question>(this.questionsApi(question.id), body).subscribe((response) => {
                this.toast.info(this.translate.instant('i18n_question_saved'));
                if (question.attachment && question.attachment.file && question.attachment.modified) {
                    this.Files.upload<Attachment>('/app/attachment/question', question.attachment.file, {
                        questionId: question.id.toString(),
                    }).then((resp) => {
                        question.attachment = resp;
                        resolve(response);
                    });
                } else if (question.attachment && question.attachment.removed) {
                    this.Attachment.eraseQuestionAttachment(question).then(function () {
                        resolve(response);
                    });
                } else {
                    resolve(response);
                }
            });
        });
    };

    updateDistributedExamQuestion$ = (
        question: Question,
        sectionQuestion: ExamSectionQuestion,
        examId: number,
        sectionId: number,
    ) => {
        const data: Partial<ExamSectionQuestion> = {
            id: sectionQuestion.id,
            maxScore: sectionQuestion.maxScore,
            answerInstructions: sectionQuestion.answerInstructions,
            evaluationCriteria: sectionQuestion.evaluationCriteria,
            negativeScoreAllowed: sectionQuestion.negativeScoreAllowed,
            optionShufflingOn: sectionQuestion.optionShufflingOn,
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
                    if (question.attachment && question.attachment.modified && question.attachment.file) {
                        this.Files.upload<Attachment>('/app/attachment/question', question.attachment.file, {
                            questionId: question.id.toString(),
                        }).then((resp) => {
                            question.attachment = resp;
                            response.question.attachment = question.attachment;
                        });
                    } else if (question.attachment && question.attachment.removed) {
                        this.Attachment.eraseQuestionAttachment(question).then(() => {
                            delete response.question.attachment;
                        });
                    }
                    return response;
                }),
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

    addOwnerForQuestions$ = (uid: number, qids: number[]): Observable<void> => {
        const data = {
            uid: uid,
            questionIds: qids.join(),
        };
        return this.http.post<void>(this.questionOwnerApi(uid), data);
    };

    getQuestionDistribution$ = (qid: number): Observable<boolean> => {
        return this.http.get<boolean>(`/app/exams/question/${qid}/distribution`);
    };

    updateQuestion = (resource: string, question: Question) =>
        this.http.put<ExamSectionQuestion>(resource, {
            question: question,
        });

    private questionsApi = (id?: number) => (!id ? '/app/questions' : `/app/questions/${id}`);
    private questionOwnerApi = (id?: number) => (!id ? '/app/questions/owner' : `/app/questions/owner/${id}`);

    private getQuestionData(question: Partial<Question>): Partial<Question> {
        const questionToUpdate: Partial<Question> = {
            type: question.type,
            defaultMaxScore: question.defaultMaxScore,
            question: question.question,
            shared: question.shared,
            defaultAnswerInstructions: question.defaultAnswerInstructions,
            defaultEvaluationCriteria: question.defaultEvaluationCriteria,
            defaultNegativeScoreAllowed: question.defaultNegativeScoreAllowed,
            defaultOptionShufflingOn: question.defaultOptionShufflingOn,
            questionOwners: question.questionOwners,
            tags: question.tags,
            options: question.options,
        };
        if (question.id) {
            questionToUpdate.id = question.id;
        }

        // update question specific attributes
        switch (questionToUpdate.type) {
            case 'EssayQuestion':
                questionToUpdate.defaultExpectedWordCount = question.defaultExpectedWordCount;
                questionToUpdate.defaultEvaluationType = question.defaultEvaluationType;
                break;
            case 'MultipleChoiceQuestion':
            case 'WeightedMultipleChoiceQuestion':
                questionToUpdate.options = question.options;
                break;
        }
        return questionToUpdate;
    }
}
