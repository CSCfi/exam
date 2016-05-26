(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamSectionQuestionCtrl', ['$rootScope', '$scope', '$q', '$uibModal', '$translate', 'QuestionRes',
            'ExamSectionQuestionRes', 'questionService', 'EXAM_CONF', '$sce', 'fileService',
            function ($rootScope, $scope, $q, $modal, $translate, QuestionRes, ExamSectionQuestionRes, questionService, EXAM_CONF,
                      $sce, fileService) {

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

                var updateBaseQuestion = function () {
                    questionService.updateQuestion($scope.question, true);
                };

                var updateExamQuestion = function () {
                    var questionToUpdate = {
                        "id": $scope.sectionQuestion.id,
                        "maxScore": $scope.sectionQuestion.maxScore,
                        "answerInstructions": $scope.sectionQuestion.answerInstructions,
                        "evaluationCriteria": $scope.sectionQuestion.evaluationCriteria
                    };

                    // update question specific attributes
                    switch ($scope.question.type) {
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
                            toastr.error(error.data);
                            deferred.reject();
                        }
                    );
                    return deferred.promise;
                };

                // from the editor directive activated "onblur"
                $scope.updateProperties = function () {
                    $scope.updateBaseQuestion();
                };

                $scope.updateBaseQuestion = function () {
                    if (!$scope.questionForm.$valid) {
                        return;
                    }
                    updateBaseQuestion();
                };

                $scope.updateEvaluationType = function () {
                    if ($scope.sectionQuestion.evaluationType && $scope.sectionQuestion.evaluationType === 'Selection') {
                        $scope.sectionQuestion.maxScore = undefined;
                    }
                    updateExamQuestion();
                };

                $scope.updateExamQuestion = function () {
                    if (!$scope.questionForm.$valid) {
                        return;
                    }
                    updateExamQuestion();
                };

                $scope.saveOption = function (option) {
                    if (angular.isDefined(option.id) || !$scope.questionForm.$valid) {
                        return;
                    }
                    var data = {
                        defaultScore: option.score,
                        option: option.option.option,
                        correctOption: option.option.correctOption,
                        examSectionQuestionId: $scope.sectionQuestion.id
                    };
                    QuestionRes.options.create({qid: $scope.question.id}, data,
                        function (opt) {
                            option.option.id = opt.id;
                            toastr.info($translate.instant('sitnet_option_added'));
                            focus('opt' + opt.id);
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                // Need one for the base options as well
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

                $scope.updateOptionText = function (examQuestionOption) {
                    if (angular.isUndefined(examQuestionOption.option.id)) {
                        return;
                    }
                    QuestionRes.options.update({oid: examQuestionOption.option.id}, examQuestionOption.option,
                        function () {
                            toastr.info($translate.instant('sitnet_option_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                $scope.addNewOption = function (question) {
                    var option = {};
                    question.options.push(option);
                    $scope.sectionQuestion.options.push({option: option});
                };

                $scope.removeOption = function (option) {
                    QuestionRes.options.delete({qid: $scope.sectionQuestion.id, oid: option.option.id},
                        function () {
                            $scope.sectionQuestion.options.splice($scope.sectionQuestion.options.map(function(o) {
                                return o.option.id;
                            }).indexOf(option.option.id), 1);
                            toastr.info($translate.instant('sitnet_option_removed'));
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );

                };

                $scope.correctAnswerToggled = function (examQuestionOption) {
                    QuestionRes.correctOption.update({oid: examQuestionOption.option.id}, examQuestionOption.option,
                        function (question) {
                            $scope.sectionQuestion.options.forEach(function (o) {
                                o.option.correctOption = o.id == examQuestionOption.id;
                            });
                            //$scope.question.options = question.options;
                            toastr.info($translate.instant('sitnet_correct_option_updated'));
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

                $scope.selectFile = function () {

                    var question = $scope.question;

                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                        $scope.question = question;
                        $scope.isTeacherModal = true;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });

                        $scope.submit = function () {
                            fileService.upload("/app/attachment/question", $scope.attachmentFile, {questionId: $scope.question.id}, $scope.question, $modalInstance);
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };

                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        modalInstance.dismiss();
                    //    $location.path('/questions/' + $scope.newQuestion.id);
                    }, function () {
                        // Cancel button
                    });
                };


                var initForm = function() {
                    QuestionRes.questions.get({id: $scope.sectionQuestion.question.id}, function (data) {
                        $scope.question = data;
                        var examNames = $scope.question.examSectionQuestions.map(function (esq) {
                            return esq.examSection.exam.name;
                        });
                        // remove duplicates
                        $scope.examNames = examNames.filter(function (n, pos) {
                            return examNames.indexOf(n) == pos;
                        });
                    });
                };

                initForm();

            }]);
}());
