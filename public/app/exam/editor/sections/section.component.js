'use strict';

angular.module('app.exam.editor')
    .component('section', {
        templateUrl: '/assets/app/exam/editor/sections/section.template.html',
        bindings: {
            section: '<',
            examId: '<',
            onDelete: '&',
            onReloadRequired: '&' // TODO: try to live without this callback?
        },
        controller: ['$translate', '$uibModal', 'dialogs', 'ExamRes', 'examService', 'questionService', 'EXAM_CONF',
            function ($translate, $modal, dialogs, ExamRes, examService, questionService, EXAM_CONF) {

                var vm = this;

                vm.clearAllQuestions = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_all_questions'));
                    dialog.result.then(function () {
                        ExamRes.clearsection.clear({eid: vm.examId, sid: vm.section.id}, function () {
                            vm.section.sectionQuestions.splice(0, vm.section.sectionQuestions.length);
                            vm.section.lotteryOn = false;
                            toastr.info($translate.instant('sitnet_all_questions_removed'));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                vm.removeSection = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_section'));
                    dialog.result.then(function () {
                        vm.onDelete({section: vm.section});
                    });
                };

                vm.renameSection = function () {
                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                        function (sec) {
                            //vm.section = sec;
                            toastr.info($translate.instant('sitnet_section_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                vm.toggleLottery = function () {
                    if (vm.toggleDisabled()) {
                        vm.section.lotteryOn = false;
                        return;
                    }

                    if (!questionPointsMatch()) {
                        toastr.error($translate.instant('sitnet_error_lottery_points_not_match'));
                        vm.section.lotteryOn = false;
                        return;
                    }

                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                        function (sec) {
                            //vm.section = sec;
                            if (angular.isUndefined(vm.section.lotteryItemCount)) {
                                vm.section.lotteryItemCount = 1;
                            }
                            toastr.info($translate.instant('sitnet_section_updated'));
                        }, function (error) {
                            toastr.error(error.data);
                        });
                };

                vm.toggleDisabled = function () {
                    return !vm.section.sectionQuestions || vm.section.sectionQuestions.length < 2;
                };

                vm.updateLotteryCount = function () {
                    if (!vm.section.lotteryItemCount) {
                        toastr.warning($translate.instant('sitnet_warn_lottery_count'));
                        vm.section.lotteryItemCount = 1;
                    }
                    else {
                        ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section),
                            function (sec) {
                                //vm.section = sec;
                                toastr.info($translate.instant('sitnet_section_updated'));
                            }, function (error) {
                                toastr.error(error.data);
                            });
                    }
                };

                vm.expandSection = function () {
                    ExamRes.sections.update({eid: vm.examId, sid: vm.section.id}, getSectionPayload(vm.section));
                };

                vm.moveQuestion = function (from, to) {
                    if (from >= 0 && to >= 0 && from !== to) {
                        ExamRes.questionOrder.update({
                            eid: vm.examId,
                            sid: vm.section.id,
                            from: from,
                            to: to
                        }, function () {
                            toastr.info($translate.instant('sitnet_questions_reordered'));
                        });
                    }
                };

                vm.addNewQuestion = function () {
                    if (vm.section.lotteryOn) {
                        toastr.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        return;
                    }
                    openBaseQuestionEditor();
                };

                vm.removeQuestion = function (sectionQuestion) {
                    ExamRes.questions.remove({
                        eid: vm.examId,
                        sid: vm.section.id,
                        qid: sectionQuestion.question.id
                    }, function () {
                        // CHECK THE SPLICING
                        vm.section.sectionQuestions.splice(vm.section.sectionQuestions.indexOf(sectionQuestion), 1);
                        toastr.info($translate.instant('sitnet_question_removed'));
                        if (vm.section.sectionQuestions.length < 2 && vm.section.lotteryOn) {
                            // turn off lottery
                            vm.section.lotteryOn = false;
                            vm.section.lotteryItemCount = 1;
                            ExamRes.sections.update({
                                eid: vm.examId,
                                sid: vm.section.id
                            }, getSectionPayload(vm.section));
                        }
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };


                vm.openLibrary = function () {

                    if (vm.section.lotteryOn) {
                        toastr.error($translate.instant('sitnet_error_drop_disabled_lottery_on'));
                        return;
                    }
                    var examId = vm.examId;
                    var sectionId = vm.section.id;

                    var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {

                        $scope.addQuestions = function () {

                            // check that at least one has been selected
                            var isEmpty = true,
                                boxes = angular.element('.questionToUpdate'),
                                ids = [];

                            var insertQuestion = function (sectionId, questionIds, to, examId) {

                                var sectionQuestions = questionIds.map(function (question) {
                                    return question;
                                }).join(',');

                                ExamRes.sectionquestionsmultiple.insert({
                                        eid: examId,
                                        sid: sectionId,
                                        seq: to,
                                        questions: sectionQuestions
                                    }, function (sec) {
                                        toastr.info($translate.instant('sitnet_question_added'));
                                        $modalInstance.close();
                                    }, function (error) {
                                        toastr.error(error.data);
                                        // remove broken objects
                                        vm.section.sectionQuestions = vm.section.sectionQuestions.filter(function (sq) {
                                            return sq;
                                        });
                                    }
                                );

                            };

                            // calculate the new order number for question sequence
                            // always add question to last spot, because dragndrop
                            // is not in use here
                            var to = (parseInt(vm.section.sectionQuestions.length) + 1);

                            angular.forEach(boxes, function (input) {
                                if (angular.element(input).prop('checked')) {
                                    isEmpty = false;
                                    ids.push(angular.element(input).val());
                                }
                            });

                            if (isEmpty) {
                                toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                            }
                            else {
                                insertQuestion(sectionId, ids, to, examId);
                                //  $modalInstance.dismiss("Saved");
                            }
                        };

                        $scope.cancelEdit = function () {
                            // Well this is nice now :)
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
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'question/library.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        windowClass: 'question-editor-modal'
                    });

                    modalInstance.result.then(function () {
                        // TODO: see if we could live without reloading the whole exam from back?
                        vm.onReloadRequired();
                    });

                };


                function questionPointsMatch() {
                    if (!vm.section.sectionQuestions) {
                        return true;
                    }
                    var sectionQuestions = vm.section.sectionQuestions;
                    if (sectionQuestions.length < 1) {
                        return true;
                    }
                    var score = getQuestionScore(sectionQuestions[0]);
                    return sectionQuestions.every(function (sectionQuestion) {
                        return score === getQuestionScore(sectionQuestion);
                    });
                }

                function getQuestionScore(question) {
                    var evaluationType = question.evaluationType;
                    var type = question.question.type;
                    if (evaluationType === 'Points' || type === 'MultipleChoiceQuestion' || type === 'ClozeTestQuestion') {
                        return question.maxScore;
                    }
                    if (type === 'WeightedMultipleChoiceQuestion') {
                        return questionService.calculateMaxPoints(question);
                    }
                    return null;
                }

                var getSectionPayload = function (section) {
                    return {
                        id: section.id,
                        name: section.name,
                        lotteryOn: section.lotteryOn,
                        lotteryItemCount: section.lotteryItemCount,
                        description: section.description,
                        expanded: section.expanded
                    };
                };

                var insertExamQuestion = function (examId, sectionId, questionId, sequenceNumber, modal) {
                    ExamRes.sectionquestions.insert({
                            eid: examId,
                            sid: sectionId,
                            seq: sequenceNumber,
                            qid: questionId
                        }, function () {
                            modal.dismiss('done');
                            vm.onReloadRequired(); // TODO: see if we could live without reloading the whole exam from back?
                        }, function (error) {
                            toastr.error(error.data);
                        }
                    );
                };


                var openBaseQuestionEditor = function () {
                    var ctrl = ['$scope', '$uibModalInstance', function ($scope, $modalInstance) {
                        $scope.lotteryOn = vm.section.lotteryOn;
                        $scope.fromDialog = true;
                        $scope.addEditQuestion = {};
                        $scope.addEditQuestion.id = 0;
                        $scope.addEditQuestion.showForm = true;

                        var saveQuestion = function (baseQuestion) {
                            var errFn = function (error) {
                                toastr.error(error.data);
                            };
                            // Create new base question
                            questionService.createQuestion(baseQuestion).then(function (newQuestion) {
                                // Now that new base question was created we make an exam section question out of it
                                insertExamQuestion(vm.examId, vm.section.id, newQuestion.id,
                                    vm.section.sectionQuestions.length, $modalInstance, true);
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
