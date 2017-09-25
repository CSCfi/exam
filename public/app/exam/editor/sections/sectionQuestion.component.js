'use strict';

angular.module('app.exam.editor')
    .component('sectionQuestion', {
        templateUrl: '/assets/app/exam/editor/sections/sectionQuestion.template.html',
        bindings: {
            sectionQuestion: '<',
            lotteryOn: '<',
            onDelete: '&'
        },
        controller: ['$sce', '$q', '$uibModal', '$translate', 'dialogs', 'Question', 'ExamQuestion', 'ExamRes',
            function ($sce, $q, $modal, $translate, dialogs, Question, ExamQuestion, ExamRes) {

                var vm = this;

                vm.calculateMaxPoints = function () {
                    return Question.calculateMaxPoints(vm.sectionQuestion);
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
                            openDistributedQuestionEditor();
                        }
                    });
                };

                var openBaseQuestionEditor = function () {
                    $modal.open({
                        component: 'baseQuestionEditor',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {lotteryOn: vm.lotteryOn, questionId: vm.sectionQuestion.question.id}
                    }).result.then(function (data) {
                        ExamQuestion.undistributionApi.update({id: vm.sectionQuestion.id},
                            function (esq) {
                                angular.extend(vm.sectionQuestion, esq);
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    });
                };

                var openDistributedQuestionEditor = function () {
                    $modal.open({
                        component: 'examQuestionEditor',
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        resolve: {
                            examQuestion: angular.copy(vm.sectionQuestion),
                            lotteryOn: vm.lotteryOn
                        }
                    }).result.then(function (data) {
                        Question.updateDistributedExamQuestion(data.question, data.examQuestion).then(
                            function (esq) {
                                toastr.info($translate.instant('sitnet_question_saved'));
                                // apply changes back to scope
                                angular.extend(vm.sectionQuestion, data.examQuestion);
                            });

                    });
                }


            }]
    });
