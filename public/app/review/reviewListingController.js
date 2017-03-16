(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ReviewListingController', ['$filter', 'dialogs', '$scope', '$q', '$route', '$routeParams',
            '$location', '$translate', 'ExamRes', 'dateService', 'examService', 'examReviewService', 'fileService', '$uibModal', 'EXAM_CONF',
            function ($filter, dialogs, $scope, $q, $route, $routeParams, $location, $translate, ExamRes, dateService,
                      examService, examReviewService, fileService, $modal, EXAM_CONF) {

                $scope.reviewPredicate = 'examReview.deadline';
                $scope.abortedPredicate = 'examReview.user.lastName';
                $scope.reverse = false;
                $scope.toggleLoggedReviews = false;
                $scope.toggleReviews = false;
                $scope.toggleGradedReviews = false;
                $scope.view = {filter: 'IN_PROGRESS'};
                $scope.examInfo = {};

                $scope.templates = {
                    noShowPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/no_show.html",
                    abortedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/aborted.html",
                    reviewStartedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/review_started.html",
                    speedReviewPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/speed_review.html",
                    languageInspectionPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/language_inspection.html",
                    gradedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/graded.html",
                    gradedLoggedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/graded_logged.html",
                    rejectedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/rejected.html",
                    archivedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/archived.html"
                };

                $scope.selections = {graded: {all: false, page: false}, gradedLogged: {all: false, page: false}};
                $scope.pageSize = 10;

                $scope.translateGrade = function (exam) {
                    var grade = exam.grade ? exam.grade.name : 'NONE';
                    return examService.getExamGradeDisplayName(grade);
                };

                $scope.showFeedbackEditor = function (exam) {
                    examReviewService.showFeedbackEditor(exam);
                };

                $scope.isAllowedToGrade = function (exam) {
                    return examService.isOwnerOrAdmin(exam);
                };

                var getErrors = function (exam) {
                    var messages = [];
                    if (!$scope.isAllowedToGrade(exam)) {
                        messages.push('sitnet_error_unauthorized');
                    }
                    if (!exam.creditType && !exam.examType) {
                        messages.push('sitnet_exam_choose_credit_type');
                    }
                    if (!exam.answerLanguage && exam.examLanguages.length != 1) {
                        messages.push('sitnet_exam_choose_response_language');
                    }
                    return messages;
                };

                var gradeExam = function (review) {
                    var deferred = $q.defer();
                    var exam = review.exam;
                    var messages = getErrors(exam);
                    if (!exam.selectedGrade && !exam.grade.id) {
                        messages.push('sitnet_participation_unreviewed');
                    }
                    messages.forEach(function (msg) {
                        toastr.warning($translate.instant(msg));
                    });
                    if (messages.length === 0) {
                        var grade;
                        if (exam.selectedGrade.type === 'NONE') {
                            grade = undefined;
                            exam.gradeless = true;
                        } else {
                            grade = exam.selectedGrade.id ? exam.selectedGrade : exam.grade;
                            exam.gradeless = false;
                        }
                        var data = {
                            "id": exam.id,
                            "state": "GRADED",
                            "gradeless": exam.gradeless,
                            "grade": grade ? grade.id : undefined,
                            "customCredit": exam.customCredit,
                            "creditType": exam.creditType ? exam.creditType.type : exam.examType.type,
                            "answerLanguage": exam.answerLanguage ? exam.answerLanguage.code : exam.examLanguages[0].code
                        };
                        ExamRes.review.update({id: exam.id}, data, function () {
                            $scope.examReviews.splice($scope.examReviews.indexOf(review), 1);
                            exam.gradedTime = new Date().getTime();
                            exam.grade = grade;
                            $scope.gradedReviews.push(review);
                            deferred.resolve();
                        }, function (error) {
                            toastr.error(error.data);
                            deferred.reject();
                        });
                    } else {
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                var setGrade = function (exam) {
                    if (!exam.grade || !exam.grade.id) {
                        exam.grade = {};
                    }
                    if (!exam.selectedGrade) {
                        exam.selectedGrade = {};
                    }
                    var scale = exam.gradeScale || exam.parent.gradeScale || exam.course.gradeScale;
                    scale.grades = scale.grades || [];
                    exam.selectableGrades = scale.grades.map(function (grade) {
                        grade.type = grade.name;
                        grade.name = examService.getExamGradeDisplayName(grade.name);
                        if (exam.grade && exam.grade.id === grade.id) {
                            exam.grade.type = grade.type;
                            exam.selectedGrade = grade;
                        }
                        return grade;
                    });
                    var noGrade = {type: 'NONE', name: examService.getExamGradeDisplayName('NONE')};
                    if (exam.gradeless && !exam.selectedGrade) {
                        exam.selectedGrade = noGrade;
                    }
                    exam.selectableGrades.push(noGrade);
                };

                $scope.isGradeable = function (exam) {
                    return exam && getErrors(exam).length === 0;
                };

                $scope.hasModifications = function () {
                    return $scope.examReviews.filter(function (r) {
                            return r.exam.selectedGrade &&
                                (r.exam.selectedGrade.id || r.exam.selectedGrade.type === 'NONE') &&
                                $scope.isGradeable(r.exam);
                        }).length > 0;
                };

                $scope.gradeExams = function () {
                    var reviews = $scope.examReviews.filter(function (r) {
                        return r.exam.selectedGrade.type && $scope.isGradeable(r.exam);
                    });
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_grade_review'));
                    dialog.result.then(function (btn) {
                        var promises = [];
                        reviews.forEach(function (r) {
                            promises.push(gradeExam(r));
                        });
                        $q.all(promises).then(function () {
                            toastr.info($translate.instant('sitnet_saved'));
                        });
                    });
                };

                ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                    if (exam.course && exam.course.code) {
                        $scope.examInfo.title = exam.course.code + " " + exam.name;
                    } else {
                        $scope.examInfo.title = exam.name;
                    }
                    $scope.examInfo.examOwners = exam.examOwners;
                });

                var resetSelections = function (name, view) {
                    var scope = $scope.selections[name];
                    var prev, next;
                    for (var k in scope) {
                        if (scope.hasOwnProperty(k)) {
                            if (k === view) {
                                scope[k] = !scope[k];
                                next = scope[k];
                            } else {
                                if (scope[k]) {
                                    prev = true;
                                }
                                scope[k] = false;
                            }
                        }
                    }
                    return prev && next;
                };

                $scope.selectAll = function (name, items) {
                    var override = resetSelections(name, 'all');
                    items.forEach(function (i) {
                        i.selected = !i.selected || override;
                    });
                };


                $scope.selectPage = function (name, items, boxClass) {
                    var override = resetSelections(name, 'page');
                    var boxes = angular.element("." + boxClass);
                    var ids = [];
                    angular.forEach(boxes, function (input) {
                        ids.push(parseInt(angular.element(input).val()));
                    });
                    // init all as not selected
                    if (override) {
                        items.forEach(function (i) {
                            i.selected = false;
                        });
                    }
                    var pageItems = items.filter(function (i) {
                        return ids.indexOf(i.exam.id) > -1;
                    });
                    pageItems.forEach(function (pi) {
                        pi.selected = !pi.selected || override;
                    });
                };

                var getSelectedReviews = function (items) {
                    var objects = items.filter(function (i) {
                        return i.selected;
                    });
                    if (objects.length === 0) {
                        toastr.warning($translate.instant('sitnet_choose_atleast_one'));
                        return;
                    }
                    return objects;
                };

                $scope.archiveSelected = function () {
                    var selection = getSelectedReviews($scope.gradedLoggedReviews);
                    if (!selection) {
                        return;
                    }
                    var ids = selection.map(function (r) {
                        return r.exam.id;
                    });
                    ExamRes.archive.update({ids: ids.join()}, function () {
                        $scope.gradedLoggedReviews = $scope.gradedLoggedReviews.filter(function (r) {
                            if (ids.indexOf(r.exam.id) > -1) {
                                $scope.archivedReviews.push(r);
                                return false;
                            }
                            return true;
                        });
                        toastr.info($translate.instant('sitnet_exams_archived'));
                    });
                };

                $scope.printSelected = function (asReport) {
                    var selection = getSelectedReviews($scope.gradedLoggedReviews);
                    if (!selection) {
                        return;
                    }
                    var url = '/app/exam/record/export/';
                    if (asReport) {
                        url += "report/";
                    }
                    var fileType = asReport ? '.xlsx' : '.csv';
                    var ids = selection.map(function (r) {
                        return r.exam.id;
                    });

                    fileService.download(url + $routeParams.id,
                        $translate.instant("sitnet_grading_info") + '_' + $filter('date')(Date.now(), "dd-MM-yyyy") + fileType,
                        {'childIds': ids});
                };

                var send = function (review) {
                    var deferred = $q.defer();
                    var exam = review.exam;
                    var resource = exam.gradeless ? ExamRes.register : ExamRes.saveRecord;
                    if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
                        var examToRecord = {
                            "id": exam.id,
                            "state": "GRADED_LOGGED",
                            "grade": exam.grade,
                            "customCredit": exam.customCredit,
                            "totalScore": exam.totalScore,
                            "creditType": exam.creditType,
                            "sendFeedback": true,
                            "answerLanguage": exam.answerLanguage
                        };

                        resource.add(examToRecord, function () {
                            review.selected = false;
                            review.displayedGradingTime = review.exam.languageInspection ?
                                review.exam.languageInspection.finishedAt : review.exam.gradedTime;
                            $scope.gradedReviews.splice($scope.gradedReviews.indexOf(review), 1);
                            $scope.gradedLoggedReviews.push(review);
                            deferred.resolve();
                        });
                    } else {
                        toastr.error($translate.instant('sitnet_failed_to_record_review'));
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                $scope.sendSelectedToRegistry = function () {
                    var selection = getSelectedReviews($scope.gradedReviews);
                    if (!selection) {
                        return;
                    }
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_record_review'));
                    dialog.result.then(function (btn) {
                        var promises = [];
                        selection.forEach(function (r) {
                            promises.push(send(r));
                        });
                        $q.all(promises).then(function () {
                            toastr.info($translate.instant('sitnet_results_send_ok'));
                        });
                    });
                };

                $scope.isNotInspector = function (teacher, inspections) {
                    var isNotInspector = true;
                    angular.forEach(inspections, function (inspection) {
                        if (inspection.user.id === teacher.id) {
                            isNotInspector = false;
                        }
                    });
                    return isNotInspector;
                };

                var handleOngoingReviews = function (review) {
                    setGrade(review.exam);
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

                // Reviews
                ExamRes.examReviews.query({eid: $routeParams.id},
                    function (reviews) {
                        reviews.forEach(function (r) {
                            r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                            if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                r.isUnderLanguageInspection = true;
                            }
                        });
                        $scope.abortedExams = reviews.filter(function (r) {
                            return r.exam.state === 'ABORTED';
                        });
                        $scope.examReviews = reviews.filter(function (r) {
                            return r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED';
                        });
                        $scope.examReviews.forEach(handleOngoingReviews);

                        $scope.toggleReviews = $scope.examReviews.length > 0;

                        $scope.gradedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'GRADED' && (!r.exam.languageInspection || r.exam.languageInspection.finishedAt);
                        });
                        $scope.gradedReviews.forEach(function (r) {
                            r.displayedGrade = $scope.translateGrade(r.exam);
                            r.displayedCredit = $scope.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                        });
                        $scope.reviewsInLanguageInspection = reviews.filter(function (r) {
                            return r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt;
                        });
                        $scope.reviewsInLanguageInspection.forEach(function (r) {
                            r.displayedGrade = $scope.translateGrade(r.exam);
                            r.displayedCredit = $scope.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                        });

                        $scope.toggleGradedReviews = $scope.gradedReviews.length > 0;
                        $scope.toggleReviewsInLanguageInspection = $scope.reviewsInLanguageInspection.length > 0;

                        $scope.gradedLoggedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'GRADED_LOGGED';
                        });
                        $scope.gradedLoggedReviews.forEach(function(r) {
                            r.displayedGrade = $scope.translateGrade(r.exam);
                        });

                        $scope.toggleLoggedReviews = $scope.gradedLoggedReviews.length > 0;
                        $scope.rejectedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'REJECTED';
                        });
                        $scope.toggleRejectedReviews = $scope.rejectedReviews.length > 0;
                        $scope.archivedReviews = reviews.filter(function (r) {
                            return r.exam.state === 'ARCHIVED';
                        });
                        $scope.archivedReviews.forEach(function (r) {
                            r.displayedGrade = $scope.translateGrade(r.exam);
                            r.displayedCredit = $scope.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                        });
                    },
                    function (error) {
                        toastr.error(error.data);
                    }
                );

                // No-shows
                ExamRes.noShows.query({eid: $routeParams.id}, function (noShows) {
                    $scope.noShows = noShows;
                });

                $scope.isOwner = function (user, owners) {
                    var b = false;
                    if (owners) {
                        angular.forEach(owners, function (owner) {
                            if ((owner.firstName + " " + owner.lastName) === (user.firstName + " " + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                $scope.isInspector = function (user, inspections) {
                    var b = false;
                    if (inspections) {
                        angular.forEach(inspections, function (inspection) {
                            if ((inspection.user.firstName + " " + inspection.user.lastName) === (user.firstName + " " + user.lastName)) {
                                b = true;
                            }
                        });
                    }
                    return b;
                };

                $scope.isLongerThanSixMonths = function (gradedDate) {

                    var sixMonths = 1000 * 60 * 60 * 24 * 182;
                    var graded = Date.parse(gradedDate);

                    return new Date().getTime() > graded + sixMonths;
                };

                $scope.printExamCredit = function (courseCredit, customCredit) {
                    return customCredit && customCredit !== courseCredit ? customCredit : courseCredit;
                };

                $scope.printExamDuration = function (exam) {
                    return dateService.printExamDuration(exam);
                };

                $scope.toggleUnreviewed = function () {
                    if ($scope.examReviews && $scope.examReviews.length > 0) {
                        $scope.toggleReviews = !$scope.toggleReviews;
                    }
                };
                $scope.toggleGraded = function () {
                    if ($scope.gradedReviews && $scope.gradedReviews.length > 0) {
                        $scope.toggleGradedReviews = !$scope.toggleGradedReviews;
                    }
                };
                $scope.toggleInLanguageInspection = function () {
                    if ($scope.reviewsInLanguageInspection && $scope.reviewsInLanguageInspection.length > 0) {
                        $scope.toggleReviewsInLanguageInspection = !$scope.toggleReviewsInLanguageInspection;
                    }
                };

                $scope.toggleLogged = function () {
                    if ($scope.gradedLoggedReviews && $scope.gradedLoggedReviews.length > 0) {
                        $scope.toggleLoggedReviews = !$scope.toggleLoggedReviews;
                    }
                };

                $scope.toggleRejected = function () {
                    if ($scope.rejectedReviews && $scope.rejectedReviews.length > 0) {
                        $scope.toggleRejectedReviews = !$scope.toggleRejectedReviews;
                    }
                };

                $scope.permitRetrial = function (reservation) {
                    ExamRes.reservation.update({id: reservation.id}, function () {
                        reservation.retrialPermitted = true;
                        toastr.info($translate.instant('sitnet_retrial_permitted'));
                    });
                };

                $scope.importGrades = function () {
                    var ctrl = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        fileService.getMaxFilesize().then(function (data) {
                            $scope.maxFileSize = data.filesize;
                        });
                        $scope.title = 'sitnet_import_grades_from_csv';
                        $scope.submit = function () {
                            fileService.upload("/app/gradeimport", $scope.attachmentFile, {}, null, $modalInstance,
                                $route.reload);
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
                        console.log("closed");
                    });
                };

                $scope.createGradingTemplate = function () {
                    var content = $scope.examReviews.map(function (r) {
                        return [r.exam.id,
                                '',
                                '',
                                r.exam.totalScore + " / " + r.exam.maxScore,
                                r.user.firstName + " " + r.user.lastName,
                                r.user.userIdentifier]
                                .join() + ",\n";
                    }).reduce(function (a, b) {
                        return a + b;
                    }, "");
                    content = "exam id,grade,feedback,total score,student,student id\n" + content;
                    var blob = new Blob([content], {type: "text/csv;charset=utf-8"});
                    saveAs(blob, "grading.csv");
                };

                $scope.getAnswerAttachments = function () {

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'review/archive_download.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: function ($scope, $modalInstance) {
                            $scope.params = {};
                            $scope.ok = function () {
                                var start, end;
                                if ($scope.params.startDate) {
                                    start = moment($scope.params.startDate);
                                }
                                if ($scope.params.endDate) {
                                    end = moment($scope.params.endDate);
                                }
                                if (start && end && end < start) {
                                    toastr.error($translate.instant('sitnet_endtime_before_starttime'));
                                } else {
                                    $modalInstance.close({
                                        "start": start.format('DD.MM.YYYY'),
                                        "end": end.format('DD.MM.YYYY')
                                    });
                                }
                            };

                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                        }
                    });

                    modalInstance.result.then(function (params) {
                        fileService.download(
                            '/app/exam/' + $routeParams.id + '/attachments', $routeParams.id + '.tar.gz', params);
                    });
                };


            }
        ]);
}());
