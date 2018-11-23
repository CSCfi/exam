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
import * as toast from 'toastr';
import { Exam, ExamSectionQuestion, MultipleChoiceOption, Question, ReverseQuestion } from '../exam/exam.model';
import { SessionService } from '../session/session.service';
import { AttachmentService } from '../utility/attachment/attachment.service';
import { FileService } from '../utility/file/file.service';
import { Observable } from 'rxjs';

@Injectable()
export class QuestionService {

    constructor(
        private http: HttpClient,
        private translate: TranslateService,
        private Session: SessionService,
        private Files: FileService,
        private Attachment: AttachmentService
    ) { }

    questionsApi = (id?: number) => !id ? '/app/questions' : `/app/questions/${id}`;
    questionOwnerApi = (id?: number) => !id ? '/app/questions/owner' : `/app/questions/owner/${id}`;
    essayScoreApi = (id) => `'/app/review/examquestion/${id}/score`;
    questionCopyApi = (id?: number) => !id ? '/app/question' : `/app/question/${id}`;

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
        }
        return questionType;
    }

    getQuestionDraft(): ReverseQuestion {
        return {
            question: '',
            type: '',
            examSectionQuestions: [],
            options: [],
            questionOwners: [this.Session.getUser()],
            state: 'NEW',
            tags: []
        };
    }

    getQuestion = (id: number): Observable<Question> => this.http.get<Question>(this.questionsApi(id));

    getQuestionAmounts = (exam: Exam) => {
        const data = { accepted: 0, rejected: 0, hasEssays: false };
        exam.examSections.forEach(section => {
            section.sectionQuestions.forEach(sectionQuestion => {
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
    }

    calculateDefaultMaxPoints = (question: Question) =>
        question.options
            .filter(o => o.defaultScore > 0)
            .reduce((a, b) => a + b.defaultScore, 0)


    // For weighted mcq
    calculateMaxPoints = (sectionQuestion: ExamSectionQuestion): number => {
        const points = sectionQuestion.options
            .filter(o => o.score > 0)
            .reduce((a, b) => a + b.score, 0);
        return parseFloat(points.toFixed(2));
    }

    scoreClozeTestAnswer = (sectionQuestion: ExamSectionQuestion): number => {
        if (!sectionQuestion.clozeTestAnswer) {
            return 0;
        }
        const score = sectionQuestion.clozeTestAnswer.score;
        const proportion = score.correctAnswers * sectionQuestion.maxScore /
            (score.correctAnswers + score.incorrectAnswers);
        return parseFloat(proportion.toFixed(2));
    }

    scoreWeightedMultipleChoiceAnswer = (sectionQuestion: ExamSectionQuestion) => {
        const score = sectionQuestion.options
            .filter(o => o.answered)
            .reduce((a, b) => a + b.score, 0);
        return Math.max(0, score);
    }

    // For non-weighted mcq
    scoreMultipleChoiceAnswer = (sectionQuestion: ExamSectionQuestion) => {
        const answered = sectionQuestion.options.filter(o => o.answered);
        if (answered.length === 0) {
            // No answer
            return 0;
        }
        if (answered.length !== 1) {
            console.error('multiple options selected for a MultiChoice answer!');
        }

        return answered[0].option.correctOption ? sectionQuestion.maxScore : 0;
    }

    private getQuestionData(question: Question): Question {
        const questionToUpdate: any = {
            'type': question.type,
            'defaultMaxScore': question.defaultMaxScore,
            'question': question.question,
            'shared': question.shared,
            'defaultAnswerInstructions': question.defaultAnswerInstructions,
            'defaultEvaluationCriteria': question.defaultEvaluationCriteria,
            'questionOwners': question.questionOwners,
            'tags': question.tags,
            'options': question.options
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

    createQuestion = (question: Question): Promise<Question> => {
        const body = this.getQuestionData(question);
        return new Promise<Question>((resolve, reject) => {
            this.http.post<Question>(this.questionsApi(question.id), body).subscribe(
                response => {
                    toast.info(this.translate.instant('sitnet_question_added'));
                    if (question.attachment && question.attachment.file && question.attachment.modified) {
                        this.Files.upload('/app/attachment/question', question.attachment.file,
                            { questionId: response.id }, question, function () {
                                resolve(response);
                            });
                    } else {
                        resolve(response);
                    }
                },
                error => reject(error)
            );
        });
    }

    updateQuestion = (question: Question, displayErrors: boolean): Promise<Question> => {
        const body = this.getQuestionData(question);
        return new Promise<Question>((resolve, reject) => {
            this.http.put<Question>(this.questionsApi(question.id), body).subscribe(
                response => {
                    toast.info(this.translate.instant('sitnet_question_saved'));
                    if (question.attachment && question.attachment.file && question.attachment.modified) {
                        this.Files.upload('/app/attachment/question', question.attachment.file,
                            { questionId: question.id }, question, function () {
                                resolve();
                            });
                    } else if (question.attachment && question.attachment.removed) {
                        this.Attachment.eraseQuestionAttachment(question).then(function () {
                            resolve(response);
                        });
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    updateDistributedExamQuestion = (question: Question, sectionQuestion: ExamSectionQuestion, examId, sectionId) => {
        const data: any = {
            'id': sectionQuestion.id,
            'maxScore': sectionQuestion.maxScore,
            'answerInstructions': sectionQuestion.answerInstructions,
            'evaluationCriteria': sectionQuestion.evaluationCriteria,
            'options': sectionQuestion.options,
            'question': question
        };

        // update question specific attributes
        switch (question.type) {
            case 'EssayQuestion':
                data.expectedWordCount = sectionQuestion.expectedWordCount;
                data.evaluationType = sectionQuestion.evaluationType;
                break;
        }
        return new Promise<ExamSectionQuestion>((resolve, reject) => {
            this.http.put<ExamSectionQuestion>(
                `/app/exams/${examId}/sections/${sectionId}/questions/${sectionQuestion.id}/distributed`, data)
                .subscribe(
                    response => {
                        Object.assign(response.question, question);
                        if (question.attachment && question.attachment.modified && question.attachment.file) {
                            this.Files.upload('/app/attachment/question', question.attachment.file,
                                { questionId: question.id }, question, function () {
                                    response.question.attachment = question.attachment;
                                    resolve(response);
                                });
                        } else if (question.attachment && question.attachment.removed) {
                            this.Attachment.eraseQuestionAttachment(question).then(() => {
                                delete response.question.attachment;
                                resolve(response);
                            });
                        } else {
                            resolve(response);
                        }
                    }, err => {
                        toast.error(err.data);
                        reject();
                    }
                );
        });
    }

    toggleCorrectOption = (option: MultipleChoiceOption, options: MultipleChoiceOption[]) => {
        option.correctOption = true;
        options.forEach(o => o.correctOption = o === option);
    }

}
