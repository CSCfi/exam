(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamSectionQuestionCtrl', ['dialogs', '$rootScope', '$scope', '$q', '$http', '$uibModal', '$routeParams',
            '$location', '$translate', 'focus', 'QuestionRes', 'ExamSectionQuestionRes', 'questionService', 'ExamRes', 'TagRes', 'EXAM_CONF',
            'fileService', '$sce',
            function (dialogs, $rootScope, $scope, $q, $http, $modal, $routeParams, $location, $translate, focus,
                      QuestionRes, ExamSectionQuestionRes, questionService, ExamRes, TagRes, EXAM_CONF, fileService, $sce) {

                var qid = $routeParams.editId || $routeParams.id;

                $scope.sectionQuestion = {};
                $scope.newQuestion = {};
                $scope.lotteryOn = false;

                function sectionQuestionResponse(question) {
                    $scope.lotteryOn = question.examSection.lotteryOn;
                    $scope.sectionQuestion = question;
                    $scope.newQuestion = question.question;
                }

                ExamSectionQuestionRes.questions.get({id: qid},
                    sectionQuestionResponse,
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.getOptions = function () {
                    if ($scope.newQuestion.type === 'WeightedMultipleChoiceQuestion') {
                        return $scope.sectionQuestion.options;
                    }
                    return $scope.newQuestion.options;
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

                $scope.saveQuestion = function () {
                    if (!$scope.questionForm.$valid) {
                        return;
                    }

                    var query = {'scrollTo': 'section' + $routeParams.sectionId};
                    var returnUrl = "/exams/" + $routeParams.examId;

                    update().then(function () {
                        if (query) {
                            $location.search(query);
                        }
                        $location.path(returnUrl);
                    }, function () {
                        toastr.error(error.data);
                    });
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

            }]);
}());
