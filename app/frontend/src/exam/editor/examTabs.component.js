/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';

angular.module('app.exam.editor')
    .component('examTabs', {
        template: require('./examTabs.template.html'),
        controller: ['$routeParams', '$translate', 'ExamRes', 'Session', '$window',
            function ($routeParams, $translate, ExamRes, Session, $window) {

                const vm = this;

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

                vm.goBack = function (event) {
                    event.preventDefault();
                    $window.history.back();
                }

            }
        ]
    });

