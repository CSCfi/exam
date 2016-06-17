(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('StudentExamController', ['dialogs', '$rootScope', '$scope', '$filter', '$q', '$interval',
            '$routeParams', '$sce', '$http', '$uibModal', '$location', '$translate', '$timeout', 'EXAM_CONF',
            'StudentExamRes', 'dateService', 'examService', 'questionService', 'fileService', 'sessionService',
            'enrolmentService',
            function (dialogs, $rootScope, $scope, $filter, $q, $interval, $routeParams, $sce, $http, $modal, $location,
                      $translate, $timeout, EXAM_CONF, StudentExamRes, dateService, examService, questionService,
                      fileService, sessionService, enrolmentService) {

                $scope.sectionsBar = EXAM_CONF.TEMPLATES_PATH + "exam/student/student_sections_bar.html";
                $scope.multipleChoiceOptionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/student/multiple_choice_option.html";
                $scope.weightedMultipleChoiceOptionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/student/weighted_multiple_choice_option.html";
                $scope.essayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "question/student/essay_question.html";
                $scope.sectionTemplate = EXAM_CONF.TEMPLATES_PATH + "exam/student/section_template.html";

                // section back / forward buttons
                $scope.pages = [];
                $scope.previousButton = {};
                $scope.nextButton = {};

                var isPreview = function () {
                    return $location.path().match(/preview/) && $routeParams.id;
                };

                if (isPreview()) {
                    $scope.headerText = 'sitnet_exam_preview';
                } else {
                    $scope.guide = true;
                    $scope.hash = $routeParams.hash;
                    window.onbeforeunload = function () {
                        return $translate.instant('sitnet_unsaved_data_may_be_lost');
                    };
                }

                $scope.isPreview = function () {
                    return isPreview();
                };

                function cancelAutosavers() {
                    if ($scope.exam) {
                        angular.forEach($scope.exam.examSections, function (section) {
                            if (section.autosaver) {
                                $interval.cancel(section.autosaver);
                                delete section.autosaver;
                            }
                        });
                    }
                }

                $scope.$on('$destroy', function () {
                    cancelAutosavers();
                });

                $scope.getQuestionAmount = function (section, type) {
                    if (type === 'total') {
                        return section.sectionQuestions.length;
                    } else if (type === 'answered') {
                        return section.sectionQuestions.filter(function (sectionQuestion) {
                            return sectionQuestion.answered;
                        }).length;
                    } else if (type === 'unanswered') {
                        return section.sectionQuestions.length - section.sectionQuestions.filter(function (sectionQuestion) {
                                return sectionQuestion.answered;
                            }).length;
                    }
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                var getAutosaver = function () {
                    return $interval(function () {
                        if ($scope.activeSection && $scope.activeSection.sectionQuestions) {
                            angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                                var question = sectionQuestion.question;
                                var essayAnswer = sectionQuestion.essayAnswer;
                                if (question.type === "EssayQuestion" && essayAnswer && essayAnswer.answer.length > 0) {
                                    $scope.saveEssay(sectionQuestion, true);
                                }
                            });
                        }
                    }, 1000 * 60);
                };

                var setSelection = function (question) {
                    var answered = question.options.filter(function (o) {
                        return o.answered;
                    });
                    if (answered.length > 1) {
                        console.warn("several answered options for mcq");
                    }
                    if (answered.length == 1) {
                        question.selectedOption = answered[0].id;
                    }
                };

                function createActiveSectionQuestions() {
                    if (!$scope.activeSection) {
                        return;
                    }

                    // Loop through all questions in the active section
                    angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        var template = "";
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                setSelection(sectionQuestion);
                                template = $scope.multipleChoiceOptionTemplate;
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                template = $scope.weightedMultipleChoiceOptionTemplate;
                                break;
                            case "EssayQuestion":
                                template = $scope.essayQuestionTemplate;
                                break;
                            default:
                                template = "fa-question-circle";
                                break;
                        }
                        question.template = template;
                        question.expanded = false;
                        examService.setQuestionColors(sectionQuestion);
                    });
                }

                $scope.startExam = function () {
                    var request = isPreview() ? $http.get : $http.post;
                    var url = '/app' + (
                            isPreview() ? '/exampreview/' + $routeParams.id : '/student/exam/' + $routeParams.hash
                        );
                    request(url)
                        .success(function (data) {
                            if (data.cloned) {
                                // we came here with a reference to the parent exam so do not render page just yet,
                                // reload with reference to student exam that we just created
                                $location.path('/student/doexam/' + data.hash);
                                return;
                            }
                            data.examSections.sort(function (a, b) {
                                return a.sequenceNumber - b.sequenceNumber;
                            });
                            $scope.exam = data;
                            if ($scope.exam.instruction && $scope.exam.instruction.length > 0) {
                                // Add guide page
                                $scope.pages.push('guide');
                            }
                            // set sections and question numbering
                            angular.forEach($scope.exam.examSections, function (section, index) {
                                section.index = index + 1;
                                $scope.pages.push(section.id);
                            });

                            $scope.setActiveSection($scope.pages[0]);

                            createActiveSectionQuestions();

                            if (!isPreview()) {
                                $http.get('/app/enroll/room/' + $scope.exam.id)
                                    .success(function (data) {
                                        $scope.info = data;
                                        $scope.currentLanguageText = currentLanguage();
                                    });
                                startClock();
                            }
                        }).error(function () {
                        $location.path("/");
                    });
                };

                $rootScope.$on('$translateChangeSuccess', function () {
                    $scope.currentLanguageText = currentLanguage();
                    if ($scope.previousButton.isGuide) {
                        $scope.previousButton.text = $translate.instant('sitnet_exam_guide');
                    }
                });

                function currentLanguage() {
                    var tmp = "";

                    if ($scope.info &&
                        $scope.info.reservation &&
                        $scope.info.reservation.machine &&
                        $scope.info.reservation.machine.room) {

                        switch ($translate.use()) {
                            case "fi":
                                if ($scope.info.reservation.machine.room.roomInstruction) {
                                    tmp = $scope.info.reservation.machine.room.roomInstruction;
                                }
                                break;
                            case "sv":
                                if ($scope.info.reservation.machine.room.roomInstructionSV) {
                                    tmp = $scope.info.reservation.machine.room.roomInstructionSV;
                                }
                                break;
                            case "en":
                            /* falls through */
                            default:
                                if ($scope.info.reservation.machine.room.roomInstructionEN) {
                                    tmp = $scope.info.reservation.machine.room.roomInstructionEN;
                                }
                                break;
                        }
                    }
                    return tmp;
                }


                // if id -> preview
                if ($routeParams.hash || isPreview()) {
                    $scope.startExam();
                }

                $scope.setNextSection = function () {
                    if ($scope.guide) {
                        $scope.setActiveSection($scope.pages[1]);
                    } else {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.id) + 1]);
                    }
                };

                $scope.setPreviousSection = function () {
                    if (!$scope.guide) {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.id) - 1]);
                    }
                };

                function findSection(sectionId) {
                    return $scope.exam.examSections.find(function (section) {
                        return sectionId === section.id;
                    });
                }

                function setNextButton(sectionId) {
                    var nextPage = $scope.pages[$scope.pages.indexOf(sectionId) + 1];
                    if (!nextPage) {
                        $scope.nextButton = {valid: false};
                        return;
                    }
                    $scope.nextButton = {
                        valid: true,
                        text: findSection(nextPage).name
                    };
                }

                function setPreviousButton(sectionId) {
                    var previousPage = $scope.pages[$scope.pages.indexOf(sectionId) - 1];
                    if (!previousPage) {
                        $scope.previousButton = {valid: false};
                        return;
                    }
                    $scope.previousButton = {valid: true};
                    if (previousPage !== 'guide') {
                        $scope.previousButton.text = findSection(sectionId).name;
                        return;
                    }
                    $scope.previousButton.isGuide = true;
                    $scope.previousButton.text = $translate.instant("sitnet_exam_guide");
                }

                $scope.setActiveSection = function (sectionId) {
                    if (!isPreview() && $scope.activeSection && !$scope.guide) {
                        saveAllEssaysOfSection($scope.activeSection);
                    }
                    // next
                    setNextButton(sectionId);
                    // previous
                    setPreviousButton(sectionId);

                    delete $scope.activeSection;
                    if (sectionId === "guide") {
                        $scope.guide = true;
                    } else {
                        $scope.guide = false;
                        $scope.activeSection = findSection(sectionId);
                        createActiveSectionQuestions();
                        cancelAutosavers();
                        if (!isPreview()) {
                            $scope.activeSection.autosaver = getAutosaver();
                        }
                    }
                    window.scrollTo(0, 0);
                };

                $scope.calculateMaxPointsOfWeightedMcq = function (question) {
                    return question.derivedMaxScore;
                };

                $scope.getUser = function () {
                    var user = sessionService.getUser();
                    if (!user) {
                        return;
                    }
                    var userNo = user.userNo ? ' (' + user.userNo + ')' : '';
                    return user.firstname + " " + user.lastname + userNo;
                };

                // Called when the exit button is clicked
                $scope.exitPreview = function () {
                    $location.path("/exams/" + $routeParams.id);
                };

                $scope.showMaturityInstructions = function (exam) {
                    enrolmentService.showMaturityInstructions({exam: exam});
                };

                $scope.multiOptionSelected = function (exam, question) {
                    var ids;
                    if (question.question.type === 'WeightedMultipleChoiceQuestion') {
                        ids = question.options.filter(function (o) {
                            return o.answered;
                        }).map(function (o) {
                            return o.id;
                        });
                    } else {
                        ids = [question.selectedOption];
                    }

                    if (!isPreview()) {
                        StudentExamRes.multipleChoiceAnswer.saveMultipleChoice({
                                hash: exam.hash,
                                qid: question.id,
                                oids: ids
                            },
                            function (options) {
                                toastr.info($translate.instant('sitnet_answer_saved'));
                                question.options = options;
                                examService.setQuestionColors(question);
                            }, function (error) {

                            });
                    } else {
                        examService.setQuestionColors(question);
                    }

                };

                $scope.chevronClicked = function (sectionQuestion) {
                    sectionQuestion.expanded = !sectionQuestion.expanded;
                };

                $scope.truncate = function (content, offset) {
                    return $filter('truncate')(content, offset);
                };

                $scope.saveEssay = function (question, autosave) {
                    question.questionStatus = $translate.instant("sitnet_answer_saved");

                    if (isPreview()) {
                        examService.setQuestionColors(question);
                    } else {
                        var deferred = $q.defer();
                        var params = {
                            hash: $scope.exam.hash,
                            qid: question.id
                        };
                        var msg = {
                            answer: question.essayAnswer.answer,
                            objectVersion: question.essayAnswer ? question.essayAnswer.objectVersion : undefined
                        };
                        StudentExamRes.essayAnswer.saveEssay(params, msg,
                            function (answer) {
                                if (autosave) {
                                    question.autosaved = new Date();
                                } else {
                                    toastr.info($translate.instant("sitnet_answer_saved"));
                                    examService.setQuestionColors(question);
                                }
                                question.essayAnswer.objectVersion = answer.objectVersion;
                                deferred.resolve();
                            }, function (error) {
                                toastr.error(error.data);
                                deferred.reject();
                            });
                        return deferred.promise;
                    }
                };

                var saveAllEssaysOfSection = function (section) {
                    var deferred = $q.defer();
                    var promises = [];
                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        var essayAnswer = sectionQuestion.essayAnswer;
                        if (question.type === "EssayQuestion" && essayAnswer && essayAnswer.answer.length > 0) {
                            promises.push($scope.saveEssay(sectionQuestion, true));
                        }
                    });
                    $q.all(promises).then(function () {
                        deferred.resolve();
                    });
                    return deferred.promise;
                };

                var saveAllEssays = function () {
                    var deferred = $q.defer();
                    var promises = [];
                    $scope.exam.examSections.forEach(function (section) {
                        section.sectionQuestions.filter(function (sq) {
                            var essayAnswer = sq.essayAnswer;
                            return sq.question.type === "EssayQuestion" && essayAnswer &&
                                essayAnswer.answer.length > 0;
                        }).forEach(function (sq) {
                            promises.push($scope.saveEssay(sq, true));
                        });
                    });
                    $q.all(promises).then(function () {
                        deferred.resolve();
                    });
                    return deferred.promise;
                };


                function zeropad(n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                }

                $scope.formatRemainingTime = function (time) {
                    if (time <= 0) {
                        updateInterval = 30;
                        return '';
                    }
                    var hours = Math.floor(time / 60 / 60);
                    var minutes = Math.floor(time / 60) % 60;
                    var seconds = time % 60;
                    return hours + ":" + zeropad(minutes) + ":" + zeropad(seconds);
                };

                $scope.alarmLine = 300; //if under this, red text. in seconds -> set to 5 minutes

                $scope.timeChecked = false;
                var getRemainingTime = function () {
                    if ($scope.exam && $scope.exam.id) {
                        var req = $http.get('/app/time/' + $scope.exam.id);
                        req.success(function (reply) {
                            $scope.timeChecked = true;
                            $scope.remainingTime = parseInt(reply);
                        });
                    }
                };

                var logout = function (msg) {
                    StudentExamRes.exams.update({hash: $scope.exam.hash}, function () {
                        toastr.info($translate.instant(msg), {timeOut: 5000});
                        $timeout.cancel($scope.remainingTimePoller);
                        cancelAutosavers();
                        window.onbeforeunload = null;
                        $location.path("/student/logout/finished");
                    }, function (error) {
                        toastr.error($translate.instant(error));
                    });
                };

                // Called when the save and exit button is clicked
                $scope.saveExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_turn_exam'));
                    dialog.result.then(function () {
                        saveAllEssays().then(function () {
                            logout('sitnet_exam_returned');
                        });
                    });
                };

                // Called when the abort button is clicked
                $scope.abortExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_abort_exam'));
                    dialog.result.then(function (btn) {
                        StudentExamRes.exam.abort({hash: exam.hash}, {data: exam}, function () {
                            toastr.info($translate.instant('sitnet_exam_aborted'), {timeOut: 5000});
                            $timeout.cancel($scope.remainingTimePoller);
                            cancelAutosavers();
                            window.onbeforeunload = null;
                            $location.path("/student/logout/aborted");
                        });
                    });
                };

                function onTimeout() {
                    // Loop through all essay questions in the active section
                    var promises = [];
                    if (!$scope.guide) {
                        $scope.activeSection.sectionQuestions.filter(function (sq) {
                            var essayAnswer = sq.essayAnswer;
                            return sq.question.type === "EssayQuestion" && essayAnswer &&
                                essayAnswer.answer.length > 0;
                        }).forEach(function (question) {
                            promises.push($scope.saveEssay(question));
                        });
                        // Finally turn the exam (regardless of whether every essay saved successfully) and logout
                        $q.allSettled(promises).then(function () {
                            logout("sitnet_exam_time_is_up");
                        });
                    } else {
                        logout("sitnet_exam_time_is_up");
                    }
                }

                $scope.remainingTime = "";
                var updateCheck = 15;
                var updateInterval = 0;
                var startClock = function () {
                    if ($scope.exam) {
                        updateInterval++;

                        $scope.remainingTimePoller = $timeout(startClock, 1000);

                        if (updateInterval >= updateCheck) {
                            updateInterval = 0;
                            getRemainingTime();
                        } else {
                            $scope.remainingTime--;
                        }
                        if ($scope.timeChecked === true && $scope.remainingTime < 0) {
                            onTimeout();
                        }
                    }
                };

                if (!isPreview()) {
                    // start the clock
                    startClock();
                }

                $scope.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                $scope.selectFile = function (question) {
                    if (isPreview()) {
                        return;
                    }

                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {

                        $scope.question = question;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });


                        $scope.submit = function () {
                            fileService.uploadAnswerAttachment("/app/attachment/question/answer", $scope.attachmentFile,
                                {
                                    questionId: $scope.question.id,
                                    answerId: $scope.question.essayAnswer.id
                                }, $scope.question.essayAnswer, $modalInstance);
                        };

                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };

                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        resolve: {
                            question: function () {
                                return $scope.question;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        $location.path('/student/exam/' + $routeParams.hash);
                    }, function () {
                        // Cancel button
                    });
                };

            }]);
}());
