'use strict';

angular.module('app.exam.editor')
    .component('sectionQuestion', {
        templateUrl: '/assets/app/exam/editor/sections/sectionQuestion.template.html',
        bindings: {
            sectionQuestion: '<',
            lotteryOn: '<',
            onDelete: '&'
        },
        controller: ['$sce', '$q', '$uibModal', '$translate', 'dialogs', 'questionService', 'ExamSectionQuestionRes', 'ExamRes', 'EXAM_CONF',
            function ($sce, $q, $modal, $translate, dialogs, questionService, ExamSectionQuestionRes, ExamRes, EXAM_CONF) {

                var vm = this;

                vm.calculateMaxPoints = function () {
                    return questionService.calculateMaxPoints(vm.sectionQuestion);
                };

                vm.sanitizeQuestion = function () {
                    return $sce.trustAsHtml(vm.sectionQuestion.question.question);
                };

                vm.editQuestion = function () {
                    openExamQuestionEditor();
                };

                vm.removeQuestion = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_question'));
                    dialog.result.then(function () {
                        vm.onDelete({sectionQuestion: vm.sectionQuestion});
                    });
                };

                var getQuestionDistribution = function () {
                    var deferred = $q.defer();
                    ExamRes.questionDistribution.get({id: vm.sectionQuestion.id}, function (data) {
                        deferred.resolve({distributed: data.distributed});
                    }, function (error) {
                        toastr.error(error.data);
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                var openExamQuestionEditor = function () {
                    getQuestionDistribution().then(function (data) {
                        if (!data.distributed) {
                            // If this is not distributed, treat it as a plain question (or at least trick the user to
                            // believe so)
                            openBaseQuestionEditor();
                        } else {
                            // Edit distributed question
                            var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {

                                $scope.lotteryOn = vm.lotteryOn;
                                $scope.fromDialog = true;
                                $scope.addEditQuestion = {};
                                $scope.addEditQuestion.id = 0;
                                $scope.addEditQuestion.showForm = true;

                                // Copy so we won't mess up the scope in case user cancels out in the middle of editing
                                $scope.sectionQuestion = angular.copy(vm.sectionQuestion);
                                $scope.addEditQuestion.id = $scope.sectionQuestion.question.id;
                                $scope.baseQuestionId = $scope.sectionQuestion.question.id;

                                $scope.submit = function (baseQuestion, examQuestion) {
                                    questionService.updateDistributedExamQuestion(baseQuestion, examQuestion).then(function (esq) {
                                        toastr.info($translate.instant('sitnet_question_saved'));
                                        $modalInstance.close(esq);
                                        window.onbeforeunload = null;
                                        $scope.addEditQuestion.id = null;
                                    });
                                };

                                $scope.cancelEdit = function () {
                                    $modalInstance.dismiss();
                                    $scope.addEditQuestion.id = null;
                                    window.onbeforeunload = null;
                                };

                                // Close modal if user clicked the back button and no changes made
                                $scope.$on('$routeChangeStart', function () {
                                    if (!window.onbeforeunload) {
                                        $modalInstance.dismiss();
                                    }
                                });

                            }];

                            var modalInstance = $modal.open({
                                templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/editor/dialog_edit_exam_question.html',
                                backdrop: 'static',
                                keyboard: true,
                                controller: ctrl,
                                windowClass: 'question-editor-modal'
                            });

                            modalInstance.result.then(function (data) {
                                if (data) {
                                    // apply changes back to scope
                                    angular.extend(vm.sectionQuestion, data);
                                }
                                modalInstance.dismiss();
                            });
                        }
                    });
                };


                var openBaseQuestionEditor = function () {
                    var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        $scope.lotteryOn = vm.lotteryOn;
                        // Edit base question
                        $scope.baseQuestionId = vm.sectionQuestion.question.id;

                        $scope.fromDialog = true;
                        $scope.addEditQuestion = {};
                        $scope.addEditQuestion.id = 0;
                        $scope.addEditQuestion.showForm = true;

                        var saveQuestion = function (baseQuestion) {
                            var errFn = function (error) {
                                toastr.error(error.data);
                            };

                            // Edit undistributed base question
                            questionService.updateQuestion(baseQuestion, true).then(function () {
                                // Reflect changes in base question to exam question as well
                                ExamSectionQuestionRes.undistributed.update({id: vm.sectionQuestion.id},
                                    function (esq) {
                                        angular.extend(vm.sectionQuestion, esq);
                                        $modalInstance.dismiss('done');
                                    }, errFn);
                            }, errFn);
                        };

                        $scope.submit = function (baseQuestion) {
                            saveQuestion(baseQuestion);
                            $scope.addEditQuestion.id = null;
                        };

                        $scope.cancelEdit = function () {
                            // Well this is nice now :)
                            $scope.addEditQuestion.id = null;
                            $modalInstance.dismiss('Cancelled');
                        };

                        // Close modal if user clicked the back button and no changes made
                        $scope.$on('$routeChangeStart', function () {
                            if (!window.onbeforeunload) {
                                $modalInstance.dismiss();
                            }
                        });

                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/editor/dialog_new_question.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        windowClass: 'question-editor-modal'
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        modalInstance.dismiss();
                    });
                };

            }]
    });
