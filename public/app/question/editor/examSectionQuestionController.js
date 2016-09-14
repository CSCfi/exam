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

                $scope.updateEvaluationType = function () {
                    if ($scope.sectionQuestion.evaluationType && $scope.sectionQuestion.evaluationType === 'Selection') {
                        $scope.sectionQuestion.maxScore = undefined;
                    }
                };

                $scope.addNewOption = function (question) {
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }
                    var option = {};
                    question.options.push(option);
                    $scope.sectionQuestion.options.push({option: option});
                };

                $scope.removeOption = function (option) {
                    if ($scope.lotteryOn) {
                        toastr.error($translate.instant("sitnet_action_disabled_lottery_on"));
                        return;
                    }
                    $scope.sectionQuestion.options.splice($scope.sectionQuestion.options.indexOf(option), 1);
                };

                $scope.correctAnswerToggled = function (option) {
                    questionService.toggleCorrectOption(option.option,
                        $scope.sectionQuestion.options.map(function (o) {
                                return o.option;
                            }
                        ));
                };

                $scope.optionDisabled = function (option) {
                    return angular.isUndefined(option.option.id) || option.option.correctOption;
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
                            if (!fileService.isFileTooBig($scope.attachmentFile)) {
                                $modalInstance.close($scope.attachmentFile);
                            }
                        };

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

                    modalInstance.result.then(function (attachment) {
                        attachment.modified = true;
                        $scope.question.attachment = attachment;
                    });
                };


                var initForm = function () {
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
