'use strict';
angular.module('app.dashboard.teacher')
    .component('teacherDashboard', {
        templateUrl: '/assets/app/dashboard/teacher/teacherDashboard.template.html',
        controller: ['TeacherDashboard', 'Exam', 'DateTime', 'Session', 'EXAM_CONF', 'ExamRes',
            'dialogs', '$translate', '$location', '$filter',
            function (TeacherDashboard, Exam, DateTime, Session, EXAM_CONF, ExamRes, dialogs,
                      $translate, $location, $filter) {

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.userId = Session.getUser().id;
                    ctrl.templates = {
                        dashboardToolbarPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/toolbar.html',
                        dashboardActiveExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/active_exams.html',
                        dashboardFinishedExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/finished_exams.html',
                        dashboardArchivedExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/archived_exams.html',
                        dashboardDraftExamsPath: EXAM_CONF.TEMPLATES_PATH + 'dashboard/teacher/templates/draft_exams.html'
                    };
                    // Pagesize for showing finished exams
                    ctrl.pageSize = 10;
                    ctrl.filter = {};
                    ctrl.reduceDraftCount = 0;

                    TeacherDashboard.populate(ctrl).then(function () {
                        ctrl.filteredFinished = ctrl.finishedExams;
                        ctrl.filteredActive = ctrl.activeExams;
                        ctrl.filteredArchived = ctrl.archivedExams;
                        ctrl.filteredDraft = ctrl.draftExams;
                    });
                };

                ctrl.printExamDuration = function (exam) {
                    return DateTime.printExamDuration(exam);
                };

                ctrl.getUsername = function () {
                    return Session.getUserName();
                };

                ctrl.getExecutionTypeTranslation = function (exam) {
                    return Exam.getExecutionTypeTranslation(exam.executionType.type);
                };

                ctrl.checkOwner = function (isOwner) {

                    if (isOwner) {
                        ctrl.reduceDraftCount += 1;
                        return true;
                    }

                    return false;
                };

                ctrl.search = function () {

                    ctrl.reduceDraftCount = 0;

                    // Use same search parameter for all the 4 result tables
                    ctrl.filteredFinished = $filter('filter')(ctrl.finishedExams, ctrl.filter.text);
                    ctrl.filteredActive = $filter('filter')(ctrl.activeExams, ctrl.filter.text);
                    ctrl.filteredArchived = $filter('filter')(ctrl.archivedExams, ctrl.filter.text);
                    ctrl.filteredDraft = $filter('filter')(ctrl.draftExams, ctrl.filter.text);

                    // for drafts, display exams only for owners AM-1658
                    ctrl.filteredDraft = ctrl.filteredDraft.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === ctrl.userId);
                        });
                        if (owner.length > 0) {
                            return exam;
                        }
                        return false;
                    });

                    // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
                    ctrl.filteredFinished = ctrl.filteredFinished.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === ctrl.userId);
                        });
                        if (owner.length > 0 || (owner.length === 0 && exam.unassessedCount > 0)) {
                            return exam;
                        }
                        return false;
                    });

                    // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
                    ctrl.filteredActive = ctrl.filteredActive.filter(function (exam) {
                        var owner = exam.examOwners.filter(function (own) {
                            return (own.id === ctrl.userId);
                        });
                        if (owner.length > 0 || (owner.length === 0 && exam.unassessedCount > 0)) {
                            return exam;
                        }
                        return false;
                    });


                };

                ctrl.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toastr.success($translate.instant('sitnet_exam_copied'));
                        $location.path('/exams/' + copy.id + '/1/');
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                ctrl.deleteExam = function (exam, listing) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toastr.success($translate.instant('sitnet_exam_removed'));
                            if (listing === 'archived') {
                                ctrl.archivedExams.splice(ctrl.archivedExams.indexOf(exam), 1);
                            }
                            if (listing === 'finished') {
                                ctrl.finishedExams.splice(ctrl.finishedExams.indexOf(exam), 1);
                            }
                            if (listing === 'draft') {
                                ctrl.draftExams.splice(ctrl.draftExams.indexOf(exam), 1);
                            }
                            if (listing === 'active') {
                                ctrl.activeExams.splice(ctrl.activeExams.indexOf(exam), 1);
                            }


                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                ctrl.isOwner = function (exam) {
                    return exam.examOwners.some(function (eo) {
                        return eo.id === ctrl.userId;
                    });
                };

                ctrl.filterOwners = function (exam) {
                    if (!exam) return false;
                    var owner = exam.examOwners.filter(function (own) {
                        return (own.id === ctrl.userId);
                    });
                    return owner.length > 0;
                };
            }]
    });
