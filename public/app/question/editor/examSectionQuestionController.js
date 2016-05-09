(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamSectionQuestionCtrl', ['$scope', '$q', '$uibModal', '$translate', 'QuestionRes',
            'ExamSectionQuestionRes', 'questionService', 'EXAM_CONF', '$sce',
            function ($scope, $q, $modal, $translate, QuestionRes, ExamSectionQuestionRes, questionService, EXAM_CONF,
                      $sce) {

                $scope.getOptions = function () {
                    return $scope.sectionQuestion.options;
                };

                $scope.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                $scope.estimateCharacters = function () {
                    return $scope.sectionQuestion.expectedWordCount * 8;
                };

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                var update = function (displayErrors) {
                    var questionToUpdate = {
                        "id": $scope.sectionQuestion.id,
                        "maxScore": $scope.sectionQuestion.maxScore,
                        "answerInstructions": $scope.sectionQuestion.answerInstructions,
                        "evaluationCriteria": $scope.sectionQuestion.evaluationCriteria
                    };

                    // update question specific attributes
                    switch ($scope.newQuestion.type) {
                        case 'EssayQuestion':
                            questionToUpdate.expectedWordCount = $scope.sectionQuestion.expectedWordCount;
                            questionToUpdate.evaluationType = $scope.sectionQuestion.evaluationType;
                            break;
                    }
                    var deferred = $q.defer();
                    ExamSectionQuestionRes.questions.update({id: $scope.sectionQuestion.id}, questionToUpdate,
                        function () {
                            toastr.info($translate.instant("sitnet_question_saved"));
                            deferred.resolve();
                        }, function (error) {
                            if (displayErrors) {
                                toastr.error(error.data);
                            }
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                $scope.updateEvaluationType = function () {
                    if ($scope.sectionQuestion.evaluationType && $scope.sectionQuestion.evaluationType === 'Select') {
                        $scope.sectionQuestion.maxScore = undefined;
                    }
                    update();
                };

                $scope.updateQuestion = function () {
                    if (!$scope.questionForm.$valid) {
                        return;
                    }
                    update();
                };

                $scope.updateOption = function (option) {
                    if (!$scope.questionForm.$valid) {
                        return;
                    }
                    var data = {
                        score: option.score
                    };
                    ExamSectionQuestionRes.options.update({qid: $scope.sectionQuestion.id, oid: option.id}, data,
                        function () {
                            toastr.info($translate.instant('sitnet_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.selectIfDefault = function (value, $event) {
                    if (value === $translate.instant('sitnet_default_option_description')) {
                        $event.target.select();
                    }
                };

                var openBaseQuestionEditor = function (sectionQuestion) {
                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        $scope.baseQuestionId = sectionQuestion.question.id;
                        $scope.submit = function (q) {
                            questionService.updateQuestion(q, true).then(function () {
                                toastr.info($translate.instant("sitnet_question_saved"));
                                $modalInstance.close(q);
                            });
                        };

                        $scope.cancel = function () {
                            $modalInstance.dismiss();
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/editor/dialog_new_question.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        windowClass: 'question-editor-modal'
                    });

                    modalInstance.result.then(function (question) {
                        if (question) {
                            // Update scope where needed
                            $scope.sectionQuestion.question.question = question.question;
                            $scope.sectionQuestion.question.attachment = question.attachment;
                            // Some serious updating of answer options. Maybe this could be done easier?
                            var updatables = $scope.sectionQuestion.options.filter(function (o) {
                                return question.options.map(function (qo) {
                                    return qo.id;
                                }).indexOf(o.option.id) > -1;
                            });
                            var removables = angular.copy($scope.sectionQuestion.options.filter(function (o) {
                                return question.options.map(function (qo) {
                                    return qo.id;
                                }).indexOf(o.option.id) === -1;
                            }));
                            var insertables = question.options.filter(function (o) {
                                return $scope.sectionQuestion.options.map(function (esqo) {
                                    return esqo.option.id;
                                }).indexOf(o.id) === -1;
                            });
                            updatables.forEach(function (o) {
                                question.options.forEach(function (qo) {
                                    if (qo.id === o.option.id) {
                                        o.option = qo;
                                    }
                                })
                            });
                            removables.forEach(function (o) {
                                var index = -1;
                                $scope.sectionQuestion.options.some(function (esqo, x) {
                                    if (o.option.id === esqo.option.id) {
                                        index = x;
                                    }
                                });
                                if (index > -1) {
                                    $scope.sectionQuestion.options.splice(index, 1);
                                }
                            });
                            insertables.forEach(function (o) {
                                $scope.sectionQuestion.options.push({option: o});
                            });
                        }
                        modalInstance.dismiss();
                    });
                };

                $scope.openBaseQuestionEditor = function () {
                    openBaseQuestionEditor($scope.sectionQuestion);
                };

            }]);
}());
