'use strict';
angular.module('app.exam')
    .component('printoutListing', {
        template:
        '<div id="sitnet-header" class="header">\n' +
        '    <div class="col-md-12 header-wrapper">\n' +
        '        <span class="header-text">{{\'sitnet_printout_exams\' | translate}}</span>\n' +
        '    </div>\n' +
        '</div>\n' +
        '<div id="dashboard">\n' +
        '    <div class="top-row">\n' +
        '        <div class="col-md-12">\n' +
        '            <table class="table table-striped table-condensed exams-table">\n' +
        '                <thead>\n' +
        '                <tr>\n' +
        '                    <th sort by="examinationDatesAggregate" text="sitnet_examination_dates" predicate="$ctrl.predicate"\n' +
        '                        reverse="$ctrl.reverse"></th>\n' +
        '                    <th sort by="course.code" text="sitnet_examcode" predicate="$ctrl.predicate"\n' +
        '                        reverse="$ctrl.reverse"></th>\n' +
        '                    <th sort by="name" text="sitnet_exam_name" predicate="$ctrl.predicate" reverse="$ctrl.reverse"></th>\n' +
        '                    <th sort by="ownerAggregate" text="sitnet_teachers" predicate="$ctrl.predicate"\n' +
        '                        reverse="$ctrl.reverse"></th>\n' +
        '                </tr>\n' +
        '                </thead>\n' +
        '                <tbody>\n' +
        '                <tr ng-repeat="exam in $ctrl.printouts | orderBy:$ctrl.predicate:$ctrl.reverse">\n' +
        '                    <td>{{ exam.examinationDatesAggregate }}</td>\n' +
        '                    <td>{{exam.course.code}}</td>\n' +
        '                    <td><a class="exams-info-title bold-button" href="/exams/{{exam.id}}/view/printout">{{exam.name}}</a>\n' +
        '                    <td>\n' +
        '                        <teacher-list exam="exam"/>\n' +
        '                    </td>\n' +
        '                </tr>\n' +
        '                </tbody>\n' +
        '            </table>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
        controller: ['$http',
            function ($http) {

                var vm = this;

                vm.$onInit = function () {
                    vm.predicate = 'examinationDatesAggregate';
                    vm.reverse = true;
                    $http.get('/app/exam/printouts').success(function (printouts) {
                        printouts.forEach(function (printout) {
                            var dates = printout.examinationDates.map(function (ed) {
                                return ed.date;
                            });
                            dates.sort(function (a, b) {
                                return a - b;
                            });
                            printout.examinationDatesAggregate = dates.map(function (d) {
                                return moment(d).format('DD.MM.YYYY');
                            }).join(', ');
                        });
                        vm.printouts = printouts;
                    });
                };

            }]
    });
