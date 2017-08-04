'use strict';
angular.module('app.examination')
    .service('Examination', ['$q', '$location', '$http', '$translate',
        function ($q, $location, $http, $translate) {

            var self = this;
            var _external;

            var getResource = function (url) {
                return _external ? url.replace('/app/', '/app/iop/') : url;
            };

            self.startExam = function (hash, isPreview, id) {
                var url = isPreview && id ? '/app/exampreview/' + id : '/app/student/exam/' + hash;
                var deferred = $q.defer();
                $http.get(url).success(function (data) {
                    if (data.cloned) {
                        // we came here with a reference to the parent exam so do not render page just yet,
                        // reload with reference to student exam that we just created
                        $location.path('/student/exam/' + data.hash);
                    }
                    _external = data.external;
                    deferred.resolve(data);
                }).error(function (err) {
                    deferred.reject(err);
                });
                return deferred.promise;
            };

            self.saveTextualAnswer = function (esq, hash, autosave) {
                esq.questionStatus = $translate.instant('sitnet_answer_saved');
                var deferred = $q.defer();
                var type = esq.question.type;
                var answerObj = type === 'EssayQuestion' ? esq.essayAnswer : esq.clozeTestAnswer;
                var url = getResource(type === 'EssayQuestion' ?
                    '/app/student/exam/' + hash + '/question/' + esq.id :
                    '/app/student/exam/' + hash + '/clozetest/' + esq.id
                );
                var msg = {
                    answer: answerObj.answer,
                    objectVersion: answerObj.objectVersion
                };
                $http.post(url, msg).success(function (answer) {
                    if (autosave) {
                        esq.autosaved = new Date();
                    } else {
                        toastr.info($translate.instant('sitnet_answer_saved'));
                        self.setQuestionColors(esq);
                    }
                    answerObj.objectVersion = answer.objectVersion;
                    deferred.resolve();
                }).error(function (error) {
                    toastr.error(error.data);
                    deferred.reject();
                });
                return deferred.promise;
            };

            var isTextualAnswer = function (esq) {
                switch (esq.question.type) {
                    case 'EssayQuestion':
                        return esq.essayAnswer && esq.essayAnswer.answer.length > 0;
                    case 'ClozeTestQuestion':
                        return esq.clozeTestAnswer && !_.isEmpty(esq.clozeTestAnswer.answer);
                    default:
                        return false;
                }
            };

            self.saveAllTextualAnswersOfSection = function (section, hash, autosave, canFail) {
                var deferred = $q.defer();
                var promises = [];
                section.sectionQuestions.filter(function (esq) {
                    return isTextualAnswer(esq);
                }).forEach(function (esq) {
                    promises.push(self.saveTextualAnswer(esq, hash, autosave));
                });
                if (canFail) {
                    $q.allSettled(promises).then(function () {
                        deferred.resolve();
                    });
                } else {
                    $q.all(promises).then(function () {
                        deferred.resolve();
                    });
                }
                return deferred.promise;
            };

            var stripHtml = function (text) {
                if (text && text.indexOf('math-tex') === -1) {
                    return String(text).replace(/<[^>]+>/gm, '');
                }
                return text;
            };

            self.isAnswered = function (sq) {
                var isAnswered;
                switch (sq.question.type) {
                    case 'EssayQuestion':
                        var essayAnswer = sq.essayAnswer;
                        isAnswered = essayAnswer && essayAnswer.answer &&
                            stripHtml(essayAnswer.answer).length > 0;
                        break;
                    case 'MultipleChoiceQuestion':
                        isAnswered = angular.isDefined(sq.selectedOption) || sq.options.filter(function (o) {
                                return o.answered;
                            }).length > 0;
                        break;
                    case 'WeightedMultipleChoiceQuestion':
                        isAnswered = sq.options.filter(function (o) {
                                return o.answered;
                            }).length > 0;
                        break;
                    case 'ClozeTestQuestion':
                        var clozeTestAnswer = sq.clozeTestAnswer;
                        isAnswered = clozeTestAnswer && !_.isEmpty(clozeTestAnswer.answer);
                        break;
                    default:
                        isAnswered = false;
                }
                return isAnswered;
            };

            self.setQuestionColors = function (sectionQuestion) {
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

            self.saveOption = function (hash, sq, preview) {
                var ids;
                if (sq.question.type === 'WeightedMultipleChoiceQuestion') {
                    ids = sq.options.filter(function (o) {
                        return o.answered;
                    }).map(function (o) {
                        return o.id;
                    });
                } else {
                    ids = [sq.selectedOption];
                }
                if (!preview) {
                    var url = getResource('/app/student/exam/' + hash + '/question/' + sq.id + '/option');
                    $http.post(url, {oids: ids}).success(function () {
                        toastr.info($translate.instant('sitnet_answer_saved'));
                        sq.options.forEach(function (o) {
                            o.answered = ids.indexOf(o.id) > -1;
                        });
                        self.setQuestionColors(sq);
                    }).error(function (error) {
                        toastr.error(error.data);
                    });
                } else {
                    self.setQuestionColors(sq);
                }

            };

            self.abort = function (hash) {
                var url = getResource('/app/student/exam/abort/' + hash);
                return $http.put(url);
            };

            self.logout = function (msg, hash) {
                var url = getResource('/app/student/exam/' + hash);
                $http.put(url).success(function () {
                    toastr.info($translate.instant(msg), {timeOut: 5000});
                    window.onbeforeunload = null;
                    $location.path('/student/logout/finished');
                }).error(function (error) {
                    toastr.error($translate.instant(error.data));
                });
            };

        }]);

