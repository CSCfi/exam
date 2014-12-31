(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('StudentExamController', ['$rootScope', '$scope', '$interval', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'StudentExamRes', '$q',
            function($rootScope, $scope, $interval, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, StudentExamRes, $q) {

                $scope.sectionsBar = SITNET_CONF.TEMPLATES_PATH + "student/student_sections_bar.html";
                $scope.multipleChoiseOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/multiple_choice_option.html";
                $scope.essayQuestionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/essay_question.html";
                $scope.sectionTemplate = SITNET_CONF.TEMPLATES_PATH + "student/section_template.html";

                $scope.tempQuestion = null;

                // section back / forward buttons
                $scope.pages = [$translate("sitnet_exam_quide")];
                $scope.guide = false;
                $scope.previousButton = false;
                $scope.previousButtonText = "";
                $scope.nextButton = false;
                $scope.nextButtonText = "";

                $scope.hash = $routeParams.hash;

                $scope.reload = function() {
                    $scope.doExam($routeParams.hash);
                };

                function cancelAutosavers() {
                    if ($scope.doexam) {
                        angular.forEach($scope.doexam.examSections, function(section) {
                            if (section.autosaver) {
                                $interval.cancel(section.autosaver);
                            }
                        });
                    }
                }

                $scope.$on('$destroy', function() {
                    cancelAutosavers();
                });

                /**
                 *
                 * @param section examsection
                 * @param type "answered" or "open"
                 */
                $scope.getQuestionAmount = function(section, type) {
                    var i = 0;
                    if (type === 'answered') {
                        angular.forEach(section.sectionQuestions, function(sectionQuestion) {
                            if (sectionQuestion.question.answered) {
                                i = i + 1;
                            }
                        });
                    }
                    if (type === 'open') {
                        angular.forEach(section.sectionQuestions, function(sectionQuestion) {
                            if (!sectionQuestion.question.answered) {
                                i = i + 1;
                            }
                        });
                    }
                    return i;
                };

                $scope.printExamDuration = function(exam) {

                    if (exam && exam.duration) {
                        var h = Math.floor(exam.duration / 60);
                        var m = exam.duration % 60;
                        if (h === 0) {
                            return m + "min";
                        } else if (m === 0) {
                            return h + "h ";
                        } else {
                            return h + "h " + m + "min";
                        }
                    } else {
                        return "";
                    }
                };

                var getAutosaver = function() {
                    if(!guide) {
                        return $interval(function() {
                            angular.forEach($scope.activeSection.sectionQuestions, function(sectionQuestion) {
                                var question = sectionQuestion.question;
                                if (question.type === "EssayQuestion" && question.answer.answer.length > 0) {
                                    var params = {
                                        hash: $scope.doexam.hash,
                                        qid: question.id
                                    };
                                    var msg = {};
                                    msg.answer = question.answer.answer;
                                    StudentExamRes.essayAnswer.saveEssay(params, msg, function() {
                                        question.autosaved = new Date();
                                        $scope.setQuestionColors(question);
                                    }, function() {
                                    });
                                }
                            });
                        }, 1000 * 60);
                    }
                };

                $scope.doExam = function(hash) {
                    $http.get('/student/doexam/' + $routeParams.hash)
                        .success(function(data, status, headers, config) {
                            $rootScope.$broadcast('startExam');

                            $scope.doexam = data;
                            $scope.activeSection = $scope.doexam.examSections[0];

                            // set sections and question numbering
                            angular.forEach($scope.doexam.examSections, function(section, index) {
                                section.index = index + 1;
                                $scope.pages.push(section.name);
                                angular.forEach(section.sectionQuestions, function(sectionQuestion, index) {
                                    sectionQuestion.question.index = index + 1; // Where is this really used?
                                });
                            });

                            // Loop through all questions in the active section
                            angular.forEach($scope.activeSection.sectionQuestions, function(sectionQuestion) {
                                var question = sectionQuestion.question;
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

                            $http.get('/examenrolmentroom/' + $scope.doexam.id)
                                .success(function(data, status, headers, config) {
                                    $scope.info = data;
                                    $scope.currentLanguageText = currentLanguage();
                                });

                            count();
                            $scope.activeSection.autosaver = getAutosaver();

                            if($scope.doexam.instruction != undefined) {
                                $scope.setActiveSection($translate("sitnet_exam_quide"));
                            } else {
                                $scope.pages.splice(0,1);
                                $scope.setActiveSection($scope.pages[0]);
                                $scope.activeSection.autosaver = getAutosaver();
                            }
                        }).
                        error(function(data, status, headers, config) {
                            $location.path("/home/");
                        });
                };

                $rootScope.$on('$translateChangeSuccess', function() {
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

                $scope.activateExam = function(exam) {

                    $scope.doexam = exam;

                    $http.get('/student/doexam/' + $scope.doexam.hash)
                        .success(function(clonedExam) {
                            $scope.clonedExam = clonedExam;
                            $location.path('/student/doexam/' + clonedExam.hash);
                        }).
                        error(function(error) {
                            toastr.error(error);
                        });
                };

                $scope.continueExam = function(exam) {
                    $rootScope.$broadcast('startExam');
                    $http.get('/student/doexam/' + exam.hash)
                        .success(function(clonedExam) {
                            $scope.clonedExam = clonedExam;
                            $location.path('/student/doexam/' + clonedExam.hash);
                        }).
                        error(function(error) {
                            console.log('Error happened: ' + error);
                        });
                };

                $scope.setNextSection = function() {
                    if($scope.guide) {
                        $scope.setActiveSection($scope.pages[1]);
                    } else {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.name) + 1]);
                    }
                };

                $scope.setPreviousSection = function() {
                    if(!$scope.guide) {
                        $scope.setActiveSection($scope.pages[$scope.pages.indexOf($scope.activeSection.name) - 1]);
                    }
                };

                $scope.setActiveSection = function(sectionName) {

                    if(sectionName !== $translate("sitnet_exam_quide") || ($scope.doexam.instruction == "" && sectionName === $translate("sitnet_exam_quide"))) {

                        // next
                        if(sectionName === $translate("sitnet_exam_quide")) {
                            sectionName = $scope.pages[1];
                        }

                        if($scope.pages[$scope.pages.indexOf(sectionName) + 1] !== undefined) {
                            $scope.nextButton = true;
                            $scope.nextButtonText = $scope.pages[$scope.pages.indexOf(sectionName) + 1];
                        } else {
                            $scope.nextButton = false;
                            $scope.nextButtonText = "";
                        }

                        // previous
                        if ($scope.pages[$scope.pages.indexOf(sectionName) - 1] !== undefined) {
                            $scope.previousButton = true;

                            $scope.previousButtonText = $scope.pages[$scope.pages.indexOf(sectionName) - 1];
                        } else {
                            $scope.previousButton = false;
                            $scope.previousButtonText = "";
                        }

                        $scope.guide = false;

                    } else {
                        $scope.guide = true;
                        $scope.nextButton = true;
                        $scope.nextButtonText = $scope.pages[1];
                        $scope.previousButton = false;
                        $scope.previousButtonText = "";
                    }

                    $scope.activeSection = undefined;
                        angular.forEach($scope.doexam.examSections, function(section, index) {
                        if (sectionName === section.name) {
                            $scope.activeSection = section;
                        }
                    });

                    if($scope.activeSection !== undefined) {
                        // Loop through all questions in the active section
                        angular.forEach($scope.activeSection.sectionQuestions, function (sectionQuestion) {
                            var question = sectionQuestion.question;
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

                            if (question.expanded == null) {
                                question.expanded = true;
                            }

                            $scope.setQuestionColors(question);
                        });
                        cancelAutosavers();
                        $scope.activeSection.autosaver = getAutosaver();
                    }
                };

                // Called when the save and exit button is clicked
                $scope.saveExam = function(doexam) {

                    if (confirm($translate('sitnet_confirm_turn_exam'))) {
                        $rootScope.$broadcast('endExam');

                        StudentExamRes.exams.update({id: doexam.id}, function() {

                            // Todo: tässä vaiheessa pitäisi tehdä paljon muitakin tarkistuksia


                            toastr.info($translate('sitnet_exam_returned'));
                            $location.path("/logout");
                            $timeout.cancel($scope.remainingTimePoller);
                        }, function() {

                        });
                    }
                };

                // Called when the abort button is clicked
                $scope.abortExam = function(doexam) {

                    if (confirm($translate('sitnet_confirm_abort_exam'))) {
                        $rootScope.$broadcast('endExam');

                        StudentExamRes.exam.abort({id: doexam.id}, {data: doexam}, function() {
                            toastr.info($translate('sitnet_exam_aborted'));
                            $location.path("/logout");
                            $timeout.cancel($scope.remainingTimePoller);
                        }, function() {

                        });
                    }
                };

                // SIT-657, temporary solution
                $scope.logoutFromExam = function(doexam) {

                    if (confirm($translate('sitnet_confirm_turn_exam'))) {

                        $location.path("/logout/");

                    }
                };

                // Called when a radiobutton is selected
                $scope.radioChecked = function(doexam, question, option) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");

                    StudentExamRes.multipleChoiseAnswer.saveMultipleChoice({hash: doexam.hash, qid: question.id, oid: option.id},
                        function(updated_answer) {
                            question.answer = updated_answer;
                            toastr.info($translate('sitnet_question_answered'));
                        }, function(error) {

                        });
                };

                $scope.saveEssay = function(question, answer) {
                    question.answered = true;
                    question.questionStatus = $translate("sitnet_question_answered");

                    var params = {
                        hash: $scope.doexam.hash,
                        qid: question.id
                    };
                    var msg = {};
                    msg.answer = answer;
                    StudentExamRes.essayAnswer.saveEssay(params, msg, function() {
                        toastr.info($translate("sitnet_question_answered"));
                    }, function() {

                    });
                };

                function zeropad(n) {
                    n += '';
                    return n.length > 1 ? n : '0' + n;
                }


                $scope.formatRemainingTime = function(time) {
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
                var getRemainingTime = function() {
                    if ($scope.doexam && $scope.doexam.id) {
                        var req = $http.get('/time/' + $scope.doexam.id);
                        req.success(function(reply) {
                            $scope.timeChecked = true;
                            // console.log("from server: " + reply);
                            $scope.remainingTime = parseInt(reply);
                        });
                    }
                };

                function onTimeout() {
                    $timeout.cancel($scope.remainingTimePoller);
                    // Loop through all essay questions in the active section
                    var promises = [];
                    if(!$scope.guide) {
                        angular.forEach($scope.activeSection.questions, function (question) {
                            var answer = question.answer ? question.answer.answer : '';
                            if (question.type === "EssayQuestion" && answer.length > 0) {
                                var params = {
                                    hash: $scope.doexam.hash,
                                    qid: question.id
                                };
                                var msg = {answer: answer};
                                promises.push(StudentExamRes.essayAnswer.saveEssay(params, msg));
                            }
                        });
                        // Finally save the exam and logout
                        $q.all(promises).then(function () {
                            StudentExamRes.exams.update({id: $scope.doexam.id}, function () {
                                toastr.info($translate("sitnet_exam_time_is_up"));
                                $location.path("/logout");
                            }, function () {

                            });
                        });
                    }
                }

                $scope.remainingTime = "";
                var updateCheck = 15;
                var updateInterval = 0;
                var count = function() {
                    if ($scope.doexam) {
                        updateInterval++;

                        $scope.remainingTimePoller = $timeout(count, 1000);

                        if (updateInterval >= updateCheck) {
                            updateInterval = 0;
                            getRemainingTime();
                        } else {
                            $scope.remainingTime--;
                        }

                        // console.log("frontend count: " + $scope.remainingTime);

                        if ($scope.timeChecked === true && $scope.remainingTime < 0) {
                            onTimeout();
                        }
                    }
                };

                count(); // start the clock

                // Called when the chevron is clicked
                $scope.chevronClicked = function(sectionQuestion) {
                    var question = sectionQuestion.question;
                    if (question.type == "EssayQuestion") {

                    }
                    $scope.setQuestionColors(question);
                };

                $scope.isAnswer = function(question, option) {

                    if (question && question.answer === null) {
                        return false;
                    }
                    else if (question && question.answer && question.answer.option === null) {
                        return false;
                    }
                    else if (option && question && question.answer && question.answer.option && option.option === question.answer.option.option) {
                        return true;
                    }
                };

                $scope.setQuestionColors = function(question) {
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

                $scope.selectFile = function(question) {

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
                                function(updated_answer) {
                                    question.answer = updated_answer;
                                    $scope.questionTemp.answer = updated_answer;
                                    toastr.info($translate("sitnet_question_answered"));
                                }, function(error) {
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

                    var ctrl = function($scope, $modalInstance) {

                        $scope.questionTemp = question;

                        $scope.submit = function(question) {

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
                                .success(function(attachment) {
                                    $modalInstance.dismiss();
                                    $scope.questionTemp.answer.attachment = attachment;
                                })
                                .error(function(error) {
                                    $modalInstance.dismiss();
                                    toastr.error(error);
                                });
                        };
                        // Cancel button is pressed in the modal dialog
                        $scope.cancel = function() {
                            $modalInstance.dismiss('Canceled');
                        };
                    };

                    var modalInstance = $modal.open({
                        templateUrl: 'assets/templates/question-editor/dialog_question_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl,
                        resolve: {
                            question: function() {
                                return $scope.questionTemp;
                            }
                        }
                    });

                    modalInstance.result.then(function(resp) {
                        // OK button
                        $location.path('/student/doexam/' + $routeParams.hash);
                    }, function() {
                        // Cancel button
                    });
                };
            }]);
}());