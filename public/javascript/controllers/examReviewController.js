(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['$scope', "sessionService", '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, sessionService, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_multiplechoice_question.html";
                $scope.essayQuestionPath = SITNET_CONF.TEMPLATES_PATH + "teacher/review_essay_question.html";
                $scope.studentInfoTemplate = SITNET_CONF.TEMPLATES_PATH + "teacher/review_exam_student_info.html";

                $scope.session = sessionService;
                $scope.user = $scope.session.user;

                $scope.globalInspections = [];
                $scope.localInspections = [];
                $scope.examGrading = [];

                if ($routeParams.id === undefined) {
                    // Todo: Should not come here, redirect to homepage if comes?
                }
                // Get the exam that was specified in the URL
                else {
                    ExamRes.exams.get({id: $routeParams.id},
                        function (exam) {
                            $scope.examToBeReviewed = exam;

                            $scope.isCreator = function () {
                                return $scope.examToBeReviewed && $scope.examToBeReviewed.parent && $scope.examToBeReviewed.parent.creator && $scope.examToBeReviewed.parent.creator.id === $scope.user.id;
                            };

                            switch($scope.examToBeReviewed.grading) {
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

                            $scope.scope = $scope;
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

                            $scope.isLocalReady = function (userId) {
                                var ready = false;
                                if($scope.localInspections.length > 0) {
                                    angular.forEach($scope.localInspections, function(localInspection){
                                        if(localInspection.user.id && localInspection.user.id === userId) {
                                            ready = localInspection.ready;
                                        }
                                    });
                                }
                                return ready;
                            };

                            $scope.toggleReady = function () {
                                angular.forEach($scope.localInspections, function(localInspection){
                                    if(localInspection.user.id === $scope.user.id) {
                                        // toggle ready ->
                                        ExamRes.inspectionReady.update({id: localInspection.id, ready: $scope.reviewReady}, function (result) {
                                            toastr.info("Tentti päivitetty.");
                                        }, function (error) {
                                            toastr.error(error.data);
                                        });
                                    }
                                });
                            };

                            // get global exam inspections ->
                            ExamRes.inspections.get({id: $scope.examToBeReviewed.parent.id},
                                function (globals) {
                                    $scope.globalInspections = globals;

                                    // get local inspections if more than one inspector ->
                                    if($scope.globalInspections && $scope.globalInspections.length > 1) {

                                        // get single exam inspections ->
                                        ExamRes.inspections.get({id: $scope.examToBeReviewed.id},
                                            function (locals) {

                                                var isCurrentUserInspectionCreated = false;
                                                $scope.localInspections = locals;

                                                // created local inspections, if not created ->
                                                if($scope.localInspections.length > 0) {
                                                    angular.forEach($scope.localInspections, function(localInspection){
                                                        if(localInspection.user.id === $scope.user.id) {
                                                            isCurrentUserInspectionCreated = true;
                                                            $scope.reviewReady = localInspection.ready;
                                                        }
                                                    });
                                                }

                                                // if user doesn't already have an inspection, create, otherwise skip ->
                                                if(isCurrentUserInspectionCreated === false) {
                                                    ExamRes.localInspection.insert({eid: $scope.examToBeReviewed.id, uid: $scope.user.id}, function (newLocalInspection) {
                                                        $scope.localInspections.push(newLocalInspection);
                                                        $scope.reviewReady = false;
                                                    }, function (error) {

                                                    });
                                                }
                                            },
                                            function (error) {
                                                toastr.error(error.data);
                                            }
                                        );
                                    }
                                },
                                function (error) {
                                    toastr.error(error.data);
                                }
                            );
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                    ExamRes.studentInfo.get({id: $routeParams.id},
                        function (info) {
                            $scope.userInfo = info;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                }

                $scope.printExamDuration = function(exam) {

                    if(exam && exam.duration) {
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

                $scope.scoreMultipleChoiceAnswer = function (question) {
                    var score = 0;

                    if (question.answer === null) {
                        question.backgroundColor = 'grey';
                        return 0;
                    }

                    if(question.answer.option.correctOption === true) {
                        score = question.maxScore;
                        question.backgroundColor = 'green';
                    }

                    if(question.answer.option.correctOption === false) {
                        question.backgroundColor = 'red';
                    }

                    return score;
                };

                $scope.removeNewLines = function(answer) {
                    return answer ? answer.replace(/\n/g, '') : '';
                };

                $scope.scoreEssayAnswer = function (question) {
                    if (question.answer === null) {
                        question.evaluatedScore = 0;
                    }
                };

                $scope.range = function(min, max, step){
                    step = (step === undefined) ? 1 : step;
                    var input = [];
                    for (var i = min; i <= max; i += step) input.push(i);
                    return input;
                };

                $scope.getSectionTotalScore = function(section) {
                    var score = 0;

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                if (question.answer === null) {
                                    question.backgroundColor = 'grey';
                                    return 0;
                                }
                                if(question.answer.option.correctOption === true) {
                                    score = score + question.maxScore;
                                }
                                break;
                            case "EssayQuestion":

                                if(question.evaluatedScore && question.evaluationType == 'Points') {
                                    var number = parseFloat(question.evaluatedScore);
                                    if(angular.isNumber(number)){
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

                    angular.forEach(section.questions, function(question, index) {

                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                score = score + question.maxScore;
                                break;

                            case "EssayQuestion":
                                if (question.evaluationType == 'Points') {
                                    score = score + question.maxScore;
                                } else if (question.evaluationType == 'Select') {
                                    score = score + 1;
                                }
                                break;

                            default:
                                toastr.error("Unknown question type: "+ question.type);
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

                // Called when the chevron is clicked
                $scope.chevronClicked = function (question) {
                };

                $scope.insertEssayScore = function (question) {
                    var questionToUpdate = {
                        "id": question.id,
                        "type": question.type,
                        "expanded": question.expanded,
                        "evaluatedScore": question.evaluatedScore,
                        "maxScore": question.maxScore                   // workaround for     @Column(columnDefinition="numeric default 0")
                                                                        // without this question will be updated with default value
                    };

                    QuestionRes.questions.update({id: questionToUpdate.id}, questionToUpdate, function (q) {
//                        question = q;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.insertCreditType = function (exam) {

                    var examToReview = {
                        "id": exam.id,
                        "creditType": $scope.examToBeReviewed.creditType
                    };


                    ExamRes.review.update({id: examToReview.id}, examToReview, function (exam) {
                        toastr.info("Tentti päivitetty.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.setExamGrade = function (grade) {
                    $scope.examToBeReviewed.grade = grade;
                };

                // Called when the save feedback button is clicked
                $scope.saveFeedback = function () {

                    var examFeedback = {
                        "comment": $scope.examToBeReviewed.examFeedback.comment
                    };

                    // Update comment
                    if ($scope.examToBeReviewed.examFeedback.id) {
                        ExamRes.comment.update({eid: $scope.examToBeReviewed.id, cid: $scope.examToBeReviewed.examFeedback.id}, examFeedback, function (exam) {
                            toastr.info("Tentin kommentti päivitetty.");
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    // Insert new comment
                    } else {
                        ExamRes.comment.insert({eid: $scope.examToBeReviewed.id, cid: 0}, examFeedback, function (comment) {
                            toastr.info("Kommentti lisätty tenttiin.");
                            $scope.examToBeReviewed.examFeedback.comment = comment;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                // Called when the review ready button is clicked
                $scope.examReviewReady = function (reviewed_exam) {

                    if (confirm($translate('sitnet_mark_as_graded_tooltip') +" "+ $translate('sitnet_are_you_sure'))) {
                        $scope.saveFeedback();

                        var examToReview = {
                            "id": reviewed_exam.id,
                            "state": 'GRADED',
                            "grade": reviewed_exam.grade,
                            "otherGrading": reviewed_exam.otherGrading,
                            "totalScore": reviewed_exam.totalScore,
                            "creditType": reviewed_exam.creditType

                        };

                        ExamRes.review.update({id: examToReview.id}, examToReview, function (exam) {
                            toastr.info("Tentti on tarkastettu.");
                            $location.path("/exams/reviews/" + reviewed_exam.parent.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                // called when Save button is clicked
                $scope.updateExam = function (reviewed_exam) {

                    var examToReview = {
                        "id": reviewed_exam.id,
                        "state": reviewed_exam.state,
                        "grade": reviewed_exam.grade,
                        "otherGrading": reviewed_exam.otherGrading,
                        "totalScore": reviewed_exam.totalScore,
                        "creditType": reviewed_exam.creditType
                    };

                    ExamRes.review.update({id: examToReview.id}, examToReview, function (exam) {
                        toastr.info("Tentti on tarkastettu.");
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.message = "";

                // called when send email button is clicked
                $scope.sendEmailMessage = function () {

                    ExamRes.email.inspection({eid: $scope.examToBeReviewed.id, msg: $scope.message}, function (response) {
                        toastr.info("Viesti lähetetty");
                        $scope.message = "";
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.sendReviewFeedback = true;

                $scope.saveExamRecord = function (reviewed_exam) {

                    if (confirm($translate('sitnet_confirm_record_review'))) {

                        var examToRecord = {
                            "id": reviewed_exam.id,
                            "state": "GRADED_LOGGED",
                            "grade": reviewed_exam.grade,
                            "otherGrading": reviewed_exam.otherGrading,
                            "totalScore": reviewed_exam.totalScore,
                            "creditType": reviewed_exam.creditType,
                            "sendFeedback": $scope.sendReviewFeedback
                        };

                        ExamRes.saveRecord.add(examToRecord, function (exam) {
                            toastr.info("Suoritus kirjattu.");
                            $location.path("exams/reviews/" + reviewed_exam.parent.id);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };
            }]);
}());