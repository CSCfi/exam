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
