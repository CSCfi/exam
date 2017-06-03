'use strict';
angular.module('app.review')
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
            $scope.toggleArchivedReviews = false;
            $scope.view = {filter: 'IN_PROGRESS'};
            $scope.eid = $routeParams.id;

            $scope.templates = {
                noShowPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/no_show.html",
                abortedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/aborted.html",
                reviewStartedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/review_started.html",
                speedReviewPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/speed_review.html",
                languageInspectionPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/language_inspection.html",
                gradedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/graded.html",
                gradedLoggedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/graded_logged.html",
                rejectedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/rejected.html",
                archivedPath: EXAM_CONF.TEMPLATES_PATH + "review/listings/archived.html",
                reviewListPath: EXAM_CONF.TEMPLATES_PATH + "review/review_list.html",
                examBasicPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_basic_info.html",
                examQuestionsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_questions.html",
                examMaterialsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_materials.html",
                examPublishSettingsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_publish_settings.html"
            };

            $scope.selections = {graded: {all: false, page: false}, gradedLogged: {all: false, page: false}};
            $scope.pageSize = 30;

            $scope.translateGrade = function (exam) {
                var grade = exam.grade ? exam.grade.name : 'NONE';
                return examService.getExamGradeDisplayName(grade);
            };

            var initList = function () {
                $scope.initializeExam();
            };
            initList();

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

            var handleOngoingReviews = function (review) {
                examReviewService.gradeExam(review.exam);
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
                    $scope.gradedLoggedReviews.forEach(function (r) {
                        r.displayedGradingTime = r.exam.languageInspection ?
                            r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                        r.displayedGrade = $scope.translateGrade(r.exam);
                    });

                    $scope.toggleLoggedReviews = $scope.gradedLoggedReviews.length > 0;
                    $scope.rejectedReviews = reviews.filter(function (r) {
                        return r.exam.state === 'REJECTED';
                    });
                    $scope.rejectedReviews.forEach(function (r) {
                        r.displayedGradingTime = r.exam.languageInspection ?
                            r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                    });
                    $scope.toggleRejectedReviews = $scope.rejectedReviews.length > 0;
                    $scope.archivedReviews = reviews.filter(function (r) {
                        return r.exam.state === 'ARCHIVED';
                    });
                    $scope.toggleArchivedReviews = $scope.archivedReviews.length > 0;
                    $scope.archivedReviews.forEach(function (r) {
                        r.displayedGradingTime = r.exam.languageInspection ?
                            r.exam.languageInspection.finishedAt : r.exam.gradedTime;
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

            $scope.toggleArchived = function () {
                if ($scope.archivedReviews && $scope.archivedReviews.length > 0) {
                    $scope.toggleArchivedReviews = !$scope.toggleArchivedReviews;
                }
            };

            $scope.toggleRejected = function () {
                if ($scope.rejectedReviews && $scope.rejectedReviews.length > 0) {
                    $scope.toggleRejectedReviews = !$scope.toggleRejectedReviews;
                }
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


            $scope.openNoShow = function () {

                var ctrl = ["$scope", "$uibModalInstance", "ExamRes", "noShows", function ($scope, $modalInstance, ExamRes, noShows) {
                    $scope.noShows = noShows;

                    $scope.permitRetrial = function (reservation) {
                        ExamRes.reservation.update({id: reservation.id}, function () {
                            reservation.retrialPermitted = true;
                            toastr.info($translate.instant('sitnet_retrial_permitted'));
                        });
                    };


                    $scope.cancel = function () {
                        $modalInstance.dismiss("Cancelled");
                    };

                    // Close modal if user clicked the back button and no changes made
                    $scope.$on('$routeChangeStart', function () {
                        if (!window.onbeforeunload) {
                            $modalInstance.dismiss();
                        }
                    });
                }];

                $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'review/listings/no_show.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: ctrl,
                    windowClass: 'question-editor-modal',
                    resolve: {
                        noShows: function () {
                            return $scope.noShows;
                        }
                    }
                });

            };

            $scope.openAborted = function () {

                var ctrl = ["$scope", "$uibModalInstance", "ExamRes", "aborted", function ($scope, $modalInstance, ExamRes, aborted) {
                    $scope.abortedExams = aborted;

                    $scope.permitRetrial = function (reservation) {
                        ExamRes.reservation.update({id: reservation.id}, function () {
                            reservation.retrialPermitted = true;
                            toastr.info($translate.instant('sitnet_retrial_permitted'));
                        });
                    };

                    $scope.cancel = function () {
                        $modalInstance.dismiss("Cancelled");
                    };

                    // Close modal if user clicked the back button and no changes made
                    $scope.$on('$routeChangeStart', function () {
                        if (!window.onbeforeunload) {
                            $modalInstance.dismiss();
                        }
                    });
                }];

                $modal.open({
                    templateUrl: EXAM_CONF.TEMPLATES_PATH + 'review/listings/aborted.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: ctrl,
                    windowClass: 'question-editor-modal',
                    resolve: {
                        aborted: function () {
                            return $scope.abortedExams;
                        }
                    }
                });

            };


        }
    ]);

