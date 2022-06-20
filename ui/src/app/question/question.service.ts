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
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
    Exam,
    ExamSection,
    ExamSectionQuestion,
    ExamSectionQuestionOption,
    MultipleChoiceOption,
    Question,
    ReverseQuestion,
} from '../exam/exam.model';
import { SessionService } from '../session/session.service';
import { AttachmentService } from '../shared/attachment/attachment.service';
import { FileService } from '../shared/file/file.service';
import { isNumber } from '../shared/miscellaneous/helpers';
import { BaseQuestionEditorComponent } from './examquestion/base-question-editor.component';

export type QuestionDraft = Omit<ReverseQuestion, 'id'> & { id: undefined };
export type QuestionAmounts = {
    accepted: number;
    rejected: number;
    hasEssays: boolean;
};

@Injectable({ providedIn: 'root' })
export class QuestionService {
    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private modal: NgbModal,
        private toast: ToastrService,
        private Session: SessionService,
        private Files: FileService,
        private Attachment: AttachmentService,
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

    getQuestion = (id: number): Observable<ReverseQuestion> => this.http.get<ReverseQuestion>(this.questionsApi(id));

    getQuestionAmounts = (exam: Exam): QuestionAmounts => {
        const data = { accepted: 0, rejected: 0, hasEssays: false };
        exam.examSections.forEach((section) => {
            section.sectionQuestions.forEach((sectionQuestion) => {
                const question = sectionQuestion.question;
                if (question.type === 'EssayQuestion') {
                    if (sectionQuestion.evaluationType === 'Selection' && sectionQuestion.essayAnswer) {
                        if (sectionQuestion.essayAnswer.evaluatedScore === 1) {
                            data.accepted++;
                        } else if (sectionQuestion.essayAnswer.evaluatedScore === 0) {
                            data.rejected++;
                        }
                    }
                    data.hasEssays = true;
                }
            });
        });
        return data;
    };

    getQuestionAmountsBySection = (section: ExamSection) => {
        const scores = section.sectionQuestions
            .filter((sq) => sq.question.type === 'EssayQuestion' && sq.evaluationType === 'Selection' && sq.essayAnswer)
            .map((sq) => sq.essayAnswer?.evaluatedScore);
        return { accepted: scores.filter((s) => s === 1).length, rejected: scores.filter((s) => s === 0).length };
    };

    calculateDefaultMaxPoints = (question: Question) =>
        question.options.filter((o) => o.defaultScore > 0).reduce((a, b) => a + b.defaultScore, 0);

    calculateWeightedMaxPoints = (sectionQuestion: ExamSectionQuestion): number => {
        const points = sectionQuestion.options.filter((o) => o.score > 0).reduce((a, b) => a + b.score, 0);
        return parseFloat(points.toFixed(2));
    };

