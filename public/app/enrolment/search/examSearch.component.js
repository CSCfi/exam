'use strict';
angular.module('app.enrolment')
    .component('examSearch', {
        templateUrl: '/assets/app/enrolment/search/examSearch.template.html',
        controller: ['StudentExamRes', 'EnrollRes', 'SettingsResource', 'Language', 'toast',
            function (StudentExamRes, EnrollRes, SettingsResource, Language, toast) {

                var vm = this;

                vm.$onInit = function () {
                    vm.filter = {};
                    vm.loader = {loading: false};
                    SettingsResource.enrolmentPermissions.get(function (setting) {
                        vm.permissionCheck = setting;
                        if (setting.active === true) {
                            vm.loader.loading = true;
                            search();
                        }
                    });
                };

                vm.search = function () {
                    if (vm.permissionCheck.active === false) {
                        if (vm.filter.text) {
                            vm.loader.loading = true;
                            search();
                        } else {
                            delete vm.exams;
                        }
                    }
                };

                var search = function () {
                    StudentExamRes.exams.query({filter: vm.filter.text}, function (exams) {
                        exams.forEach(function (exam) {
                            if (!exam.examLanguages) {
                                console.warn('No languages for exam #' + exam.id);
                                exam.examLanguages = [];
                            }
                            exam.languages = exam.examLanguages.map(function (lang) {
                                return Language.getLanguageNativeName(lang.code);
                            });

                        });

                        vm.exams = exams;
                        checkEnrolment();
                        vm.loader.loading = false;
                    }, function (err) {
                        vm.loader.loading = false;
                        toast.error(err.data);
                    });

                };

                var checkEnrolment = function () {
                    vm.exams.forEach(function (exam) {
                        EnrollRes.check.get({id: exam.id}, function (enrolments) {
                                // check if student has reserved aquarium
                                enrolments.forEach(function (enrolment) {
                                    if (enrolment.reservation) {
                                        exam.reservationMade = true;
                                    }
                                });

                                // enrolled to exam
                                exam.enrolled = true;
                            }, function (err) {
                                // not enrolled or made reservations
                                exam.enrolled = false;
                                exam.reservationMade = false;
                            }
                        );

                    });

                };


            }
        ]
    });

