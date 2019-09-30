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
import angular from 'angular';
import _ from 'lodash';
import toast from 'toastr';

function QuestionService($q, $resource, $translate, $document, $sessionStorage, ExamQuestion, Session,
    Files, Attachment) {

    this.questionsApi = $resource('/app/questions/:id',
        {
            id: '@id'
        },
        {
            'update': { method: 'PUT' },
            'delete': { method: 'DELETE', params: { id: '@id' } },
            'create': { method: 'POST' }

        });

    this.questionOwnerApi = $resource('/app/questions/owner/:uid',
        {
            uid: '@uid'
        },
        {
            'update': { method: 'POST' }
        });

    this.essayScoreApi = $resource('/app/review/examquestion/:id/score',
        {
            id: '@id'
        },
        {
            'update': { method: 'PUT', params: { id: '@id' } }
        });

    this.questionCopyApi = $resource('/app/question/:id',
        {
            id: '@id'
        },
        {
            'copy': { method: 'POST' }
        });


    this.getQuestionType = (type) => {
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
    };

    this.getQuestionDraft = () => {
        return {
            examSectionQuestions: [],
            options: [],
            questionOwners: [Session.getUser()],
            state: 'NEW',
            tags: []
        };
    };

    this.getQuestionAmounts = (exam) => {
        const data = { accepted: 0, rejected: 0, hasEssays: false };
        angular.forEach(exam.examSections, section => {
            angular.forEach(section.sectionQuestions, sectionQuestion => {
                const question = sectionQuestion.question;
                if (question.type === 'EssayQuestion') {
                    if (sectionQuestion.evaluationType === 'Selection' && sectionQuestion.essayAnswer) {
                        if (parseInt(sectionQuestion.essayAnswer.evaluatedScore) === 1) {
                            data.accepted++;
                        } else if (parseInt(sectionQuestion.essayAnswer.evaluatedScore) === 0) {
                            data.rejected++;
                        }
                    }
                    data.hasEssays = true;
                }
            });
        });
        return data;
    };

    // For weighted mcq
    this.calculateDefaultMaxPoints = question =>
        question.options
            .filter(o => o.defaultScore > 0)
            .reduce((a, b) => a + b.defaultScore, 0);


    // For weighted mcq
    this.calculateMaxPoints = sectionQuestion => {
        if (!sectionQuestion.options) {
            return 0;
        }
        const points = sectionQuestion.options
            .filter(o => o.score > 0)
            .reduce((a, b) => a + parseFloat(b.score), 0);
        return parseFloat(points.toFixed(2));
    };

    this.scoreClozeTestAnswer = sectionQuestion => {
        if (_.isNumber(sectionQuestion.forcedScore)) {
            return sectionQuestion.forcedScore;
        }
        const score = sectionQuestion.clozeTestAnswer.score;
        return parseFloat(score.correctAnswers * sectionQuestion.maxScore /
            (score.correctAnswers + score.incorrectAnswers).toFixed(2));
    };

    this.scoreWeightedMultipleChoiceAnswer = (sectionQuestion, ignoreForcedScore) => {
        if (_.isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const score = sectionQuestion.options
            .filter(o => o.answered)
            .reduce((a, b) => a + b.score, 0);
        return Math.max(0, score);
    };

    // For non-weighted mcq
    this.scoreMultipleChoiceAnswer = (sectionQuestion, ignoreForcedScore) => {
        if (_.isNumber(sectionQuestion.forcedScore) && !ignoreForcedScore) {
            return sectionQuestion.forcedScore;
        }
        const selected = sectionQuestion.options.filter(o => o.answered);
        if (selected.length === 0) {
            return 0;
        }
        if (selected.length !== 1) {
            console.error('multiple options selected for a MultiChoice answer!');
        }
        if (selected[0].option.correctOption === true) {
            return sectionQuestion.maxScore;
        }
        return 0;
    };

    this.decodeHtml = html => {
        const txt = $document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    };

    this.longTextIfNotMath = text => {
        if (text && text.length > 0 && text.indexOf('math-tex') === -1) {
            // remove HTML tags
            const str = String(text).replace(/<[^>]+>/gm, '');
            // shorten string
            return this.decodeHtml(str);
        }
        return '';
    };

    this.shortText = (text, maxLength) => {

        if (text && text.length > 0 && text.indexOf('math-tex') === -1) {
            // remove HTML tags
            let str = String(text).replace(/<[^>]+>/gm, '');
            // shorten string
            str = this.decodeHtml(str);
            return str.length + 3 > maxLength ? str.substr(0, maxLength) + '...' : str;
        }
        return text ? this.decodeHtml(text) : '';
    };

    let _filter;

    this.setFilter = filter => {
        switch (filter) {
            case 'MultipleChoiceQuestion':
            case 'WeightedMultipleChoiceQuestion':
            case 'EssayQuestion':
            case 'ClozeTestQuestion':
                _filter = filter;
                break;
            default:
                _filter = undefined;
        }
    };

    this.applyFilter = questions => {
        if (!_filter) {
            return questions;
        }
        return questions.filter(q => q.type === _filter);
    };

    this.loadFilters = category => {
        if ($sessionStorage.questionFilters && $sessionStorage.questionFilters[category]) {
            return JSON.parse($sessionStorage.questionFilters[category]);
        }
        return {};
    };

    this.storeFilters = (filters, category) => {
        const data = { filters: filters };
        if (!$sessionStorage.questionFilters) {
            $sessionStorage.questionFilters = {};
        }
        $sessionStorage.questionFilters[category] = JSON.stringify(data);
    };

    this.range = (min, max, step) => {
        step |= 1;
        const input = [];
        for (let i = min; i <= max; i += step) {
            input.push(i);
        }
        return input;
    };

    const getQuestionData = question => {
        const questionToUpdate = {
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
    };

    this.createQuestion = question => {
        const body = getQuestionData(question);
        const deferred = $q.defer();

        this.questionsApi.create(body,
            response => {
                toast.info($translate.instant('sitnet_question_added'));
                if (question.attachment && question.attachment.modified) {
                    Files.upload('/app/attachment/question', question.attachment.file,
                        { questionId: response.id }, question, () => deferred.resolve(response)
                    );
                } else {
                    deferred.resolve(response);
                }
            },
            deferred.reject
        );
        return deferred.promise;
    };

    this.updateQuestion = (question, displayErrors) => {
        const body = getQuestionData(question);
        const deferred = $q.defer();
        this.questionsApi.update(body,
            response => {
                toast.info($translate.instant('sitnet_question_saved'));
                if (question.attachment && question.attachment.modified) {
                    Files.upload('/app/attachment/question', question.attachment.file,
                        { questionId: question.id }, question, () => deferred.resolve
                    );
                }
                else if (question.attachment && question.attachment.removed) {
                    Attachment.eraseQuestionAttachment(question).then(() => deferred.resolve(response));
                } else {
                    deferred.resolve(response);
                }
            }, error => {
                if (displayErrors) {
                    toast.error(error.data);
                }
                deferred.reject();
            }
        );
        return deferred.promise;
    };

    this.updateDistributedExamQuestion = (question, sectionQuestion, examId, sectionId) => {
        const data = {
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
        const deferred = $q.defer();
        ExamQuestion.distributionApi.update({ qid: sectionQuestion.id, eid: examId, sid: sectionId }, data,
            esq => {
                angular.extend(esq.question, question);
                if (question.attachment && question.attachment.modified) {
                    Files.upload('/app/attachment/question', question.attachment,
                        { questionId: question.id }, question,
                        () => {
                            esq.question.attachment = question.attachment;
                            deferred.resolve(esq);
                        }
                    );
                }
                else if (question.attachment && question.attachment.removed) {
                    Attachment.eraseQuestionAttachment(question).then(() => {
                        esq.question.attachment = null;
                        deferred.resolve(esq);
                    });
                } else {
                    deferred.resolve(esq);
                }
            }, error => {
                toast.error(error.data);
                deferred.reject();
            }
        );
        return deferred.promise;
    };

    this.toggleCorrectOption = (option, options) => {
        option.correctOption = true;
        angular.forEach(options, o => o.correctOption = o === option);
    };

}

angular.module('app.question')
    .factory('Question', ['$q', '$resource', '$translate', '$document', '$sessionStorage',
        'ExamQuestion', 'Session', 'Files', 'Attachment', QuestionService]);

