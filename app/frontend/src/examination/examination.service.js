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
import async from 'async';
import _ from 'lodash';
import toast from 'toastr';

function ExaminationFactory($q, $state, $http, $window, $translate) {
    const self = this;
    let _external;

    const getResource = function(url) {
        return _external ? url.replace('/app/', '/app/iop/') : url;
    };

    self.startExam = function(hash, isPreview, isCollaboration, id) {
        const url = isPreview && id ? '/app/exams/' + id + '/preview' : '/app/student/exam/' + hash;
        const deferred = $q.defer();
        $http.get('/app/checkSession').then(() => {
            $http
                .get(isCollaboration ? url.replace('/app/', '/integration/iop/') : url)
                .then(function(resp) {
                    if (resp.data.cloned) {
                        // we came here with a reference to the parent exam so do not render page just yet,
                        // reload with reference to student exam that we just created
                        $state.go('examination', { hash: resp.data.hash });
                    }
                    _external = resp.data.external;
                    deferred.resolve(resp.data);
                })
                .catch(function(resp) {
                    deferred.reject(resp.data);
                });
        });

        return deferred.promise;
    };

    self.saveTextualAnswer = function(esq, hash, autosave, canFail) {
        esq.questionStatus = $translate.instant('sitnet_answer_saved');
        const deferred = $q.defer();
        const type = esq.question.type;
        const answerObj = type === 'EssayQuestion' ? esq.essayAnswer : esq.clozeTestAnswer;
        const url = getResource(
            type === 'EssayQuestion'
                ? '/app/student/exam/' + hash + '/question/' + esq.id
                : '/app/student/exam/' + hash + '/clozetest/' + esq.id,
        );
        const msg = {
            answer: answerObj.answer,
            objectVersion: answerObj.objectVersion,
        };
        $http
            .post(url, msg)
            .then(function(resp) {
                if (autosave) {
                    esq.autosaved = new Date();
                } else {
                    if (!canFail) {
                        toast.info($translate.instant('sitnet_answer_saved'));
                    }
                    self.setQuestionColors(esq);
                }
                answerObj.objectVersion = resp.data.objectVersion;
                deferred.resolve();
            })
            .catch(function(resp) {
                if (!canFail) {
                    toast.error(resp.data);
                }
                deferred.reject();
            });
        return deferred.promise;
    };

    const isTextualAnswer = function(esq, allowEmpty) {
        switch (esq.question.type) {
            case 'EssayQuestion':
                return esq.essayAnswer && (allowEmpty || esq.essayAnswer.answer.length > 0);
            case 'ClozeTestQuestion':
                return esq.clozeTestAnswer && (allowEmpty || !_.isEmpty(esq.clozeTestAnswer.answer));
            default:
                return false;
        }
    };

    self.saveAllTextualAnswersOfSection = function(section, hash, autosave, allowEmpty, canFail) {
        const deferred = $q.defer();

        const questions = section.sectionQuestions.filter(function(esq) {
            return isTextualAnswer(esq, allowEmpty);
        });
        const save = function(question, cb) {
            self.saveTextualAnswer(question, hash, autosave, canFail).then(
                () => cb(null),
                err => cb(err),
            );
        };
        // Run this in an async loop to make sure we don't get version conflicts
        async.eachSeries(questions, save, () => deferred.resolve());
        return deferred.promise;
    };

    self.saveAllTextualAnswersOfExam = (exam, canFail) => {
        const deferred = $q.defer();
        const save = (section, cb) =>
            self.saveAllTextualAnswersOfSection(section, exam.hash, false, true, canFail).then(
                () => cb(null),
                err => cb(err),
            );
        async.eachSeries(exam.examSections, save, () => deferred.resolve());
        return deferred.promise;
    };

    const stripHtml = function(text) {
        if (text && text.indexOf('math-tex') === -1) {
            return String(text).replace(/<[^>]+>/gm, '');
        }
        return text;
    };

    self.isAnswered = function(sq) {
        let isAnswered;
        switch (sq.question.type) {
            case 'EssayQuestion': {
                const essayAnswer = sq.essayAnswer;
                isAnswered = essayAnswer && essayAnswer.answer && stripHtml(essayAnswer.answer).length > 0;
                break;
            }
            case 'MultipleChoiceQuestion':
                isAnswered = angular.isDefined(sq.selectedOption) || sq.options.some(o => o.answered);
                break;
            case 'WeightedMultipleChoiceQuestion':
                isAnswered = sq.options.some(o => o.answered);
                break;
            case 'ClaimChoiceQuestion':
                isAnswered = angular.isDefined(sq.selectedOption) || sq.options.some(o => o.answered);
                break;
            case 'ClozeTestQuestion': {
                const clozeTestAnswer = sq.clozeTestAnswer;
                isAnswered = clozeTestAnswer && !_.isEmpty(clozeTestAnswer.answer);
                break;
            }
            default:
                isAnswered = false;
        }
        return isAnswered;
    };

    self.setQuestionColors = function(sectionQuestion) {
        if (self.isAnswered(sectionQuestion)) {
            sectionQuestion.answered = true;
            sectionQuestion.questionStatus = $translate.instant('sitnet_question_answered');
            sectionQuestion.selectedAnsweredState = 'question-answered-header';
        } else {
            sectionQuestion.answered = false;
            sectionQuestion.questionStatus = $translate.instant('sitnet_question_unanswered');
            sectionQuestion.selectedAnsweredState = 'question-unanswered-header';
        }
    };

    self.saveOption = function(hash, sq, preview) {
        let ids;
        if (sq.question.type === 'WeightedMultipleChoiceQuestion') {
            ids = sq.options
                .filter(function(o) {
                    return o.answered;
                })
                .map(function(o) {
                    return o.id;
                });
        } else {
            ids = [sq.selectedOption];
        }
        if (!preview) {
            const url = getResource('/app/student/exam/' + hash + '/question/' + sq.id + '/option');
            $http
                .post(url, { oids: ids })
                .then(function() {
                    toast.info($translate.instant('sitnet_answer_saved'));
                    sq.options.forEach(function(o) {
                        o.answered = ids.indexOf(o.id) > -1;
                    });
                    self.setQuestionColors(sq);
                })
                .catch(function(resp) {
                    toast.error(resp.data);
                });
        } else {
            self.setQuestionColors(sq);
        }
    };

    self.abort = function(hash) {
        const url = getResource('/app/student/exam/abort/' + hash);
        return $http.put(url);
    };

    self.logout = function(msg, hash, quitLinkEnabled, canFail) {
        const url = getResource('/app/student/exam/' + hash);
        const ok = () => {
            toast.info($translate.instant(msg), { timeOut: 5000 });
            $window.onbeforeunload = null;
            $state.go('examinationLogout', { reason: 'finished', quitLinkEnabled: quitLinkEnabled });
        };
        $http
            .put(url)
            .then(ok)
            .catch(function(resp) {
                if (!canFail) {
                    toast.error($translate.instant(resp.data));
                } else {
                    ok();
                }
            });
    };

    self.getSectionMaxScore = function(section) {
        if (!section || !section.sectionQuestions) {
            return 0;
        }

        const sum = section.sectionQuestions
            .filter(esq => esq.question.type && esq.evaluationType !== 'Selection')
            .map(esq => esq.derivedMaxScore)
            .reduce((acc, current) => acc + current, 0);

        return _.isInteger(sum) ? sum : parseFloat(sum.toFixed(2));
    };
}

angular
    .module('app.examination')
    .service('Examination', ['$q', '$state', '$http', '$window', '$translate', ExaminationFactory]);
