'use strict';

angular.module('app.review')
    .component('rGrading', {
        templateUrl: '/assets/app/review/assessment/grading/grading.template.html',
        bindings: {
            exam: '<',
            user: '<',
            questionSummary: '<',
            onUpdate: '&'
        },
        controller: ['$translate', '$scope', 'Assessment', 'examService', 'questionService', 'ExamRes', 'Attachment', 'Language',
            function ($translate, $scope, Assessment, examService, questionService, ExamRes, Attachment, Language) {

                var vm = this;

                vm.$onInit = function () {
                    vm.message = {};
                    vm.selections = {};
                    initGrade();
                    initCreditTypes();
                    initLanguages();
                };

                vm.getExamMaxPossibleScore = function () {
                    return examService.getMaxScore(vm.exam);
                };

                vm.getExamTotalScore = function () {
                    return examService.getTotalScore(vm.exam);
                };

                vm.inspectionDone = function () {
                    vm.onUpdate();
                };

                vm.isOwnerOrAdmin = function () {
                    return examService.isOwnerOrAdmin(vm.exam);
                };

                vm.isReadOnly = function () {
                    return Assessment.isReadOnly(vm.exam);
                };

                vm.isGraded = function () {
                    return Assessment.isGraded(vm.exam);
                };

                vm.getTeacherCount = function () {
                    // Do not add up if user exists in both groups
                    var owners = vm.exam.parent.examOwners.filter(function (owner) {
                        return vm.exam.examInspections.map(function (inspection) {
                                return inspection.user.id;
                            }).indexOf(owner.id) === -1;
                    });
                    return vm.exam.examInspections.length + owners.length;
                };

                vm.sendEmailMessage = function () {
                    if (!vm.message.text) {
                        toastr.error($translate.instant('sitnet_email_empty'));
                        return;
                    }
                    ExamRes.email.inspection({
                        eid: vm.exam.id,
                        msg: vm.message.text
                    }, function () {
                        toastr.info($translate.instant('sitnet_email_sent'));
                        delete vm.message.text;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                vm.downloadFeedbackAttachment = function () {
                    Attachment.downloadFeedbackAttachment(vm.exam);
                };

                vm.setGrade = function () {
                    if (vm.selections.grade &&
                        (vm.selections.grade.id || vm.selections.grade.type === 'NONE')) {
                        vm.exam.grade = vm.selections.grade;
                        vm.exam.gradeless = vm.selections.grade.type === 'NONE';
                    } else {
                        delete vm.exam.grade;
                        vm.exam.gradeless = false;
                    }
                };

                vm.setCreditType = function () {
                    if (vm.selections.type && vm.selections.type.type) {
                        vm.exam.creditType = {type: vm.selections.type.type};
                    } else {
                        delete vm.exam.creditType;
                    }
                };

                vm.setLanguage = function () {
                    vm.exam.answerLanguage = vm.selections.language ? vm.selections.language.name : undefined;
                };

                var initGrade = function () {
                    if (!vm.exam.grade || !vm.exam.grade.id) {
                        vm.exam.grade = {};
                    }
                    var scale = vm.exam.gradeScale || vm.exam.parent.gradeScale || vm.exam.course.gradeScale;
                    scale.grades = scale.grades || [];
                    vm.grades = scale.grades.map(function (grade) {
                        grade.type = grade.name;
                        grade.name = examService.getExamGradeDisplayName(grade.name);

                        if (vm.exam.grade && vm.exam.grade.id === grade.id) {
                            vm.exam.grade.type = grade.type;
                            vm.selections.grade = grade;
                        }
                        return grade;
                    });
                    // The "no grade" option
                    var noGrade = {type: 'NONE', name: examService.getExamGradeDisplayName('NONE')};
                    if (vm.exam.gradeless && !vm.selections.grade) {
                        vm.selections.grade = noGrade;
                    }
                    vm.grades.push(noGrade);
                };

                var initCreditTypes = function () {
                    examService.refreshExamTypes().then(function (types) {
                        var creditType = vm.exam.creditType || vm.exam.examType;
                        vm.creditTypes = types;
                        types.forEach(function (type) {
                            if (creditType.id === type.id) {
                                vm.selections.type = type;
                            }
                        });
                    });
                    if (vm.exam.course && !vm.exam.customCredit) {
                        vm.exam.customCredit = vm.exam.course.credits;
                    }
                };

                var initLanguages = function () {
                    var lang = Assessment.pickExamLanguage(vm.exam);
                    if (!vm.exam.answerLanguage) {
                        vm.exam.answerLanguage = lang;
                    }
                    Language.languages.query(function (languages) {
                        vm.languages = languages.map(function (language) {
                            if (lang && lang.code === language.code) {
                                vm.selections.language = language;
                            }
                            language.name = getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                $scope.$on('$localeChangeSuccess', function () {
                    initCreditTypes();
                    vm.grades.forEach(function (eg) {
                        eg.name = examService.getExamGradeDisplayName(eg.type);
                    });
                });

            }
        ]
    });
