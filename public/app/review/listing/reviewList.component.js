'use strict';
angular.module('app.exam.editor')
    .component('reviewList', {
        templateUrl: '/assets/app/review/listing/reviewList.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$filter', '$q', '$translate', '$uibModal', 'dialogs', 'ExamRes', 'DateTime', 'Exam',
            'ReviewList', 'Files', 'EXAM_CONF',
            function ($filter, $q, $translate, $modal, dialogs, ExamRes, DateTime, Exam, Review,
                      Files, EXAM_CONF) {

                var vm = this;

                vm.$onInit = function () {

                    vm.templates = {
                        reviewStartedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/review_started.html',
                        speedReviewPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/speed_review.html',
                        languageInspectionPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/language_inspection.html',
                        gradedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/graded.html',
                        gradedLoggedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/graded_logged.html',
                        rejectedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/rejected.html',
                        archivedPath: EXAM_CONF.TEMPLATES_PATH + 'review/listing/templates/archived.html'
                    };

                    vm.selections = {graded: {all: false, page: false}, gradedLogged: {all: false, page: false}};
                    vm.pageSize = 30;

                    ExamRes.examReviews.query({eid: vm.exam.id},
                        function (reviews) {
                            reviews.forEach(function (r) {
                                r.duration = moment.utc(Date.parse(r.duration)).format('HH:mm');
                                if (r.exam.languageInspection && !r.exam.languageInspection.finishedAt) {
                                    r.isUnderLanguageInspection = true;
                                }
                            });
                            vm.abortedExams = reviews.filter(function (r) {
                                return r.exam.state === 'ABORTED';
                            });
                            vm.examReviews = reviews.filter(function (r) {
                                return r.exam.state === 'REVIEW' || r.exam.state === 'REVIEW_STARTED';
                            });
                            vm.examReviews.forEach(handleOngoingReviews);
                            vm.toggleReviews = vm.examReviews.length > 0;

                            vm.gradedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' && (!r.exam.languageInspection || r.exam.languageInspection.finishedAt);
                            });
                            vm.gradedReviews.forEach(function (r) {
                                r.displayedGrade = vm.translateGrade(r.exam);
                                r.displayedCredit = vm.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                            });
                            vm.toggleGradedReviews = vm.gradedReviews.length > 0;

                            vm.reviewsInLanguageInspection = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED' && r.exam.languageInspection && !r.exam.languageInspection.finishedAt;
                            });
                            vm.reviewsInLanguageInspection.forEach(function (r) {
                                r.displayedGrade = vm.translateGrade(r.exam);
                                r.displayedCredit = vm.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                            });
                            vm.toggleReviewsInLanguageInspection = vm.reviewsInLanguageInspection.length > 0;

                            vm.gradedLoggedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'GRADED_LOGGED';
                            });
                            vm.gradedLoggedReviews.forEach(function (r) {
                                r.displayedGradingTime = r.exam.languageInspection ?
                                    r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                                r.displayedGrade = vm.translateGrade(r.exam);
                            });
                            vm.toggleLoggedReviews = vm.gradedLoggedReviews.length > 0;

                            vm.rejectedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'REJECTED';
                            });
                            vm.rejectedReviews.forEach(function (r) {
                                r.displayedGradingTime = r.exam.languageInspection ?
                                    r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                            });
                            vm.toggleRejectedReviews = vm.rejectedReviews.length > 0;

                            vm.archivedReviews = reviews.filter(function (r) {
                                return r.exam.state === 'ARCHIVED';
                            });
                            vm.archivedReviews.forEach(function (r) {
                                r.displayedGradingTime = r.exam.languageInspection ?
                                    r.exam.languageInspection.finishedAt : r.exam.gradedTime;
                                r.displayedGrade = vm.translateGrade(r.exam);
                                r.displayedCredit = vm.printExamCredit(r.exam.course.credits, r.exam.customCredit);
                            });
                            vm.toggleArchivedReviews = vm.archivedReviews.length > 0;
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );

                    // No-shows
                    ExamRes.noShows.query({eid: vm.exam.id}, function (noShows) {
                        vm.noShows = noShows;
                    });
                };


                vm.translateGrade = function (exam) {
                    var grade = exam.grade ? exam.grade.name : 'NONE';
                    return Exam.getExamGradeDisplayName(grade);
                };

                vm.selectAll = function (name, items) {
                    var override = resetSelections(name, 'all');
                    items.forEach(function (i) {
                        i.selected = !i.selected || override;
                    });
                };

                vm.selectPage = function (name, items, boxClass) {
                    var override = resetSelections(name, 'page');
                    var boxes = angular.element('.' + boxClass);
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

                vm.archiveSelected = function () {
                    var selection = getSelectedReviews(vm.gradedLoggedReviews);
                    if (!selection) {
                        return;
                    }
                    var ids = selection.map(function (r) {
                        return r.exam.id;
                    });
                    ExamRes.archive.update({ids: ids.join()}, function () {
                        vm.gradedLoggedReviews = vm.gradedLoggedReviews.filter(function (r) {
                            if (ids.indexOf(r.exam.id) > -1) {
                                vm.archivedReviews.push(r);
                                return false;
                            }
                            return true;
                        });
                        toastr.info($translate.instant('sitnet_exams_archived'));
                    });
                };

                vm.sendSelectedToRegistry = function () {
                    var selection = getSelectedReviews(vm.gradedReviews);
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

                vm.printSelected = function (asReport) {
                    var selection = getSelectedReviews(vm.gradedLoggedReviews);
                    if (!selection) {
                        return;
                    }
                    var url = '/app/exam/record/export/';
                    if (asReport) {
                        url += 'report/';
                    }
                    var fileType = asReport ? '.xlsx' : '.csv';
                    var ids = selection.map(function (r) {
                        return r.exam.id;
                    });

                    Files.download(url + vm.exam.id,
                        $translate.instant('sitnet_grading_info') + '_' + $filter('date')(Date.now(), 'dd-MM-yyyy') + fileType,
                        {'childIds': ids}, true
                    );
                };

                var resetSelections = function (name, view) {
                    var scope = vm.selections[name];
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

                var send = function (review) {
                    var deferred = $q.defer();
                    var exam = review.exam;
                    var resource = exam.gradeless ? ExamRes.register : ExamRes.saveRecord;
                    if ((exam.grade || exam.gradeless) && exam.creditType && exam.answerLanguage) {
                        var examToRecord = {
                            'id': exam.id,
                            'state': 'GRADED_LOGGED',
                            'grade': exam.grade,
                            'customCredit': exam.customCredit,
                            'totalScore': exam.totalScore,
                            'creditType': exam.creditType,
                            'sendFeedback': true,
                            'answerLanguage': exam.answerLanguage
                        };

                        resource.add(examToRecord, function () {
                            review.selected = false;
                            review.displayedGradingTime = review.exam.languageInspection ?
                                review.exam.languageInspection.finishedAt : review.exam.gradedTime;
                            vm.gradedReviews.splice(vm.gradedReviews.indexOf(review), 1);
                            vm.gradedLoggedReviews.push(review);
                            deferred.resolve();
                        });
                    } else {
                        toastr.error($translate.instant('sitnet_failed_to_record_review'));
                        deferred.reject();
                    }
                    return deferred.promise;
                };

                var handleOngoingReviews = function (review) {
                    Review.gradeExam(review.exam);
                    ExamRes.inspections.get({id: review.exam.id}, function (inspections) {
                        review.inspections = inspections;
                    });
                };

                vm.printExamCredit = function (courseCredit, customCredit) {
                    return customCredit ? customCredit : courseCredit;
                };

                vm.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                vm.getAnswerAttachments = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        animation: true,
                        component: 'archiveDownload'
                    }).result.then(function (params) {
                        Files.download(
                            '/app/exam/' + vm.exam.id + '/attachments', vm.exam.id + '.tar.gz', params);
                    });
                };

                vm.openAborted = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        component: 'abortedExams',
                        resolve: {
                            abortedExams: function () {
                                return vm.abortedExams;
                            }
                        }
                    });
                };

                vm.openNoShows = function () {
                    $modal.open({
                        backdrop: 'static',
                        keyboard: true,
                        windowClass: 'question-editor-modal',
                        component: 'noShows',
                        resolve: {
                            noShows: function () {
                                return vm.noShows;
                            }
                        }
                    });
                };

            }
        ]
    });

