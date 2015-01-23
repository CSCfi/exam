(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['$scope', "sessionService", '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'LanguageRes', 'QuestionRes',
            function($scope, sessionService, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes, LanguageRes, QuestionRes) {

                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_multiplechoice_question.html";
                $scope.essayQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_essay_question.html";
                $scope.studentInfoTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_student_info.html";
                $scope.previousParticipationPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_previous_participation.html";
                $scope.gradingPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_grading.html";


                $scope.session = sessionService;
                $scope.user = $scope.session.user;

                if ($scope.user == undefined || $scope.user.isStudent) {
                    $location.path("/unauthorized");
                }

                $scope.globalInspections = [];
                $scope.localInspections = [];
                $scope.examGrading = [];

                LanguageRes.languages.query(function(languages) {
                    $scope.languages = languages.map(function(language) {
                        language.name = getLanguageNativeName(language.code);
                        return language;
                    });
                });

                $scope.setLanguage = function(lang) {
                    $scope.selectedLanguage = lang;
                    $scope.examToBeReviewed.answerLanguage = lang.name;
                };

                $scope.hasMultipleChoiseQuestions = false;
                $scope.hasEssayQuestions = false;
                $scope.acceptedEssays = 0;
                $scope.rejectedEssays = 0;

                // Get the exam that was specified in the URL
                ExamRes.reviewerExam.get({eid: $routeParams.id},
                    function(exam) {
                        $scope.examToBeReviewed = exam;
                        if($scope.examToBeReviewed.customCredit == undefined || $scope.examToBeReviewed.customCredit == '') {
                            $scope.examToBeReviewed.customCredit = $scope.examToBeReviewed.course.credits;
                        }

                        if (exam) {
                            angular.forEach($scope.examToBeReviewed.examSections, function (section) {
                                angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                                    var question = sectionQuestion.question;
                                    if (question.type === "EssayQuestion") {
                                        if (question.evaluationType === "Select") {
                                            if (question.evaluatedScore == 1) {
                                                $scope.acceptedEssays++;
                                            } else if (question.evaluatedScore == 0) {
                                                $scope.rejectedEssays++;
                                            }
                                        }
                                        $scope.hasEssayQuestions = true;
                                    }
                                    else {
                                        $scope.hasMultipleChoiseQuestions = true;
                                    }
                                });
                            });
                            if (exam.answerLanguage) {
                                $scope.selectedLanguage = exam.answerLanguage;
                            } else if (exam.examLanguages.length === 1) {
                                // Use parent's language as default answer language if there is a single one to choose from
                                $scope.selectedLanguage = getLanguageNativeName(exam.examLanguages[0].code);
                            }
                        }

                        $scope.isCreator = function() {
                            return $scope.examToBeReviewed && $scope.examToBeReviewed.parent && $scope.examToBeReviewed.parent.creator && $scope.examToBeReviewed.parent.creator.id === $scope.user.id;
                        };
                        $scope.isReadOnly = exam.state && exam.state === "GRADED_LOGGED";

                        switch ($scope.examToBeReviewed.grading) {
                            case "0-5":
                                $scope.examGrading = ["0", "1", "2", "3", "4", "5"];
                                break;

                            case "Hyväksytty-Hylätty":
                                $scope.examGrading = ["Hyväksytty", "Hylätty"];
                                break;

                            case "Improbatur-Laudatur":
                                $scope.examGrading = [
                                    "Laudatur",
                                    "Eximia cum laude approbatur",
                                    "Magna cum laude approbatur",
                                    "Cum laude approbatur",
                                    "Non sine laude approbatur",
                                    "Lubenter approbatur",
                                    "Approbatur",
                                    "Improbatur"
                                ];
                                break;
                        }

                        $scope.reviewStatus = [
                            {
                                "key": true,
                                "value": $translate('sitnet_ready')
                            },
                            {
                                "key": false,
                                "value": $translate('sitnet_in_progress')
                            }
                        ];

                        $scope.isLocalReady = function(userId) {
                            var ready = false;
                            if ($scope.localInspections.length > 0) {
                                angular.forEach($scope.localInspections, function(localInspection) {
                                    if (localInspection.user && localInspection.user.id && localInspection.user.id === userId) {
                                        ready = localInspection.ready;
                                    }
                                });
                            }
                            return ready;
                        };

                        $scope.toggleReady = function() {
                            angular.forEach($scope.localInspections, function(localInspection) {
                                if (localInspection.user.id === $scope.user.id) {
                                    // toggle ready ->
                                    var ready = !$scope.reviewReady;
                                    ExamRes.inspectionReady.update({id: localInspection.id, ready: ready}, function(result) {
                                        toastr.info($translate('sitnet_exam_updated'));
                                        $scope.reviewReady = ready;
                                    }, function(error) {
                                        toastr.error(error.data);
                                    });
                                }
                            });
                        };
                        $scope.openEssayDialog = function(question) {

                            var modalInstance = $modal.open({
                                templateUrl: 'assets/templates/teacher/essay-review/essay-review-dialog.html',
                                backdrop: 'true',
                                keyboard: true,
                                windowClass: 'essay-dialog',
                                controller: 'EssayReviewController',
                                resolve: { question: function() {
                                    return question;
                                } }
                            });

                            modalInstance.result.then(function(inspectors) {
                                // OK button clicked

                            }, function() {
                                // Cancel button clicked

                            });


                        };

                        // get global exam inspections ->
                        ExamRes.inspections.get({id: $scope.examToBeReviewed.parent.id},
                            function(globals) {
                                $scope.globalInspections = globals;

                                // get local inspections if more than one inspector ->
                                if ($scope.globalInspections && $scope.globalInspections.length > 1) {

                                    // get single exam inspections ->
                                    ExamRes.inspections.get({id: $scope.examToBeReviewed.id},
                                        function(locals) {

                                            var isCurrentUserInspectionCreated = false;
                                            $scope.localInspections = locals;

                                            // created local inspections, if not created ->
                                            if ($scope.localInspections.length > 0) {
                                                angular.forEach($scope.localInspections, function(localInspection) {
                                                    if (localInspection.user.id === $scope.user.id) {
                                                        isCurrentUserInspectionCreated = true;
                                                        $scope.reviewReady = localInspection.ready;
                                                    }
                                                });
                                            }

                                            // if user doesn't already have an inspection, create, otherwise skip ->
                                            if (isCurrentUserInspectionCreated === false) {
                                                ExamRes.localInspection.insert({eid: $scope.examToBeReviewed.id, uid: $scope.user.id}, function(newLocalInspection) {
                                                    $scope.localInspections.push(newLocalInspection);
                                                    $scope.reviewReady = false;
                                                }, function(error) {

                                                });
                                            }
                                        },
                                        function(error) {
                                            toastr.error(error.data);
                                        }
                                    );
                                }
                            },
                            function(error) {
                                toastr.error(error.data);
                            }
                        );

                        ExamRes.studentInfo.get({id: $routeParams.id},
                            function(info) {
                                $scope.userInfo = info;
                                if(info && info.duration) {
                                    $scope.userInfo.duration = moment.utc(Date.parse(info.duration)).format('HH:mm');
                                }
                                // get previous participations ->
                                ExamRes.examParticipationsOfUser.query(
                                    {eid: $scope.examToBeReviewed.parent.id, uid: $scope.userInfo.user.id}, function(participations) {
                                        $scope.previousParticipations = participations;
                                    });

                            },
                            function(error) {
                                toastr.error(error.data);
                            }
                        );
                    },
                    function(error) {
                        toastr.error(error.data);
                    }
                );

                $scope.viewAnswers = function(examId) {
                    window.open("/#/exams/review/" + examId, "_blank");
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

                $scope.scoreMultipleChoiceAnswer = function(sectionQuestion) {
                    var score = 0;
                    var question = sectionQuestion.question;
                    if (question.answer === null) {
                        question.backgroundColor = 'grey';
                        return 0;
                    }

                    if (question.answer.option.correctOption === true) {
                        score = question.maxScore;
                        question.backgroundColor = 'green';
                    }

                    if (question.answer.option.correctOption === false) {
                        question.backgroundColor = 'red';
                    }

                    return score;
                };

                $scope.removeNewLines = function(answer) {
                    return answer ? answer.replace(/\n/g, '') : '';
                };

                $scope.getName = function(question) {

                    return question.type + "_" + question.id;
                };

                $scope.scoreEssayAnswer = function(question) {
                    if (question.answer === null) {
                        question.evaluatedScore = 0;
                    }
                };

                $scope.range = function(min, max, step) {
                    step = (step === undefined) ? 1 : step;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                $scope.getSectionTotalScore = function(section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function(sectionQuestion) {
                        var question = sectionQuestion.question;
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                if (question.answer === null) {
                                    question.backgroundColor = 'grey';
                                    return 0;
                                }
                                if (question.answer.option.correctOption === true) {
                                    score = score + question.maxScore;
                                }
                                break;
                            case "EssayQuestion":

                                if (question.evaluatedScore && question.evaluationType === 'Points') {
                                    var number = parseFloat(question.evaluatedScore);
                                    if (angular.isNumber(number)) {
                                        score = score + number;
                                    }
                                }
                                break;
                            default:
//                                return 0;
                                break;
                        }
                    });
                    return score;
                };

                $scope.getSectionMaxScore = function(section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function(sectionQuestion) {
                        var question = sectionQuestion.question;
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                score += question.maxScore;
                                break;

                            case "EssayQuestion":
                                if (question.evaluationType == 'Points') {
                                    score += question.maxScore;
                                }
                                break;

                            default:
                                toastr.error($translate('sitnet_unknown_question_type') + ": " + question.type);
                                break;
                        }
                    });
                    return score;
                };

                $scope.getExamMaxPossibleScore = function(exam) {

                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function(section) {
                            total += $scope.getSectionMaxScore(section);
                        });

                        return total;
                    }
                };

                $scope.getExamTotalScore = function(exam) {

                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function(section) {
                            total += $scope.getSectionTotalScore(section);
                        });
                        $scope.examToBeReviewed.totalScore = total;
                        return total;
                    }
                };

                $scope.truncate = function(answer, offset) {
                    if (answer && offset < answer.length) {
                        return answer.substring(0, offset) + " ...";
                    } else {
                        return answer;
                    }
                };

                var refreshRejectedAcceptedCounts = function() {
                    var accepted = 0;
                    var rejected = 0;
                    angular.forEach($scope.examToBeReviewed.examSections, function(section) {
                        angular.forEach(section.sectionQuestions, function(sectionQuestion) {
                            var question = sectionQuestion.question;
                            if (question.type === "EssayQuestion") {
                                if (question.evaluationType === "Select") {
                                    if (question.evaluatedScore == 1) {
                                        accepted++;
                                    } else if (question.evaluatedScore == 0) {
                                        rejected++;
                                    }
                                }
                            }
                        });
                    });
                    $scope.acceptedEssays = accepted;
                    $scope.rejectedEssays = rejected;
                };

                $scope.toggleQuestionExpansion = function(sectionQuestion) {
                    sectionQuestion.question.reviewExpanded = !sectionQuestion.question.reviewExpanded;
                };

                $scope.insertEssayScore = function(sectionQuestion) {
                    var question = sectionQuestion.question;
                    QuestionRes.score.update({id: question.id},
                        {"evaluatedScore": question.evaluatedScore}, function(q) {
                            toastr.info($translate("sitnet_graded"));
                            if (q.evaluationType === "Select") {
                                refreshRejectedAcceptedCounts();
                            }
                        }, function(error) {
                            toastr.error(error.data);
                        });
                };

                $scope.setExamGrade = function(grade) {
                    $scope.examToBeReviewed.grade = grade;
                };

                // Called when the save feedback button is clicked
                $scope.saveFeedback = function() {

                    var examFeedback = {
                        "comment": $scope.examToBeReviewed.examFeedback.comment
                    };

                    // Update comment
                    if ($scope.examToBeReviewed.examFeedback.id) {
                        ExamRes.comment.update({eid: $scope.examToBeReviewed.id, cid: $scope.examToBeReviewed.examFeedback.id}, examFeedback, function(exam) {
                            toastr.info($translate("sitnet_comment_updated"));
                        }, function(error) {
                            toastr.error(error.data);
                        });
                        // Insert new comment
                    } else {
                        ExamRes.comment.insert({eid: $scope.examToBeReviewed.id, cid: 0}, examFeedback, function(comment) {
                            toastr.info($translate("sitnet_comment_added"));
                            $scope.examToBeReviewed.examFeedback.comment = comment;
                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                // called when Save button is clicked
                $scope.updateExam = function(reviewed_exam) {

                    if (reviewed_exam.grade == undefined || reviewed_exam.grade == "") {
                        toastr.error($translate('sitnet_participation_unreviewed'));
                        return;
                    }

                    if (reviewed_exam.creditType == undefined || reviewed_exam.creditType == "") {
                        toastr.error($translate('sitnet_exam_choose_credit_type'));
                        return;
                    }

                    var examToReview = {
                        "id": reviewed_exam.id,
                        "state": 'GRADED',
                        "grade": reviewed_exam.grade,
                        "customCredit": reviewed_exam.customCredit,
                        "totalScore": reviewed_exam.totalScore,
                        "creditType": reviewed_exam.creditType,
                        "answerLanguage": $scope.selectedLanguage
                    };

                    ExamRes.review.update({id: examToReview.id}, examToReview, function(exam) {
                        toastr.info($translate('sitnet_exam_reviewed'));
                        $scope.saveFeedback();
                        $location.path("exams/reviews/" + reviewed_exam.parent.id);
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                // called when send email button is clicked
                $scope.sendEmailMessage = function() {
                    ExamRes.email.inspection({eid: $scope.examToBeReviewed.id, msg: $scope.message}, function(response) {
                        toastr.info($translate("sitnet_email_sent"));
                        $scope.message = "";
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                $scope.additionalInfo = "";

                $scope.saveExamRecord = function(reviewed_exam) {

                    if (reviewed_exam.grade == undefined || reviewed_exam.grade == "") {
                        toastr.error($translate('sitnet_participation_unreviewed') + ". " + $translate('sitnet_result_not_sended_to_registry'));
                        return;
                    }


                    if (reviewed_exam.creditType == undefined || reviewed_exam.creditType == "") {
                        toastr.error($translate('sitnet_exam_choose_credit_type') + ". " + $translate('sitnet_result_not_sended_to_registry'));
                        return;
                    }

                    if (confirm($translate('sitnet_confirm_record_review'))) {

                        $scope.saveFeedback();

                        var examToRecord = {
                            "id": reviewed_exam.id,
                            "state": "GRADED_LOGGED",
                            "grade": reviewed_exam.grade,
                            "customCredit": reviewed_exam.customCredit,
                            "totalScore": reviewed_exam.totalScore,
                            "creditType": reviewed_exam.creditType,
                            "sendFeedback": true,
                            "answerLanguage": $scope.selectedLanguage,
                            "additionalInfo": $scope.additionalInfo
                        };

                        ExamRes.saveRecord.add(examToRecord, function(exam) {
                            toastr.info($translate('sitnet_review_recorded'));
                            $location.path("exams/reviews/" + reviewed_exam.parent.id);
                        }, function(error) {
                            toastr.error(error.data);
                        });
                    }
                };

                $scope.modifyCredit = function() {

                    if ($scope.examToBeReviewed.customCredit === '' || $scope.examToBeReviewed.customCredit === undefined || isNaN($scope.examToBeReviewed.customCredit)) {
                        toastr.error($translate('sitnet_not_a_valid_custom_credit'));
                        return;
                    }

                    ExamRes.credit.update({eid: $scope.examToBeReviewed.id, credit: $scope.examToBeReviewed.customCredit}, function() {
                        toastr.info($translate("sitnet_exam_updated"));
                    }, function(error) {
                        toastr.error(error.data);
                    });
                };

                $scope.stripHtml = function(text) {
                    return String(text).replace(/<[^>]+>/gm, '');
                };
            }
        ]);
}());
