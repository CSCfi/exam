'use strict';

angular.module('app.exam.editor')
    .component('courseSelection', {
        templateUrl: '/assets/app/exam/editor/courseSelection.template.html',
        controller: ['$translate', '$q', '$location', '$routeParams', 'ExamRes', 'examService', 'LanguageRes',
            function ($translate, $q, $location, $routeParams, ExamRes, examService, LanguageRes) {

                var vm = this;

                vm.$onInit = function () {
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                        vm.exam.initialLanguages = exam.examLanguages.length;
                    });
                    LanguageRes.languages.query(function (languages) {
                        vm.examLanguages = languages.map(function (language) {
                            language.name = getLanguageNativeName(language.code);
                            return language;
                        });
                    });

                };

                vm.getExecutionTypeTranslation = function () {
                    return !vm.exam || examService.getExecutionTypeTranslation(vm.exam.executionType.type);
                };

                vm.updateExamName = function () {
                    examService.updateExam(vm.exam).then(function () {
                        toastr.info($translate.instant("sitnet_exam_saved"));
                    }, function (error) {
                        if (error.data) {
                            var msg = error.data.message || error.data;
                            toastr.error($translate.instant(msg));
                        }
                    });
                };

                vm.selectedLanguages = function () {
                    if (!vm.exam) {
                        return;
                    }
                    return vm.exam.examLanguages.map(function (language) {
                        return getLanguageNativeName(language.code);
                    }).join(", ");
                };

                vm.addExamLanguages = function () {
                    if (vm.exam && vm.exam.examLanguages.length !== vm.exam.initialLanguages) {
                        ExamRes.languages.reset({eid: vm.exam.id}, function () {
                            var promises = [];
                            angular.forEach(vm.exam.examLanguages, function (language) {
                                promises.push(ExamRes.language.add({eid: vm.exam.id, code: language.code}));
                            });
                            $q.all(promises).then(function () {
                                toastr.info($translate.instant('sitnet_exam_language_updated'));
                                vm.selectedLanguages(vm.exam);
                                vm.exam.initialLanguages = vm.exam.examLanguages.length;
                            });
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    }
                };

                vm.cancelNewExam = function () {
                    ExamRes.exams.remove({id: vm.exam.id}, function () {
                        toastr.success($translate.instant('sitnet_exam_removed'));
                        $location.path('/');
                    });
                };

                vm.continueToExam = function () {
                    $location.path("/exams/examTabs/" + vm.exam.id + "/1");
                };

            }
        ]
    });
