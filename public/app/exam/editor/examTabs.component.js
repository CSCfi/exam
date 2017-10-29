'use strict';
angular.module('app.exam.editor')
    .component('examTabs', {
        templateUrl: '/assets/app/exam/editor/examTabs.template.html',
        controller: ['$routeParams', '$translate', 'ExamRes', 'Session',
            function ($routeParams, $translate, ExamRes, Session) {

                var vm = this;

                vm.$onInit = function () {
                    vm.user = Session.getUser();
                    vm.examInfo = {};
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                        vm.updateTitle(!exam.course ? undefined : exam.course.code, exam.name);
                    });
                    vm.activeTab = parseInt($routeParams.tab);
                };

                vm.reload = function () {
                    ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                        vm.exam = exam;
                    });
                };

                vm.updateTitle = function (code, name) {
                    if (code && name) {
                        vm.examInfo.title = code + ' ' + name;
                    }
                    else if (code) {
                        vm.examInfo.title = code + ' ' + $translate.instant('sitnet_no_name');
                    }
                    else {
                        vm.examInfo.title = name;
                    }
                };

                vm.isOwner = function () {
                    return vm.exam.examOwners.some(function (eo) {
                        return eo.id === vm.user.id;
                    });
                };

                vm.switchToBasicInfo = function () {
                    vm.activeTab = 1;
                };

                vm.switchToQuestions = function () {
                    vm.activeTab = 2;
                };

                vm.switchToPublishSettings = function () {
                    vm.activeTab = 3;
                };

                vm.titleUpdated = function (props) {
                    vm.updateTitle(props.code, props.name);
                };

            }
        ]
    });

