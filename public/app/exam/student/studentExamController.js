(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('StudentExamController', ['dialogs', '$rootScope', '$scope', '$filter', '$q', '$interval',
            '$routeParams', '$sce', '$http', '$modal', '$location', '$translate', '$timeout', 'EXAM_CONF',
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
                $scope.pages = ["guide"];
                $scope.previousButton = {};
                $scope.nextButton = {};

                window.onbeforeunload = function() {
                    return $translate.instant('sitnet_unsaved_data_may_be_lost');
                };

                var isPreview = function () {
                    return $location.path().match(/preview/) && $routeParams.id;
                };

                if (isPreview()) {
                    $scope.headerText = 'sitnet_exam_preview';
                } else {
                    $scope.guide = true;
                    $scope.hash = $routeParams.hash;
                }

                $scope.isPreview = function () {
                    return isPreview();
                };

                function cancelAutosavers() {
                    if ($scope.doexam) {
                        angular.forEach($scope.doexam.examSections, function (section) {
                            if (section.autosaver) {
                                $interval.cancel(section.autosaver);
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
                            return sectionQuestion.question.answered;
                        }).length;
                    } else if (type === 'unanswered') {
                        return section.sectionQuestions.length - section.sectionQuestions.filter(function (sectionQuestion) {
                                return sectionQuestion.question.answered;
                            }).length;
                    }
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                var getAutosaver = function () {
                    if (!$scope.guide) {
                        return $interval(function () {
                            if ($scope.activeSection && $scope.activeSection.sectionQuestions) {
                                angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                                    var question = sectionQuestion.question;
                                    if (question.type === "EssayQuestion" && question.answer && question.answer.answer.length > 0) {
                                        $scope.saveEssay(question, question.answer.answer, true);
                                    }
                                });
                            }
                        }, 1000 * 60);
                    }
                };

                var setSelections = function (question) {
                    if (question.answer) {
                        question.answer.options.forEach(function (ao) {
                            ao.selected = true;
                        });
                        var selectedFromAnswer = question.answer.options.map(function (ao) {
                            return ao.id;
                        });
                        var selectedFromQuestion = question.options.filter(function (qo) {
                            return selectedFromAnswer.indexOf(qo.id) > -1;
                        });
                        question.selectedOptions = selectedFromQuestion.map(function (o) {
                            return o.id;
                        });
                    }
                };

                $scope.doExam = function () {
                    var url = isPreview() ? '/exampreview/' + $routeParams.id : '/student/doexam/' + $routeParams.hash;
                    $http.get(url)
                        .success(function (data) {
                            $scope.doexam = data;
                            if (data.cloned) {
                                // we came here with a reference to the parent exam so do not render page just yet,
                                // reload with reference to student exam that we just created
                                $location.path('/student/doexam/' + data.hash);
                                return;
                            }
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // set sections and question numbering
                            angular.forEach($scope.doexam.examSections, function (section, index) {
                                section.index = index + 1;
                                $scope.pages.push(section.name);
                            });

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                                var question = sectionQuestion.question;
                                var template = "";
                                switch (question.type) {
                                    case "MultipleChoiceQuestion":
                                        setSelections(question);
                                        template = $scope.multipleChoiceOptionTemplate;
                                        break;
                                    case "WeightedMultipleChoiceQuestion":
                                        setSelections(question);
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
                                examService.setQuestionColors(question);
                            });

                            if (!isPreview()) {
                                $http.get('/examenrolmentroom/' + $scope.doexam.id)
                                    .success(function (data) {
                                        $scope.info = data;
                                        $scope.currentLanguageText = currentLanguage();
                                    });
                                startClock();
                                $scope.activeSection.autosaver = getAutosaver();
                            }
                            if ($scope.doexam.instruction && $scope.doexam.instruction.length > 0) {
                                $scope.setActiveSection("guide");
                            } else if (!isPreview()) {
                                $scope.pages.splice(0, 1);
                                $scope.setActiveSection($scope.pages[0]);
                                $scope.activeSection.autosaver = getAutosaver();
                            }
                        }).
                    error(function () {
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
                    $scope.doExam();
                }

                $scope.setNextSection = function () {
                    if ($scope.guide) {
                        $scope.setActiveSection($scope.pages[1]);
                    } else {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.name) + 1]);
                    }
                };

                $scope.setPreviousSection = function () {
                    if (!$scope.guide) {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.name) - 1]);
                    }
                };

                $scope.setActiveSection = function (sectionName) {
                    if (!isPreview() && $scope.activeSection && !$scope.guide) {
                        saveAllEssaysOfSection($scope.activeSection);
                    }
                    if (sectionName !== "guide" || ($scope.doexam.instruction && $scope.doexam.instruction.length > 0 && sectionName === "guide")) {
                        // next
                        if ($scope.pages[$scope.pages.indexOf(sectionName) + 1]) {
                            $scope.nextButton = {
                                valid: true,
                                text: $scope.pages[$scope.pages.indexOf(sectionName) + 1]
                            };
                        } else {
                            $scope.nextButton = {valid: false};
                        }
                        // previous
                        if ($scope.pages[$scope.pages.indexOf(sectionName) - 1]) {
                            $scope.previousButton = {valid: true};
                            if ($scope.pages.indexOf(sectionName) - 1 >= 0 && sectionName !== "guide") {
                                var name = $scope.pages[$scope.pages.indexOf(sectionName) - 1];
                                if (name === 'guide') {
                                    $scope.previousButton.isGuide = true;
                                    name = $translate.instant("sitnet_exam_guide");
                                }
                                $scope.previousButton.text = name;
                            } else {
                                $scope.previousButton.isGuide = true;
                                $scope.previousButton.text = $translate.instant("sitnet_exam_guide");
                            }
                        } else {
                            $scope.previousButton = {valid: false};
                        }
                    } else {
                        $scope.guide = true;
                        $scope.nextButton = {valid: true, text: $scope.pages[1]};
                        $scope.previousButton = {valid: false};
                    }

                    delete $scope.activeSection;
                    if (sectionName === "guide") {
                        $scope.guide = true;
                    } else {
                        $scope.guide = false;

                        angular.forEach($scope.doexam.examSections, function (section, index) {
                            if (sectionName === section.name) {
                                $scope.activeSection = section;
                            }
                        });
                    }

                    if ($scope.activeSection) {
                        // Loop through all questions in the active section
                        angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                            var question = sectionQuestion.question;
                            var template = "";
                            switch (question.type) {
                                case "MultipleChoiceQuestion":
                                    setSelections(question);
                                    template = $scope.multipleChoiceOptionTemplate;
                                    break;
                                case "WeightedMultipleChoiceQuestion":
                                    setSelections(question);
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
                            examService.setQuestionColors(question);
                        });
                        cancelAutosavers();
                        if (!isPreview()) {
                            $scope.activeSection.autosaver = getAutosaver();
                        }
                    }
                    window.scrollTo(0, 0);
                };

                $scope.getUser = function () {
                    var user = sessionService.getUser();
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

                $scope.multiOptionSelected = function (doexam, question) {
                    var ids = [];
                    var boxes = angular.element(".optionBox");
                    angular.forEach(boxes, function (input) {
                        if (angular.element(input).prop("checked")) {
                            ids.push(angular.element(input).val());
                        }
                    });
                    if (!isPreview()) {
                        StudentExamRes.multipleChoiceAnswer.saveMultipleChoice({
                                hash: doexam.hash,
                                qid: question.id,
                                oids: ids.join() || 'none'
                            },
                            function (updated_answer) {
                                question.answer = updated_answer;
                                question.answer.options.forEach(function (o) {
                                    o.selected = true;
                                });
                                toastr.info($translate.instant('sitnet_answer_saved'));
                                examService.setQuestionColors(question);
                            }, function (error) {

                            });
                    } else {
                        question.answer = {
                            options: angular.copy(question.options.filter(function (option) {
                                return option.selected;
                            }))
                        };
                        examService.setQuestionColors(question);
                    }

                };

                $scope.optionSelected = function (doexam, question) {
                    if (!isPreview()) {
                        StudentExamRes.multipleChoiceAnswer.saveMultipleChoice({
                                hash: doexam.hash,
                                qid: question.id,
                                oids: Array.isArray(question.selectedOptions) ?
                                    question.selectedOptions.join() : question.selectedOptions
                            },
                            function (updated_answer) {
                                question.answer = updated_answer;
                                question.answer.options.forEach(function (o) {
                                    o.selected = true;
                                });
                                toastr.info($translate.instant('sitnet_answer_saved'));
                                examService.setQuestionColors(question);
                            }, function (error) {

                            });
                    } else {
                        question.answer = {
                            options: angular.copy(question.options.filter(function (option) {
                                return option.selected;
                            }))
                        };
                        examService.setQuestionColors(question);
                    }
                };

                $scope.chevronClicked = function (sectionQuestion) {
                    sectionQuestion.question.expanded = !sectionQuestion.question.expanded;
                };

                $scope.truncate = function (content, offset) {
                    return $filter('truncate')(content, offset);
                };

                $scope.saveEssay = function (question, answer, autosave) {
                    question.questionStatus = $translate.instant("sitnet_answer_saved");

                    if (isPreview()) {
                        examService.setQuestionColors(question);
                    } else {
                        var deferred = $q.defer();
                        var params = {
                            hash: $scope.doexam.hash,
                            qid: question.id
                        };
                        var msg = {
                            answer: answer,
                            objectVersion: question.answer ? question.answer.objectVersion : undefined
                        };
                        StudentExamRes.essayAnswer.saveEssay(params, msg,
                            function (answer) {
                                if (autosave) {
                                    question.autosaved = new Date();
                                } else {
                                    toastr.info($translate.instant("sitnet_answer_saved"));
                                    examService.setQuestionColors(question);
                                }
                                question.answer.objectVersion = answer.objectVersion;
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
                        if (question.type === "EssayQuestion" && question.answer && question.answer.answer.length > 0) {
                            promises.push($scope.saveEssay(question, question.answer.answer, true));
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
                    $scope.doexam.examSections.forEach(function (section) {
                        section.sectionQuestions.filter(function (sq) {
                            return sq.question.type === "EssayQuestion" && sq.question.answer &&
                                sq.question.answer.answer.length > 0;
                        }).map(function (sq) {
                            return sq.question;
                        }).forEach(function (question) {
                            promises.push($scope.saveEssay(question, question.answer.answer, true));
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
                    if ($scope.doexam && $scope.doexam.id) {
                        var req = $http.get('/time/' + $scope.doexam.id);
                        req.success(function (reply) {
                            $scope.timeChecked = true;
                            $scope.remainingTime = parseInt(reply);
                        });
                    }
                };

                var logout = function(msg) {
                    StudentExamRes.exams.update({hash: $scope.doexam.hash}, function () {
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
                $scope.saveExam = function (doexam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_turn_exam'));
                    dialog.result.then(function () {
                        saveAllEssays().then(function () {
                            logout('sitnet_exam_returned');
                        });
                    });
                };

                // Called when the abort button is clicked
                $scope.abortExam = function (doexam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_abort_exam'));
                    dialog.result.then(function (btn) {
                        StudentExamRes.exam.abort({hash: doexam.hash}, {data: doexam}, function () {
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
                            return sq.question.type === "EssayQuestion" && sq.question.answer &&
                                sq.question.answer.answer.length > 0;
                        }).map(function (sq) {
                            return sq.question;
                        }).forEach(function (question) {
                            promises.push($scope.saveEssay(question, question.answer.answer));
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
                    if ($scope.doexam) {
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

                    var ctrl = ["$scope", "$modalInstance", function ($scope, $modalInstance) {

                        $scope.question = question;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });


                        $scope.submit = function () {
                            fileService.uploadAnswerAttachment("attachment/question/answer", $scope.attachmentFile,
                                {
                                    questionId: $scope.question.id,
                                    answerId: $scope.question.answer.id
                                }, $scope.question.answer, $modalInstance);
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
                        $location.path('/student/doexam/' + $routeParams.hash);
                    }, function () {
                        // Cancel button
                    });
                };

            }]);
}());
