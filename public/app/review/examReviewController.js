(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamReviewController', ['dialogs', '$document', '$rootScope', '$scope', 'sessionService',
            'examService', 'questionService', '$routeParams', '$http', '$modal', '$location', '$translate',
            '$timeout', '$sce', 'EXAM_CONF', 'ExamRes', 'LanguageRes', 'LanguageInspectionRes', 'QuestionRes', 'dateService', 'fileService',
            function (dialogs, $document, $rootScope, $scope, sessionService, examService, questionService,
                      $routeParams, $http, $modal, $location, $translate, $timeout, $sce, EXAM_CONF, ExamRes, LanguageRes,
                      LanguageInspectionRes, QuestionRes, dateService, fileService) {

                $scope.generalInfoPath = EXAM_CONF.TEMPLATES_PATH + "review/exam_general_info.html";
                $scope.reviewSectionPath = EXAM_CONF.TEMPLATES_PATH + "review/exam_section.html";
                $scope.multiplechoiceQuestionPath = EXAM_CONF.TEMPLATES_PATH + "review/multiple_choice_question.html";
                $scope.essayQuestionPath = EXAM_CONF.TEMPLATES_PATH + "review/essay_question.html";
                $scope.previousParticipationPath = EXAM_CONF.TEMPLATES_PATH + "review/previous_participation.html";
                $scope.feedbackWindowPath = EXAM_CONF.TEMPLATES_PATH + "review/feedback.html";
                $scope.multiChoiceAnswerTemplate = EXAM_CONF.TEMPLATES_PATH + "review/multiple_choice_answer.html";
                $scope.weightedMultiChoiceAnswerTemplate = EXAM_CONF.TEMPLATES_PATH + "review/weighted_multiple_choice_answer.html";
                $scope.printSectionTemplate = EXAM_CONF.TEMPLATES_PATH + "review/print/exam_section.html";
                $scope.printMultiChoiceQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "review/print/multiple_choice_question.html";
                $scope.printEssayQuestionTemplate = EXAM_CONF.TEMPLATES_PATH + "review/print/essay_question.html";

                $scope.printExam = function () {
                    window.open("/#/print/exam/" + $scope.exam.id, "_blank");
                };

                $scope.init = function () {
                    $document.ready(function () {
                        setTimeout(function () {
                            window.print();
                        }, 2000);
                    });
                };

                $scope.user = sessionService.getUser();

                $scope.inspections = [];
                $scope.examGrading = [];
                $scope.examTypes = [];
                $scope.selections = {};

                var pickExamLanguage = function () {
                    var lang = $scope.exam.answerLanguage;
                    if (lang) {
                        return {code: lang}
                    }
                    else if ($scope.exam.examLanguages.length == 1) {
                        lang = $scope.exam.examLanguages[0];
                    }
                    return lang;
                };


                $scope.setLanguage = function (lang) {
                    $scope.selections.language = lang;
                    $scope.exam.answerLanguage = lang ? lang.name : lang;
                };

                $scope.setCreditType = function () {
                    if ($scope.selections.type && $scope.selections.type.type) {
                        $scope.exam.creditType = {type: $scope.selections.type.type};
                    } else {
                        delete $scope.exam.creditType;
                    }
                };

                $scope.setGrade = function () {
                    if ($scope.selections.grade && $scope.selections.grade.id) {
                        $scope.exam.grade = $scope.selections.grade;
                    } else {
                        delete $scope.exam.grade;
                    }
                };

                $scope.checkCreditType = function (creditType) {
                    return creditType.type === $scope.selections.type;
                };

                var setGrade = function () {
                    if (!$scope.exam.grade || !$scope.exam.grade.id) {
                        $scope.exam.grade = {};
                    }
                    var scale = $scope.exam.gradeScale || $scope.exam.parent.gradeScale || $scope.exam.course.gradeScale;
                    $scope.examGrading = scale.grades.map(function (grade) {
                        grade.name = examService.getExamGradeDisplayName(grade.name);
                        if ($scope.exam.grade && $scope.exam.grade.id === grade.id) {
                            $scope.selections.grade = grade;
                        }
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

                var setQuestionAmounts = function () {
                    angular.forEach($scope.exam.examSections, function (section) {
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
                };

                var setCredits = function () {
                    examService.refreshExamTypes().then(function (types) {
                        var examType = $scope.exam.creditType || $scope.exam.examType;
                        $scope.examTypes = types;
                        types.forEach(function (type) {
                            if ($scope.exam.creditType && examType.type.toUpperCase() === type.type) {
                                $scope.selections.type = type;
                            }
                        });
                    });
                    if ($scope.exam && !$scope.exam.customCredit) {
                        $scope.exam.customCredit = $scope.exam.course.credits;
                    }
                };

                var setExamLanguage = function () {
                    var lang = pickExamLanguage();
                    LanguageRes.languages.query(function (languages) {
                        $scope.languages = languages.map(function (language) {
                            if (lang && lang.code === language.code) {
                                $scope.selections.language = language;
                            }
                            language.name = getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                $scope.$on('$localeChangeSuccess', function () {
                    setCredits();
                });

                var setTemplates = function () {
                    if ($scope.exam.executionType.type === 'MATURITY') {
                        $scope.toolbarPath = EXAM_CONF.TEMPLATES_PATH + "review/maturity_toolbar.html";
                        $scope.gradingPath = EXAM_CONF.TEMPLATES_PATH + "review/maturity_grading.html";
                    } else {
                        $scope.toolbarPath = EXAM_CONF.TEMPLATES_PATH + "review/toolbar.html";
                        $scope.gradingPath = EXAM_CONF.TEMPLATES_PATH + "review/grading.html";
                    }
                };

                var isOwner = function () {
                    return $scope.exam.parent.examOwners.map(function (owner) {
                            return owner.id;
                        }).indexOf($scope.user.id) !== -1;
                };

                var isCreator = function () {
                    return $scope.exam.parent.creator.id === $scope.user.id;
                };

                $scope.isCreatorOrOwnerOrAdmin = function () {
                    return $scope.exam && ($scope.user.isAdmin || isCreator() || isOwner());
                };

                $scope.isReadOnly = function () {
                    return !$scope.exam ||
                        ["GRADED_LOGGED", "ARCHIVED", "ABORTED"].indexOf($scope.exam.state) > -1;
                };

                $scope.isGraded = function () {
                    return $scope.exam && $scope.exam.state === "GRADED";
                };


                $scope.isUnderLanguageInspection = function () {
                    return $scope.exam && $scope.exam.languageInspection;
                };

                $scope.reviewStatus = [
                    {
                        "key": true,
                        "value": $translate.instant('sitnet_ready')
                    },
                    {
                        "key": false,
                        "value": $translate.instant('sitnet_in_progress')
                    }
                ];

                $scope.toggleReady = function () {
                    angular.forEach($scope.inspections, function (inspection) {
                        if (inspection.user.id === $scope.user.id) {
                            // toggle ready ->
                            ExamRes.inspectionReady.update({
                                id: inspection.id,
                                ready: inspection.ready
                            }, function (result) {
                                toastr.info($translate.instant('sitnet_exam_updated'));
                                inspection.ready = result.ready;
                                $scope.startReview();
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        }
                    });
                };

                var getExamInspections = function () {
                    ExamRes.inspections.query({id: $scope.exam.id},
                        function (inspections) {
                            $scope.inspections = inspections;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                var getStudentInfo = function () {
                    ExamRes.studentInfo.get({id: $routeParams.id},
                        function (info) {
                            $scope.userInfo = info;
                            if (info && info.duration) {
                                var duration = moment.utc(new Date(info.duration));
                                if (duration.second() > 29) {
                                    duration.add(1, 'minutes');
                                }
                                $scope.userInfo.duration = duration.format('HH:mm');
                            }
                            // get previous participations ->
                            ExamRes.examParticipationsOfUser.query(
                                {
                                    eid: $scope.exam.parent.id,
                                    uid: $scope.userInfo.user.id
                                }, function (participations) {
                                    $scope.previousParticipations = participations;
                                });

                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                var getReservationInfo = function () {
                    ExamRes.reservationInfo.get({eid: $routeParams.id},
                        function (reservation) {
                            $scope.reservation = reservation;
                        }
                    );
                };

                var getEnrolments = function () {
                    ExamRes.examEnrolments.query({eid: $routeParams.id}, function (enrolments) {
                        if (enrolments.length > 1) {
                            console.log("WARNING: found several enrolments for a student exam!");
                        }
                        $scope.enrolment = enrolments[0];
                    });
                };


                // Get the exam that was specified in the URL
                ExamRes.reviewerExam.get({eid: $routeParams.id},
                    function (exam) {
                        $scope.exam = exam;

                        setQuestionAmounts();
                        setExamLanguage();
                        setCredits();
                        setGrade();
                        setTemplates();

                        getExamInspections();
                        getStudentInfo();
                        getReservationInfo();
                        getEnrolments();
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

                $scope.scoreWeightedMultipleChoiceAnswer = function (question) {
                    if (question.type !== 'WeightedMultipleChoiceQuestion' || !question.answer) {
                        return 0;
                    }
                    var score = question.options.filter(function (o) {
                        return o.answer;
                    }).reduce(function (a, b) {
                        return a + b.score;
                    }, 0);
                    return Math.max(0, score)
                };

                $scope.scoreMultipleChoiceAnswer = function (sectionQuestion) {
                    var score = 0;
                    var question = sectionQuestion.question;
                    if (question.type !== 'MultipleChoiceQuestion') {
                        return 0;
                    }
                    if (question.answer === null) {
                        return 0;
                    }
                    if (question.answer.options.length != 1) {
                        console.error("multiple options selected for a MultiChoice answer!");
                    }
                    if (question.answer.options[0].correctOption === true) {
                        score = question.maxScore;
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
                                    return 0;
                                }
                                if (question.answer.options.length != 1) {
                                    console.error("multiple options selected for a MultiChoice answer!");
                                }
                                if (question.answer.options[0].correctOption === true) {
                                    score += question.maxScore;
                                }
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                if (question.answer === null) {
                                    return 0;
                                }
                                score += question.answer.options.reduce(function (a, b) {
                                    return a + b.score;
                                }, 0);
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

                $scope.calculateMaxPoints = function (question) {
                    return questionService.calculateMaxPoints(question);
                };

                $scope.getSectionMaxScore = function (section) {
                    var score = 0;

                    angular.forEach(section.sectionQuestions, function (sectionQuestion) {
                        var question = sectionQuestion.question;
                        switch (question.type) {
                            case "MultipleChoiceQuestion":
                                score += question.maxScore;
                                break;
                            case "WeightedMultipleChoiceQuestion":
                                score += questionService.calculateMaxPoints(question);
                                break;
                            case "EssayQuestion":
                                if (question.evaluationType == 'Points') {
                                    score += question.maxScore;
                                }
                                break;

                            default:
                                toastr.error($translate.instant('sitnet_unknown_question_type') + ": " + question.type);
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
                        $scope.exam.totalScore = total;
                        return total;
                    }
                };

                var refreshRejectedAcceptedCounts = function () {
                    var accepted = 0;
                    var rejected = 0;
                    angular.forEach($scope.exam.examSections, function (section) {
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
                        "state": state || exam.state,
                        "grade": exam.grade && exam.grade.id ? exam.grade.id : undefined,
                        "customCredit": exam.customCredit,
                        "totalScore": exam.totalScore,
                        "creditType": exam.creditType && exam.creditType.type ? exam.creditType.type : undefined,
                        "answerLanguage": $scope.selections.language ? $scope.selections.language.code : undefined,
                        "additionalInfo": exam.additionalInfo
                    };
                };

                // Set review status as started if not already done so
                $scope.startReview = function () {
                    if ($scope.exam.state === 'REVIEW') {
                        var review = getReviewUpdate($scope.exam, 'REVIEW_STARTED');
                        ExamRes.review.update({id: review.id}, review);
                    }
                };

                $scope.insertEssayScore = function (sectionQuestion) {
                    var question = sectionQuestion.question;
                    QuestionRes.score.update({id: question.id}, {"evaluatedScore": question.evaluatedScore}, function (q) {
                        toastr.info($translate.instant("sitnet_graded"));
                        if (q.evaluationType === "Select") {
                            refreshRejectedAcceptedCounts();
                        }
                        $scope.startReview();
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.getTeacherCount = function () {
                    var count = $scope.inspections.length;
                    if ($scope.exam &&
                        $scope.exam.parent &&
                        $scope.exam.parent.examOwners) {
                        // Do not add up if user exists in both groups
                        var uniques = $scope.exam.parent.examOwners.filter(function (owner) {
                            return $scope.inspections.map(function (inspection) {
                                    return inspection.user.id;
                                }).indexOf(owner.id) === -1;
                        });
                        count += uniques.length;
                    }
                    return count;
                };

                $scope.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                // Called when the save feedback button is clicked
                $scope.saveFeedback = function (withoutNotice) {

                    var examFeedback = {
                        "comment": $scope.exam.examFeedback.comment
                    };

                    // Update comment
                    if ($scope.exam.examFeedback.id) {
                        ExamRes.comment.update({
                            eid: $scope.exam.id,
                            cid: $scope.exam.examFeedback.id
                        }, examFeedback, function (exam) {
                            if (!withoutNotice) {
                                toastr.info($translate.instant("sitnet_comment_updated"));
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                        // Insert new comment
                    } else {
                        ExamRes.comment.insert({
                            eid: $scope.exam.id,
                            cid: 0
                        }, examFeedback, function (comment) {
                            if (!withoutNotice) {
                                toastr.info($translate.instant("sitnet_comment_added"));
                            }
                            $scope.exam.examFeedback = comment;
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                var checkCredit = function () {
                    var credit = $scope.exam.customCredit;
                    var valid = !isNaN(credit) && credit >= 0;
                    if (!valid) {
                        toastr.error($translate.instant('sitnet_not_a_valid_custom_credit'));
                        // Reset to default
                        $scope.exam.customCredit = $scope.exam.course.credits;
                    }
                    return valid;
                };

                var doUpdate = function (newState, review, messages, exam) {
                    ExamRes.review.update({id: review.id}, review, function () {
                        $scope.saveFeedback(true);
                        if (newState === 'REVIEW_STARTED') {
                            messages.forEach(function (msg) {
                                toastr.warning($translate.instant(msg));
                            });
                            $timeout(function () {
                                toastr.info($translate.instant('sitnet_review_saved'));
                            }, 1000);
                        } else {
                            toastr.info($translate.instant("sitnet_review_graded"));
                            if ($scope.user.isAdmin) {
                                $location.path("/");
                            } else {
                                $location.path("exams/reviews/" + exam.parent.id);
                            }
                        }
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                var updateMaturity = function (exam, messages, state) {
                    var review = getReviewUpdate(exam);
                    doUpdate(state || exam.state, review, messages, exam);
                };

                var updateExam = function (exam, messages) {
                    var oldState = exam.state;
                    var newState = messages.length > 0 ? 'REVIEW_STARTED' : 'GRADED';

                    if (newState !== 'GRADED' || oldState === 'GRADED') {
                        var review = getReviewUpdate(exam, newState);
                        doUpdate(newState, review, messages, exam);
                    } else {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                        dialog.result.then(function (btn) {
                            var review = getReviewUpdate(exam, newState);
                            doUpdate(newState, review, messages, exam);
                        });
                    }
                };


                // called when Save button is clicked
                $scope.updateExam = function (exam) {
                    if (!$scope.isCreatorOrOwnerOrAdmin()) {
                        if (exam.state !== 'GRADED') {
                            // Just save feedback and leave
                            $scope.saveFeedback(true);
                            toastr.info($translate.instant('sitnet_saved'));
                            $location.path("exams/reviews/" + exam.parent.id);
                        }
                    }
                    else {
                        if (!checkCredit()) {
                            return;
                        }
                        var messages = [];
                        if (!$scope.selections.grade) {
                            messages.push('sitnet_participation_unreviewed');
                        }
                        if (!$scope.selections.type) {
                            messages.push('sitnet_exam_choose_credit_type');
                        }
                        if (!$scope.selections.language) {
                            messages.push('sitnet_exam_choose_response_language');
                        }
                        if (exam.executionType.type === 'MATURITY') {
                            updateMaturity(exam, messages);
                        } else {
                            updateExam(exam, messages)
                        }
                    }
                };

                // called when send email button is clicked
                $scope.sendEmailMessage = function () {
                    if (!$scope.message || $scope.message.length === 0) {
                        toastr.error($translate.instant("sitnet_email_empty"));
                        return;
                    }
                    ExamRes.email.inspection({
                        eid: $scope.exam.id,
                        msg: $scope.message
                    }, function (response) {
                        toastr.info($translate.instant("sitnet_email_sent"));
                        $scope.message = "";
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.isSelected = function (grade) {
                    return grade && $scope.selections.grade && $scope.selections.grade.id === grade.id
                };

                $scope.saveExamRecord = function (reviewedExam) {

                    if (!checkCredit()) {
                        return;
                    }

                    var messages = [];
                    if (!reviewedExam.grade) {
                        if ($scope.selections.grade.id) {
                            reviewedExam.grade = {id: $scope.selections.grade.id};
                        } else {
                            messages.push('sitnet_participation_unreviewed');
                        }
                    }
                    if (!reviewedExam.creditType) {
                        if ($scope.selections.type) {
                            reviewedExam.creditType = $scope.selections.type;
                        } else {
                            messages.push('sitnet_exam_choose_credit_type');
                        }
                    }
                    if (!$scope.selections.language) {
                        messages.push('sitnet_exam_choose_response_language');
                    }
                    if (messages.length > 0) {
                        messages.forEach(function (msg) {
                            toastr.error($translate.instant(msg));
                        });
                    }
                    else {
                        var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                            examService.getRecordReviewConfirmationDialogContent(reviewedExam.examFeedback.comment));
                        dialog.result.then(function () {
                            $scope.saveFeedback(true);
                            var examToRecord = getReviewUpdate(reviewedExam, 'GRADED');
                            examToRecord.additionalInfo = $scope.additionalInfo;

                            ExamRes.review.update({id: examToRecord.id}, examToRecord, function () {
                                if (reviewedExam.state !== 'GRADED') {
                                    toastr.info($translate.instant("sitnet_review_graded"));
                                }
                                examToRecord.state = 'GRADED_AND_LOGGED';
                                ExamRes.saveRecord.add(examToRecord, function (exam) {
                                    toastr.info($translate.instant('sitnet_review_recorded'));
                                    if ($scope.user.isAdmin) {
                                        $location.path("/");
                                    } else {
                                        $location.path("exams/reviews/" + reviewedExam.parent.id);
                                    }
                                }, function (error) {
                                    toastr.error(error.data);
                                });
                            }, function (error) {
                                toastr.error(error.data);
                            });
                        });
                    }
                };

                $scope.selectFile = function () {

                    var exam = $scope.exam;

                    var ctrl = ["$scope", "$modalInstance", function ($scope, $modalInstance) {
                        $scope.exam = exam;
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });
                        $scope.submit = function () {
                            fileService.upload("attachment/exam/" + exam.id + "/feedback", $scope.attachmentFile,
                                {examId: $scope.exam.id}, $scope.exam.examFeedback, $modalInstance);
                        };
                        $scope.cancel = function () {
                            $modalInstance.dismiss('Canceled');
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/dialog_attachment_selection.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: ctrl
                    });

                    modalInstance.result.then(function () {
                        // OK button
                        $modalInstance.dismiss('Closed');
                    });
                };

                $scope.canProceedWithMaturity = function () {
                    return $scope.exam.grade && $scope.exam.examFeedback && $scope.exam.examFeedback.comment;
                };

                $scope.getNextMaturityProcess = function () {
                    var disapproved = !$scope.exam.grade || !$scope.exam.grade.name || ['REJECTED', 'I', '0'].indexOf($scope.exam.grade.name) > -1;
                    var text = disapproved ? 'sitnet_reject_maturity' : 'sitnet_send_for_language_inspection';
                    return {text: text, rejected: disapproved};
                };

                var rejectMaturity = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_maturity_disapproval'));
                    dialog.result.then(function () {
                        $scope.saveFeedback(true);
                        var params = getReviewUpdate($scope.exam, 'REJECTED');
                        ExamRes.review.update({id: $scope.exam.id}, params, function () {
                            toastr.info($translate.instant('suoritus hylätty'));
                            if ($scope.user.isAdmin) {
                                $location.path("/");
                            } else {
                                $location.path("exams/reviews/" + $scope.exam.parent.id);
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                var sendForLanguageInspection = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'),
                        $translate.instant('sitnet_confirm_maturity_approval'));
                    dialog.result.then(function () {
                        $scope.saveFeedback(true);
                        var params = getReviewUpdate($scope.exam, 'GRADED');
                        ExamRes.review.update({id: $scope.exam.id}, params, function () {
                            LanguageInspectionRes.inspection.add({examId: $scope.exam.id}, function() {

                            });
                            toastr.info($translate.instant('Suoritus lähetetty kielentarkastukseen'));
                            if ($scope.user.isAdmin) {
                                $location.path("/");
                            } else {
                                $location.path("exams/reviews/" + $scope.exam.parent.id);
                            }
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    });
                };

                $scope.proceedWithMaturity = function () {
                    // ask for confirmation
                    // rejected, set state = 'REJECTED' go to list
                    // move to lang inspection, set state = 'GRADED' create inspection object, go to list
                    if ($scope.getNextMaturityProcess().rejected) {
                        rejectMaturity();
                    } else {
                        sendForLanguageInspection();
                    }
                };

                $scope.stripHtml = function (text) {
                    if (text && text.indexOf("math-tex") === -1) {
                        return String(text).replace(/<[^>]+>/gm, '');
                    }
                    return text;
                };
            }
        ])
        .controller('RecordReviewConfirmationCtrl', function ($scope, $modalInstance) {
            $scope.yes = function () {
                $modalInstance.close();
            };

            $scope.no = function () {
                $modalInstance.dismiss('canceled');
            }
        });
}());
