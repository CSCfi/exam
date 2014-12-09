(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$rootScope', '$scope', '$interval', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'StudentExamRes', 'QuestionRes',
            function ($rootScope, $scope, $interval, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, StudentExamRes, QuestionRes) {

                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "student/student_sections_bar.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";

//                $scope.exams = StudentExamRes.exams.query();
                $scope.tempQuestion = null;

//                $scope.autoSaver = $interval(function(){
//
//                    find all Essay questions
//                    loop and save all Essay answers
//
//
//                }, 10000)

                // section back / forward buttons
                $scope.guide = false;
                $scope.switchToGuide = function (b) {
                    if ($scope.doexam.instruction && $scope.doexam.instruction.length > 0) {
                        $scope.guide = b;
                    } else {
                        $scope.guide = false;
                    }
                };
                $scope.previousButton = false;
                $scope.previousButtonText = "";

                $scope.nextButton = false;
                $scope.nextButtonText = "";

                $scope.hash = $routeParams.hash;

                $scope.reload = function () {
                    $scope.doExam($routeParams.hash);
                };

                $scope.switchButtons = function (section) {

                    var i = section.index - 1;

                    if ($scope.doexam.examSections[i - 1]) {
                        $scope.previousButton = true;
                        $scope.previousButtonText = $scope.doexam.examSections[i - 1].index + ". " + $scope.doexam.examSections[i - 1].name;
                    } else {
                        if ($scope.doexam.instruction && $scope.doexam.instruction.length > 0) {
                            $scope.previousButton = true;
                            $scope.previousButtonText = $translate("sitnet_exam_quide");
                        } else {
                            $scope.previousButton = false;
                        }
                    }

                    if (i == 0 && $scope.guide) {
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.doexam.examSections[0].index + ". " + $scope.doexam.examSections[0].name;
                    } else if (!$scope.guide && $scope.doexam.examSections[i + 1]) {

                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.doexam.examSections[i + 1].index + ". " + $scope.doexam.examSections[i + 1].name;
                    } else {
                        if ($scope.doexam.examSections[i + 1]) {
                            $scope.nextButton = true;
                            $scope.nextButtonText = $scope.doexam.examSections[i + 1].index + ". " + $scope.doexam.examSections[i + 1].name;
                        } else {
                            $scope.nextButton = false;
                        }
                    }

                };

                /**
                 *
                 * @param section examsection
                 * @param type "answered" or "open"
                 */
                $scope.getQuestionAmount = function (section, type) {
                    var i = 0;
                    if (type === 'answered') {
                        angular.forEach(section.questions, function (question) {
                            if (question.answered) {
                                i = i + 1;
                            }
                        });
                    }
                    if (type === 'open') {
                        angular.forEach(section.questions, function (question) {
                            if (!question.answered) {
                                i = i + 1;
                            }
                        });
                    }
                    return i;
                };

                $scope.printExamDuration = function (exam) {

                    if (exam && exam.duration) {
                        var h = 0;
                        var d = exam.duration;

                        while (d > 0) {
                            if (d - 60 >= 0) {
                                h++;
                                d = d - 60;
                            } else {
                                break;
                            }
                        }
                        if (h === 0) {
                            return d + "min";
                        } else if (d === 0) {
                            return h + "h ";
                        } else {
                            return h + "h " + d + "min";
                        }
                    } else {
                        return "";
                    }
                };

                function sortAscByIds(a,b) {
                    return parseInt(b.id) - parseInt(a.id);
                }

                function sortDescByIds(a,b) {
                    return parseInt(a.id) - parseInt(b.id);
                }

                $scope.doExam = function (hash) {
                    $http.get('/student/doexam/' + $routeParams.hash)
                        .success(function (data, status, headers, config) {
                            $rootScope.$broadcast('startExam');

                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // set sections and question numbering
                            angular.forEach($scope.doexam.examSections.sort(sortDescByIds), function (section, index) {
                                section.index = index + 1;
                                angular.forEach(section.questions.sort(sortDescByIds), function (question, index) {
                                    question.index = index + 1;
                                });
                            });

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.questions, function (question, index) {
                                var template = "";
                                switch (question.type) {
                                    case "MultipleChoiceQuestion":
                                        template = $scope.multipleChoiseOptionTemplate;
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

                                $scope.setQuestionColors(question);
                            });

                            if ($scope.doexam.instruction && $scope.doexam.instruction.length > 0) {
                                $scope.switchToGuide(true);
                            } else {
                                $scope.switchToGuide(false);
                            }
                            $scope.switchButtons($scope.activeSection);

                            $http.get('/examenrolmentroom/' + $scope.doexam.id)
                                .success(function (data, status, headers, config) {
                                    $scope.info = data;
                                    $scope.currentLanguageText = currentLanguage();
                                });

                            count();
                        }).
                        error(function (data, status, headers, config) {
                            $location.path("/home/");
                        });
                };

                $rootScope.$on('$translateChangeSuccess', function () {
                    $scope.currentLanguageText = currentLanguage();
                });

                function currentLanguage() {
                    var tmp = "";

                    switch ($translate.uses()) {
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
                            if ($scope.info.reservation.machine.room.roomInstructionEN) {
                                tmp = $scope.info.reservation.machine.room.roomInstructionEN;
                            }
                            break;
                        default:
                            if ($scope.info.reservation.machine.room.roomInstructionEN) {
                                tmp = $scope.info.reservation.machine.room.roomInstructionEN;
                            }
                            break;
                    }
                    return tmp;
                }


                if ($routeParams.hash != undefined) {
                    $scope.doExam();
                }

                $scope.activateExam = function (exam) {

                    $scope.doexam = exam;

                    $http.get('/student/doexam/' + $scope.doexam.hash)
                        .success(function (clonedExam) {
                            $scope.clonedExam = clonedExam;
                            $location.path('/student/doexam/' + clonedExam.hash);
                        }).
                        error(function (error) {

                            toastr.error(error);

                        });

                };

                $scope.continueExam = function (exam) {
                    $rootScope.$broadcast('startExam');
                    $http.get('/student/doexam/' + exam.hash)
                        .success(function (clonedExam) {
                            $scope.clonedExam = clonedExam;
                            $location.path('/student/doexam/' + clonedExam.hash);
                        }).
                        error(function (error) {
                            console.log('Error happened: ' + error);
                        });
                };

                $scope.setActiveSection = function (section) {
                    $scope.activeSection = section;
                    $scope.switchButtons(section);

                    // Loop through all questions in the active section
                    angular.forEach($scope.activeSection.questions, function (question, index) {

                        var template = "";
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                template = $scope.multipleChoiseOptionTemplate;

//                                console.log("asd: "+ question.answer.option);

                                break;
                            case "EssayQuestion":
                                template = $scope.essayQuestionTemplate;
                                break;
                            default:
                                template = "fa-question-circle";
                                break;
                        }
                        question.template = template;

                        if (question.expanded == null) {
                            question.expanded = true;
                        }

                        $scope.setQuestionColors(question);
                    });
                };

                $scope.setPreviousSection = function (exam, active_section) {
//                    var sectionCount = exam.examSections.length;

                    if (!$scope.guide) {
                        // Loop through all sections in the exam
                        angular.forEach(exam.examSections, function (section, index) {
                            // If section is same as the active_section
                            if (angular.equals(section, active_section)) {
                                // If this is the first element in the array
                                if (index == 0) {
                                    $scope.switchToGuide(true);
                                    $scope.setActiveSection(exam.examSections[0]);
                                }
                                else {
                                    $scope.setActiveSection(exam.examSections[index - 1]);
                                }
                            }
                        });
                    }
                };

                $scope.setNextSection = function (exam, active_section) {
                    var sectionCount = exam.examSections.length;

                    if ($scope.guide) {
                        $scope.switchToGuide(false);
                        $scope.setActiveSection(exam.examSections[0]);
                    } else {
                        // Loop through all sections in the exam
                        angular.forEach(exam.examSections, function (section, index) {
                            // If section is same as the active_section
                            if (angular.equals(section, active_section)) {
                                // If this is the last element in the array
                                if (index == sectionCount - 1) {
                                } else {
                                    $scope.setActiveSection(exam.examSections[index + 1]);
                                }
                            }
                        });
                    }
                };

                // Called when the save and exit button is clicked
                $scope.saveExam = function (doexam) {

                    if (confirm($translate('sitnet_confirm_turn_exam'))) {
                        $rootScope.$broadcast('endExam');

                        StudentExamRes.exams.update({id: doexam.id}, function () {

                            // Todo: tässä vaiheessa pitäisi tehdä paljon muitakin tarkistuksia


                            toastr.info($translate('sitnet_exam_returned'));
                            $location.path("/logout/");

                        }, function () {

                        });
                    }
                };

                // Called when the abort button is clicked
                $scope.abortExam = function (doexam) {

                    if (confirm($translate('sitnet_confirm_abort_exam'))) {
                        $rootScope.$broadcast('endExam');

                        StudentExamRes.exam.abort({id: doexam.id}, {data: doexam}, function () {
                            toastr.info($translate('sitnet_exam_aborted'));
                            $location.path("/home/");

                        }, function () {

                        });
                    }
                };

                // SIT-657, temporary solution
                $scope.logoutFromExam = function (doexam) {

                    if (confirm($translate('sitnet_confirm_turn_exam'))) {

                        $location.path("/logout/");

                    }
                };

                // Called when a radiobutton is selected
                $scope.radioChecked = function (doexam, question, option) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");

                    StudentExamRes.multipleChoiseAnswer.saveMultipleChoice({hash: doexam.hash, qid: question.id, oid: option.id},
                        function (updated_answer) {
                            question.answer = updated_answer;
                            toastr.info($translate('sitnet_question_answered'));
                        }, function (error) {

                        });
                };

                $scope.saveEssay = function (question, answer) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");

                    var params = {
                        hash: $scope.doexam.hash,
                        qid: question.id
                    };
                    var msg = {};
                    msg.answer = answer;
                    StudentExamRes.essayAnswer.saveEssay(params, msg, function () {
                        toastr.info($translate("sitnet_question_answered"));
                    }, function () {

                    });
                };

                $scope.formatRemainingTime = function (time) {

                    var remaining = 0;
                    var minutes = time / 60;
                    if (minutes > 1) {
                        minutes = (minutes | 0);
                        var seconds = time - ( minutes * 60 );
                        if (minutes < 60) {
                            if (minutes > 9) {
                                if (seconds > 9) {
                                    remaining = minutes + ":" + seconds + '';
                                } else {
                                    remaining = minutes + ":0" + seconds + '';
                                }
                            } else {
                                if (seconds > 9) {
                                    remaining = "0" + minutes + ":" + seconds + '';
                                } else {
                                    remaining = "0" + minutes + ":0" + seconds + '';
                                }
                            }
                        } else {
                            var h = 0;
                            while (minutes > 59) {
                                h++;
                                minutes = minutes - 60;
                            }
                            if (minutes > 9) {
                                if (seconds > 9) {
                                    remaining = h + ":" + minutes + ":" + seconds + '';
                                } else {
                                    remaining = h + ":" + minutes + ":0" + seconds + '';
                                }
                            } else {
                                if (seconds > 9) {
                                    remaining = h + ":0" + minutes + ":" + seconds + '';
                                } else {
                                    remaining = h + ":0" + minutes + ":0" + seconds + '';
                                }
                            }

                        }
                    } else {
                        if (time >= 0) {
                            remaining = time + 's';
                        } else {
                            remaining = "";
                            updateInterval = 30;
                        }
                    }

                    return remaining;

                };

                $scope.alarmLine = 300; //if under this, red text. in seconds -> set to 5 minutes

                $scope.timeChecked = false;
                var getRemainingTime = function () {
                    if ($scope.doexam && $scope.doexam.id) {
                        var req = $http.get('/time/' + $scope.doexam.id);
                        req.success(function (reply) {
                            $scope.timeChecked = true;
                            console.log("from server: "+ reply);
                            $scope.remainingTime = parseInt(reply);
                        });
                    }
                };

                $scope.remainingTime = "";
                var updateCheck = 15;
                var updateInterval = 0;
                var count = function () {
                    if($scope.doexam) {
                        updateInterval++;

                        var remainingTimePoller = $timeout(count, 1000);

                        if (updateInterval >= updateCheck) {
                            updateInterval = 0;
                            getRemainingTime();
                        } else {
                            $scope.remainingTime--;
                        }

                        console.log("frontend count: " + $scope.remainingTime);

                        if ($scope.timeChecked === true && $scope.remainingTime < 0) {
                            $timeout.cancel(remainingTimePoller);
                            StudentExamRes.exams.update({id: $scope.doexam.id}, function () {
                                toastr.info($translate("sitnet_exam_returned"));
                                $scope.doexam = null;
                                $location.path("/home/");
                            }, function () {

                            });
                        }
                    }
                };

                count(); // start the clock


                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {

                    if (question.type == "EssayQuestion") {

                    }
                    $scope.setQuestionColors(question);
                };

                $scope.isAnswer = function (question, option) {

                    if (question && question.answer === null)
                        return false;
                    else if (question && question.answer && question.answer.option === null)
                        return false;
                    else if (option && question && question.answer && question.answer.option && option.option === question.answer.option.option)
                        return true;
                };

                $scope.setQuestionColors = function (question) {
                    // State machine for resolving how the question header is drawn
                    if (question.answered || question.answer) {
                        question.answered = true;
                        question.questionStatus = $translate("sitnet_question_answered");

                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-answered-header';
                        }
                    } else {

                        question.questionStatus = $translate("sitnet_question_unanswered");

                        if (question.expanded) {
                            question.selectedAnsweredState = 'question-active-header';
                        } else {
                            question.selectedAnsweredState = 'question-unanswered-header';
                        }
                    }
                };

                $scope.selectFile = function (question) {

                    $scope.questionTemp = question;

                    // Save question before entering attachment to not lose data.
                    switch (question.type) {
                        case "MultipleChoiceQuestion":

                            question.answered = true;
                            question.questionStatus = $translate("sitnet_question_answered");

                            var optionId = 0;
                            if (question.answer && question.answer.option) {
                                optionId = question.answer.option;
                            }

                            StudentExamRes.multipleChoiseAnswer.saveMultipleChoice({hash: $scope.doexam.hash, qid: question.id, oid: optionId},
                                function (updated_answer) {
                                    question.answer = updated_answer;
                                    $scope.questionTemp.answer = updated_answer;
                                    toastr.info($translate("sitnet_question_answered"));
                                }, function (error) {
                                });

                            break;

                        case "EssayQuestion":
                            var answer = "";
                            if (question.answer && question.answer.length > 0) {
                                answer = question.answer.answer;
                            }
                            $scope.saveEssay(question, answer);
                            break;
                    }

                    var ctrl = function ($scope, $modalInstance) {

                        $scope.questionTemp = question;

                        $scope.submit = function (question) {

                            var file = $scope.attachmentFile;
                            var url = "attachment/question/answer";
                            var fd = new FormData();
                            fd.append('file', file);
                            fd.append('questionId', $scope.questionTemp.id);
                            fd.append('answerId', $scope.questionTemp.answer.id);
                            $http.post(url, fd, {
                                transformRequest: angular.identity,
                                headers: {'Content-Type': undefined}
                            })
                                .success(function (attachment) {
                                    $modalInstance.dismiss();
                                    $scope.questionTemp.answer.attachment = attachment;
                                })
                                .error(function (error) {
                                    $modalInstance.dismiss();
                                    toastr.error(error);
                                });
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/question-editor/dialog_question_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        resolve: {
                            question: function () {
                                return $scope.questionTemp;
                            }
                        }
                    });

                    modalInstance.result.then(function (resp) {
                        // OK button
                        $location.path('/student/doexam/' + $routeParams.hash);
                    }, function () {
                        // Cancel button
                    });
                };
            }]);
}());