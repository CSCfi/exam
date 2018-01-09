/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

'use strict';
angular.module('app.enrolment')
    .component('examEnrolments', {
        template:
        '<div id="dashboard">\n' +
        '    <div class="main-row" ng-show="$ctrl.exam.noTrialsLeft">\n' +
        '        <div class="col-md-12 alert-danger">\n' +
        '            <h4>{{\'sitnet_no_trials_left\' | translate}}</h4>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '    <enrolment-details ng-if="$ctrl.exam" exam="$ctrl.exam"></enrolment-details>\n' +
        '    <div ng-show="$ctrl.exams.length > 0" class="student-details-title-wrap subtitle">\n' +
        '        <div class="student-exam-details-title subtitle">{{\'sitnet_student_exams\' | translate}}</div>\n' +
        '    </div>\n' +
        '    <div class="exams-list">\n' +
        '        <enrolment-candidate ng-repeat="exam in $ctrl.exams" exam="exam"></enrolment-candidate>\n' +
        '    </div>\n' +
        '</div>\n',
        controller: ['$routeParams', 'Enrolment', 'toast',
            function ($routeParams, Enrolment, toast) {

                var vm = this;

                vm.$onInit = function () {
                    Enrolment.getExamEnrolment($routeParams.code, $routeParams.id).then(function (data) {
                        vm.exam = data;
                    }, function (err) {
                        toast.error(err.data);
                    });
                    Enrolment.listEnrolments($routeParams.code, $routeParams.id).then(function (data) {
                        vm.exams = data;
                    });
                };

            }
        ]
    });
