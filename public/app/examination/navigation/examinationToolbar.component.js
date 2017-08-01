'use strict';

angular.module('app.examination')
    .component('examinationToolbar', {
        templateUrl: '/assets/app/examination/navigation/examinationToolbar.template.html',
        bindings: {
            exam: '<',
            activeSection: '<',
            isPreview: '<',
            onPageSelect: '&'
        },
        controller: ['$http', '$location', '$routeParams', '$translate', 'dialogs', 'Session', 'Examination',
            'StudentExamRes', 'Attachment', 'enrolmentService',
            function ($http, $location, $routeParams, $translate, dialogs, Session, Examination, StudentExamRes,
                      Attachment, enrolmentService) {

                var vm = this;

                vm.$onInit = function () {
                    if (!vm.isPreview) {
                        $http.get('/app/enroll/room/' + vm.exam.id)
                            .success(function (data) {
                                vm.room = data;
                            });
                    }
                };

                vm.displayUser = function () {
                    var user = Session.getUser();
                    if (!user) {
                        return;
                    }
                    var userId = user.userIdentifier ? ' (' + user.userIdentifier + ')' : '';
                    return user.firstName + ' ' + user.lastName + userId;
                };

                vm.turnExam = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_turn_exam'));
                    dialog.result.then(function () {
                        if (vm.activeSection) {
                            Examination.saveAllTextualAnswersOfSection(vm.activeSection, vm.exam.hash, false).then(function () {
                                Examination.logout('sitnet_exam_returned', vm.exam.hash);
                            });
                        } else {
                            Examination.logout('sitnet_exam_returned', vm.exam.hash);
                        }
                    });
                };

                vm.abortExam = function () {
                    var dialog = dialogs.confirm($translate.instant('sitnet_confirm'), $translate.instant('sitnet_confirm_abort_exam'));
                    dialog.result.then(function () {
                        StudentExamRes.exam.abort({hash: vm.exam.hash}, function () {
                            toastr.info($translate.instant('sitnet_exam_aborted'), {timeOut: 5000});
                            window.onbeforeunload = null;
                            $location.path('/student/logout/aborted');
                        });
                    });
                };

                vm.downloadExamAttachment = function () {
                    Attachment.downloadExamAttachment(vm.exam);
                };

                vm.selectGuidePage = function () {
                    vm.onPageSelect({page: {type: 'guide'}});
                };

                vm.selectSection = function (section) {
                    vm.onPageSelect({page: {id: section.id, type: 'section'}});
                };

                vm.getQuestionAmount = function (section, type) {
                    if (type === 'total') {
                        return section.sectionQuestions.length;
                    } else if (type === 'answered') {
                        return section.sectionQuestions.filter(function (sq) {
                            return Examination.isAnswered(sq);
                        }).length;
                    } else if (type === 'unanswered') {
                        return section.sectionQuestions.length - section.sectionQuestions.filter(function (sq) {
                                return Examination.isAnswered(sq);
                            }).length;
                    }
                };

                vm.displayRoomInstructions = function () {
                    if (vm.room) {
                        switch ($translate.use()) {
                            case 'fi':
                                return vm.room.roomInstruction;
                            case 'sv':
                                return vm.room.roomInstructionSV;
                            case 'en':
                            /* falls through */
                            default:
                                return vm.room.roomInstructionEN;
                        }
                    }
                };

                vm.showMaturityInstructions = function () {
                    enrolmentService.showMaturityInstructions({exam: vm.exam});
                };

                vm.exitPreview = function () {
                    $location.path('/exams/examTabs/' + $routeParams.id + '/' + $routeParams.tab);
                };

            }
        ]
    });
