'use strict';
angular.module('app.exam')
    .component('examList', {
        templateUrl: '/assets/app/exam/examList.template.html',
        controller: ['dialogs', 'Session', 'Exam', '$translate', '$location', 'ExamRes', 'toast',
            function (dialogs, Session, Exam, $translate, $location, ExamRes, toast) {
                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    if (!vm.user.isAdmin) {
                        $location.url("/");
                        return;
                    }
                    vm.view = 'PUBLISHED';
                    vm.showExpired = false;
                    vm.examsPredicate = 'examActiveEndDate';
                    vm.reverse = true;
                    vm.filter = {};
                    vm.loader = {
                        loading: false
                    };

                    Exam.listExecutionTypes().then(function (types) {
                        vm.executionTypes = types;
                    });
                };

                vm.search = function () {
                    vm.loader.loading = true;
                    ExamRes.exams.query({filter: vm.filter.text}, function (exams) {
                        exams.forEach(function (e) {
                            e.ownerAggregate = e.examOwners.map(function (o) {
                                return o.firstName + " " + o.lastName;
                            }).join();
                            if (e.state === 'PUBLISHED') {
                                e.expired = Date.now() > new Date(e.examActiveEndDate);
                            } else {
                                e.expired = false;
                            }
                        });
                        vm.exams = exams;
                        vm.loader.loading = false;
                    }, function (err) {
                        vm.loader.loading = false;
                        toast.error($translate.instant(err.data));
                    });
                };

                // Called when create exam button is clicked
                vm.createExam = function (executionType) {
                    Exam.createExam(executionType);
                };

                vm.copyExam = function (exam, type) {
                    ExamRes.exams.copy({id: exam.id, type: type}, function (copy) {
                        toast.success($translate.instant('sitnet_exam_copied'));
                        $location.path("/exams/" + copy.id + "/1/");
                    }, function (error) {
                        toast.error(error.data);
                    });
                };

                vm.deleteExam = function (exam) {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_remove_exam'));
                    dialog.result.then(function (btn) {
                        ExamRes.exams.remove({id: exam.id}, function (ex) {
                            toast.success($translate.instant('sitnet_exam_removed'));
                            vm.exams.splice(vm.exams.indexOf(exam), 1);

                        }, function (error) {
                            toast.error(error.data);
                        });
                    }, function (btn) {

                    });
                };

                vm.getExecutionTypeTranslation = function (exam) {
                    return Exam.getExecutionTypeTranslation(exam.executionType.type);
                };
            }]
    });

