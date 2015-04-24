(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamReviewController', ['dialogs', '$scope', 'sessionService', 'examService', '$sce', '$routeParams', '$http', '$modal', '$location', '$translate', '$timeout', 'SITNET_CONF', 'ExamRes', 'LanguageRes', 'QuestionRes', 'dateService',
            function (dialogs, $scope, sessionService, examService, $sce, $routeParams, $http, $modal, $location, $translate, $timeout, SITNET_CONF, ExamRes, LanguageRes, QuestionRes, dateService) {

                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "review/review_exam_section_general.html";
                $scope.reviewSectionPath = SITNET_CONF.TEMPLATES_PATH + "review/review_exam_section.html";
                $scope.multiplechoiceQuestionPath = SITNET_CONF.TEMPLATES_PATH + "review/review_multiplechoice_question.html";
                $scope.essayQuestionPath = SITNET_CONF.TEMPLATES_PATH + "review/review_essay_question.html";
                $scope.studentInfoTemplate = SITNET_CONF.TEMPLATES_PATH + "review/review_exam_student_info.html";
                $scope.previousParticipationPath = SITNET_CONF.TEMPLATES_PATH + "review/review_exam_previous_participation.html";
                $scope.gradingPath = SITNET_CONF.TEMPLATES_PATH + "review/review_exam_grading.html";

                $scope.user = sessionService.getUser();

                if (!$scope.user || $scope.user.isStudent) {
                    $location.path("/unauthorized");
                }

                $scope.globalInspections = [];
                $scope.localInspections = [];
                $scope.examGrading = [];
                $scope.examTypes = [];

                LanguageRes.languages.query(function (languages) {
                    $scope.languages = languages.map(function (language) {
                        language.name = getLanguageNativeName(language.code);
                        return language;
                    });
                });

                $scope.setLanguage = function (lang) {
                    $scope.selectedLanguage = lang;
                    $scope.examToBeReviewed.answerLanguage = lang ? lang.name : lang;
                };

                $scope.setCreditType = function (creditType) {
                    $scope.selectedType = creditType;
                    $scope.examToBeReviewed.creditType = {type: creditType};
                };

                $scope.setGrade = function (grade_id) {
                    $scope.examToBeReviewed.grade = $scope.selectedGrade = {id: grade_id};
                };


                $scope.checkCreditType = function (creditType) {
                    return creditType.type === $scope.selectedType;
                };

                $scope.checkGrade = function (grade) {
                    return $scope.selectedGrade && grade && grade.id === $scope.selectedGrade.id;
                };

                var refreshExamTypes = function () {
                    examService.refreshExamTypes().then(function (types) {
                        $scope.examTypes = types;
                    });
                };

                refreshExamTypes();

                $scope.$on('$localeChangeSuccess', function () {
                    refreshExamTypes();
                });

                var refreshGradeNames = function () {
                    if (!$scope.examToBeReviewed) return;
                    var scale = $scope.examToBeReviewed.gradeScale || $scope.examToBeReviewed.parent.gradeScale;
                    $scope.examGrading = scale.grades.map(function (grade) {
                        grade.name = examService.getExamGradeDisplayName(grade.name);
                        return grade;
                    });
                };

                $scope.translateGrade = function (exam) {
                    if (!exam.grade) {
                        return;
                    }
                    return examService.getExamGradeDisplayName(exam.grade.name);
                };

                $scope.hasEssayQuestions = false;
                $scope.acceptedEssays = 0;
                $scope.rejectedEssays = 0;

                // Get the exam that was specified in the URL
                ExamRes.reviewerExam.get({eid: $routeParams.id},
                    function (exam) {
                        $scope.examToBeReviewed = exam;
                        if (!$scope.examToBeReviewed.customCredit) {
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
                                });
                            });
                            if (exam.answerLanguage) {
                                $scope.selectedLanguage = exam.answerLanguage;
                            } else if (exam.examLanguages.length === 1) {
                                // Use parent's language as default answer language if there is a single one to choose from
                                $scope.selectedLanguage = getLanguageNativeName(exam.examLanguages[0].code);
                            }
                            if (exam.creditType) {
                                $scope.selectedType = exam.creditType.type.toUpperCase();
                            } else {
                                // default to examType
                                $scope.selectedType = exam.examType.type.toUpperCase();
                            }
                            if (exam.grade) {
                                $scope.selectedGrade = exam.grade;
                            }
                        }

                        var isOwner = function() {
                            return $scope.examToBeReviewed.parent.examOwners.map(function (owner) {
                                    return owner.id;
                                }).indexOf($scope.user.id) !== -1;
                        };

                        var isCreator = function() {
                            return $scope.examToBeReviewed.parent.creator.id === $scope.user.id;
                        };

                        $scope.isCreatorOrOwnerOrAdmin = function () {
                            return $scope.examToBeReviewed && ($scope.user.isAdmin || isCreator() || isOwner());
                        };

                        $scope.isReadOnly = $scope.examToBeReviewed.state === "GRADED_LOGGED" || $scope.examToBeReviewed.state === "ABORTED";
                        $scope.isGraded = $scope.examToBeReviewed.state === "GRADED";

                        refreshGradeNames();

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
                            if ($scope.localInspections && $scope.localInspections.length > 0) {
                                angular.forEach($scope.localInspections, function (localInspection) {
                                    if (localInspection.user && localInspection.user.id && localInspection.user.id === userId) {
                                        ready = localInspection.ready;
                                    }
                                });
                            }
                            return ready;
                        };

                        $scope.toggleReady = function () {
                            angular.forEach($scope.localInspections, function (localInspection) {
                                if (localInspection && localInspection.user.id === $scope.user.id) {
                                    // toggle ready ->
                                    var ready = !$scope.reviewReady;
                                    ExamRes.inspectionReady.update({
                                        id: localInspection.id,
                                        ready: ready
                                    }, function (result) {
                                        toastr.info($translate('sitnet_exam_updated'));
                                        $scope.reviewReady = ready;
                                        $scope.startReview();
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

                                // get student exam inspections ->
                                ExamRes.inspections.get({id: $scope.examToBeReviewed.id},
                                    function (locals) {

                                        var isCurrentUserInspectionCreated = false;
                                        $scope.localInspections = locals;

                                        // created local inspections, if not created ->
                                        if ($scope.localInspections && $scope.localInspections.length > 0) {
                                            angular.forEach($scope.localInspections, function (localInspection) {
                                                if (localInspection.user.id === $scope.user.id) {
                                                    isCurrentUserInspectionCreated = true;
                                                    $scope.reviewReady = localInspection.ready;
                                                }
                                            });
                                        }

                                        // if user doesn't already have an inspection, create, otherwise skip ->
                                        if (isCurrentUserInspectionCreated === false) {
                                            ExamRes.localInspection.insert({
                                                eid: $scope.examToBeReviewed.id,
                                                uid: $scope.user.id
                                            }, function (newLocalInspection) {
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

                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );

                        ExamRes.studentInfo.get({id: $routeParams.id},
                            function (info) {
                                $scope.userInfo = info;
                                if (info && info.duration) {
                                    $scope.userInfo.duration = moment.utc(Date.parse(info.duration)).format('HH:mm');
                                }
                                // get previous participations ->
                                ExamRes.examParticipationsOfUser.query(
                                    {
                                        eid: $scope.examToBeReviewed.parent.id,
                                        uid: $scope.userInfo.user.id
                                    }, function (participations) {
                                        $scope.previousParticipations = participations;
                                    });

                            },
                            function (error) {
                                toastr.error(error.data);
                            }
                        );
                        ExamRes.reservation.get({eid: $routeParams.id},
                            function (reservation) {
                                $scope.reservation = reservation;
                            }
                        );
                        ExamRes.examEnrolments.query({eid: $routeParams.id}, function (enrolments) {
                            if (enrolments.length > 0) {
                                console.log("WARNING: found several enrolments for a student exam!");
                            }
                            $scope.enrolment = enrolments[0];
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                $scope.viewAnswers = function (examId) {
                    window.open("/#/exams/review/" + examId, "_blank");
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.scoreMultipleChoiceAnswer = function (sectionQuestion) {
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

                $scope.range = function (min, max, step) {
                    step |= 1;
                    var input = [];
                    for (var i = min; i <= max; i += step) {
                        input.push(i);
                    }
                    return input;
                };

                $scope.getSectionTotalScore = function (section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                if (question.answer === null) {
                                    question.backgroundColor = 'grey';
                                    return 0;
                                }
                                if (question.answer.option.correctOption === true) {
                                    score += question.maxScore;
                                }
                                break;
                            case "EssayQuestion":

                                if (question.evaluatedScore && question.evaluationType === 'Points') {
                                    var number = parseFloat(question.evaluatedScore);
                                    if (angular.isNumber(number)) {
                                        score += number;
                                    }
                                }
                                break;
                            default:
                                break;
                        }
                    });
                    return score;
                };

                $scope.getSectionMaxScore = function (section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
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

                $scope.getExamMaxPossibleScore = function (exam) {
                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function (section) {
                            total += $scope.getSectionMaxScore(section);
                        });

                        return total;
                    }
                };

                $scope.getExamTotalScore = function (exam) {
                    if (exam) {
                        var total = 0;
                        angular.forEach(exam.examSections, function (section) {
                            total += $scope.getSectionTotalScore(section);
                        });
                        $scope.examToBeReviewed.totalScore = total;
                        return total;
                    }
                };

                $scope.truncate = function (answer, offset) {
                    if (answer && answer.indexOf("math-tex") === -1) {
                        if (offset < answer.length) {
                            return answer.substring(0, offset) + " ...";
                        } else {
                            return answer;
                        }
                    }
                    return answer;
                };

                var refreshRejectedAcceptedCounts = function () {
                    var accepted = 0;
                    var rejected = 0;
                    angular.forEach($scope.examToBeReviewed.examSections, function (section) {
                        angular.forEach(section.sectionQuestions, function (sectionQuestion) {
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

                $scope.toggleQuestionExpansion = function (sectionQuestion) {
                    sectionQuestion.question.reviewExpanded = !sectionQuestion.question.reviewExpanded;
                };

                var getReviewUpdate = function (exam, state) {
                    return {
                        "id": exam.id,
                        "state": state,
                        "grade": exam.grade.id,
                        "customCredit": exam.customCredit,
                        "totalScore": exam.totalScore,
                        "creditType": $scope.selectedType,
                        "answerLanguage": $scope.selectedLanguage,
                        "additionalInfo": exam.additionalInfo
                    };
                };

                // Set review status as started if not already done so
                $scope.startReview = function () {
                    if ($scope.examToBeReviewed.state === 'REVIEW') {
                        var review = getReviewUpdate($scope.examToBeReviewed, 'REVIEW_STARTED');
                        ExamRes.review.update({id: review.id}, review);
                    }
                };

                $scope.insertEssayScore = function (sectionQuestion) {
                    var question = sectionQuestion.question;
                    QuestionRes.score.update({id: question.id}, {"evaluatedScore": question.evaluatedScore}, function (q) {
                        toastr.info($translate("sitnet_graded"));
                        if (q.evaluationType === "Select") {
                            refreshRejectedAcceptedCounts();
                        }
                        $scope.startReview();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.toggleFeedbackHiding = function (hidden) {
                    if (hidden) {
                        $scope.saveFeedback();
                    }
                    return !hidden;
                };

                // Called when the save feedback button is clicked
                $scope.saveFeedback = function (withoutNotice) {

                    var examFeedback = {
                        "comment": $scope.examToBeReviewed.examFeedback.comment
                    };

                    // Update comment
                    if ($scope.examToBeReviewed.examFeedback.id) {
                        ExamRes.comment.update({
                            eid: $scope.examToBeReviewed.id,
                            cid: $scope.examToBeReviewed.examFeedback.id
                        }, examFeedback, function (exam) {
                            if (!withoutNotice) {
                                toastr.info($translate("sitnet_comment_updated"));
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                        // Insert new comment
                    } else {
                        ExamRes.comment.insert({
                            eid: $scope.examToBeReviewed.id,
                            cid: 0
                        }, examFeedback, function (comment) {
                            if (!withoutNotice) {
                                toastr.info($translate("sitnet_comment_added"));
                            }
                            $scope.examToBeReviewed.examFeedback = comment;
                            $scope.startReview();
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                var checkCredit = function () {
                    var credit = $scope.examToBeReviewed.customCredit;
                    var valid = !isNaN(credit) && credit >= 0;
                    if (!valid) {
                        toastr.error($translate('sitnet_not_a_valid_custom_credit'));
                        // Reset to default
                        $scope.examToBeReviewed.customCredit = $scope.examToBeReviewed.course.credits;
                    }
                    return valid;
                };

                var doUpdate = function (newState, review, messages, exam) {
                    ExamRes.review.update({id: review.id}, review, function () {
                        $scope.saveFeedback(true);
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach(function (msg) {
                                toastr.warning($translate(msg));
                            });
                            $timeout(function () {
                                toastr.info($translate('sitnet_review_saved'));
                            }, 1000);
                        } else {
                            toastr.info($translate("sitnet_review_graded"));
                            if ($scope.user.isAdmin) {
                                $location.path("/home");
                            } else {
                                $location.path("exams/reviews/" + exam.parent.id);
                            }
                        }
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                // called when Save button is clicked
                $scope.updateExam = function (reviewed_exam) {
                    if (!$scope.isCreatorOrOwnerOrAdmin()) {
                        if (reviewed_exam.state !== 'GRADED') {
                            // Just save feedback and leave
                            $scope.saveFeedback(true);
                            toastr.info($translate('sitnet_saved'));
                            $location.path("exams/reviews/" + reviewed_exam.parent.id);
                        }
                    }
                    else {
                        if (!checkCredit()) {
                            return;
                        }
                        var messages = [];
                        if (!$scope.selectedGrade) {
                            messages.push('sitnet_participation_unreviewed');
                        }
                        if (!$scope.selectedType) {
                            messages.push('sitnet_exam_choose_credit_type');
                        }
                        if (!$scope.selectedLanguage) {
                            messages.push('sitnet_exam_choose_response_language');
                        }
                        var oldState = reviewed_exam.state;
                        var newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';

                        if (newState !== 'GRADED' || oldState === 'GRADED') {
                            var review = getReviewUpdate(reviewed_exam, newState);
                            doUpdate(newState, review, messages, reviewed_exam);
                        } else {
                            var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate('sitnet_confirm_grade_review'));
                            dialog.result.then(function (btn) {
                                var review = getReviewUpdate(reviewed_exam, newState);
                                doUpdate(newState, review, messages, reviewed_exam);
                            });
                        }
                    }
                };

                // called when send email button is clicked
                $scope.sendEmailMessage = function () {
                    ExamRes.email.inspection({
                        eid: $scope.examToBeReviewed.id,
                        msg: $scope.message
                    }, function (response) {
                        toastr.info($translate("sitnet_email_sent"));
                        $scope.message = "";
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.saveExamRecord = function (reviewed_exam) {

                    if (!checkCredit()) {
                        return;
                    }

                    var messages = [];
                    if (!reviewed_exam.grade) {
                        messages.push('sitnet_participation_unreviewed');
                    }
                    if (!reviewed_exam.creditType) {
                        messages.push('sitnet_exam_choose_credit_type');
                    }
                    if (!$scope.selectedLanguage) {
                        messages.push('sitnet_exam_choose_response_language');
                    }
                    if (messages.length > 0) {
                        messages.forEach(function (msg) {
                            toastr.error($translate(msg));
                        });
                    }
                    else {
                        var dialog = dialogs.confirm($translate('sitnet_confirm'), $translate('sitnet_confirm_record_review'));
                        dialog.result.then(function (btn) {
                            $scope.saveFeedback(true);
                            var examToRecord = getReviewUpdate(reviewed_exam, 'GRADED_LOGGED');
                            examToRecord.additionalInfo = $scope.additionalInfo;

                            ExamRes.saveRecord.add(examToRecord, function (exam) {
                                toastr.info($translate('sitnet_review_recorded'));
                                if ($scope.user.isAdmin) {
                                    $location.path("/home");
                                } else {
                                    $location.path("exams/reviews/" + reviewed_exam.parent.id);
                                }
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        });
                    }
                };

                $scope.stripHtml = function (text) {
                    if (text && text.indexOf("math-tex") === -1) {
                        return String(text).replace(/<[^>]+>/gm, '');
                    }
                    return text;
                };
            }
        ]);
}());