    calculateMaxScore = (question: ExamSectionQuestion) => {
        const evaluationType = question.evaluationType;
        const type = question.question.type;
        if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
            return question.maxScore;
        }
        if (type === 'WeightedMultipleChoiceQuestion') {
            return this.calculateWeightedMaxPoints(question);
        }
        if (type === 'ClaimChoiceQuestion') {
            return this.getCorrectClaimChoiceOptionScore(question);
        }
        return 0;
    };

    getMinimumOptionScore = (sectionQuestion: ExamSectionQuestion): number => {
        const optionScores = sectionQuestion.options.map((o) => o.score);
        const scores = [0, ...optionScores]; // Make sure 0 is included
        return sectionQuestion.question.type === 'WeightedMultipleChoiceQuestion'
            ? Math.max(0, Math.min(...scores)) // Weighted mcq mustn't have a negative min score
            : Math.min(...scores);
    };

    getCorrectClaimChoiceOptionDefaultScore = (question: Question): number => {
        if (!question.options) {
            return 0;
        }
        const correctOption = question.options.filter((o) => o.correctOption && o.claimChoiceType === 'CorrectOption');
        return correctOption.length === 1 ? correctOption[0].defaultScore : 0;
    };

    getCorrectClaimChoiceOptionScore = (sectionQuestion: ExamSectionQuestion): number => {
        if (!sectionQuestion.options) {
            return 0;
        }
        const optionScores = sectionQuestion.options.map((o) => o.score);
        return Math.max(0, ...optionScores);
    };

    scoreClozeTestAnswer = (sectionQuestion: ExamSectionQuestion): number => {
        if (!sectionQuestion.clozeTestAnswer) {
            return 0;
        }
        if (isNumber(sectionQuestion.forcedScore)) {
            return sectionQuestion.forcedScore;
        }
        const score = sectionQuestion.clozeTestAnswer.score;
        if (!score) return 0;
        const proportion =
            (score.correctAnswers * sectionQuestion.maxScore) / (score.correctAnswers + score.incorrectAnswers);
        return parseFloat(proportion.toFixed(2));
    };

    scoreWeightedMultipleChoiceAnswer = (sectionQuestion: ExamSectionQuestion, ignoreForcedScore: boolean): number => {
        if (isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const score = sectionQuestion.options.filter((o) => o.answered).reduce((a, b) => a + b.score, 0);
        return Math.max(0, score);
    };

    // For non-weighted mcq
    scoreMultipleChoiceAnswer = (sectionQuestion: ExamSectionQuestion, ignoreForcedScore: boolean): number => {
        if (isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const answered = sectionQuestion.options.filter((o) => o.answered);
        if (answered.length === 0) {
            // No answer
            return 0;
        }
        if (answered.length !== 1) {
            console.error('multiple options selected for a MultiChoice answer!');
        }

        return answered[0].option.correctOption ? sectionQuestion.maxScore : 0;
    };

    scoreClaimChoiceAnswer = (sectionQuestion: ExamSectionQuestion, ignoreForcedScore: boolean): number => {
        if (isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const selected = sectionQuestion.options.filter((o) => o.answered);

        // Use the score from the skip option if no option was chosen
        const skipOption = sectionQuestion.options.filter((o) => o.option.claimChoiceType === 'SkipOption');
        const skipScore = skipOption.length === 1 ? skipOption[0].score : 0;

        if (selected.length === 0) {
            return skipScore;
        }
        if (selected.length !== 1) {
            console.error('multiple options selected for a ClaimChoice answer!');
        }
        if (selected[0].score && isNumber(selected[0].score)) {
            return selected[0].score;
        }
        return 0;
    };

    calculateAnswerScore = (sq: ExamSectionQuestion) => {
        switch (sq.question.type) {
            case 'MultipleChoiceQuestion':
                return { score: this.scoreMultipleChoiceAnswer(sq, false), rejected: false, approved: false };
            case 'WeightedMultipleChoiceQuestion':
                return { score: this.scoreWeightedMultipleChoiceAnswer(sq, false), rejected: false, approved: false };
            case 'ClozeTestQuestion':
                return { score: this.scoreClozeTestAnswer(sq), rejected: false, approved: false };
            case 'EssayQuestion':
                if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Points') {
                    return { score: sq.essayAnswer.evaluatedScore, rejected: false, approved: false };
                } else if (sq.essayAnswer && sq.essayAnswer.evaluatedScore && sq.evaluationType === 'Selection') {
                    const score = sq.essayAnswer.evaluatedScore;
                    return { score: score, rejected: score === 0, approved: score === 1 };
                }
                return { score: 0, rejected: false, approved: false };
            case 'ClaimChoiceQuestion':
                return { score: this.scoreClaimChoiceAnswer(sq, false), rejected: false, approved: false };
            default:
                throw Error('unknown question type');
        }
    };

    createQuestion = (question: QuestionDraft): Promise<Question> => {
        const body = this.getQuestionData(question);
        // TODO: make this a pipe
        return new Promise<Question>((resolve, reject) => {
            this.http.post<Question>(this.questionsApi(), body).subscribe({
                next: (response) => {
                    this.toast.info(this.translate.instant('sitnet_question_added'));
                    if (question.attachment && question.attachment.file && question.attachment.modified) {
                        this.Files.upload(
                            '/app/attachment/question',
                            question.attachment.file,
                            { questionId: response.id.toString() },
                            question,
                            () => resolve(response),
                        );
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
                this.toast.info(this.translate.instant('sitnet_question_saved'));
                if (question.attachment && question.attachment.file && question.attachment.modified) {
                    this.Files.upload(
                        '/app/attachment/question',
                        question.attachment.file,
                        { questionId: question.id.toString() },
                        question,
                        () => resolve,
                    );
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
                        this.Files.upload(
                            '/app/attachment/question',
                            question.attachment.file,
                            { questionId: question.id.toString() },
                            question,
                            () => (response.question.attachment = question.attachment),
                        );
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
                return 'sitnet_question_claim_correct';
            case 'IncorrectOption':
                return 'sitnet_question_claim_incorrect';
            case 'SkipOption':
                return 'sitnet_question_claim_skip';
            default:
                return '';
        }
    };

    returnClaimChoiceOptionClass = (optionType: string): string => {
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

    returnOptionDescriptionTranslation = (optionType: string) => {
        switch (optionType) {
            case 'CorrectOption':
                return this.translate.instant('sitnet_claim_choice_correct_option_description');
            case 'IncorrectOption':
                return this.translate.instant('sitnet_claim_choice_incorrect_option_description');
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

        return null;
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

    openBaseQuestionEditor = (newQuestion: boolean, collaborative: boolean): Observable<Question> => {
        const modal = this.modal.open(BaseQuestionEditorComponent, {
            backdrop: 'static',
            keyboard: false,
            windowClass: 'question-editor-modal',
            size: 'xl',
        });
        modal.componentInstance.newQuestion = newQuestion;
        modal.componentInstance.collaborative = collaborative;
        return from(modal.result);
    };

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
