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
import moment from 'moment';


angular.module('app.printout')
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
        '                    <td><a class="exams-info-title bold-button" ui-sref="printoutListing({id: {{exam.id}} })">{{exam.name}}</a>\n' +
        '                    <td>\n' +
        '                        <teacher-list exam="exam"/>\n' +
        '                    </td>\n' +
        '                </tr>\n' +
        '                </tbody>\n' +
        '            </table>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n',
    controller: [
        '$http',
        function($http) {
            const vm = this;

            vm.$onInit = function() {
                vm.predicate = 'examinationDatesAggregate';
                vm.reverse = true;
                $http.get('/app/exam/printouts').then(function(resp) {
                    resp.data.forEach(function(printout) {
                        const dates = printout.examinationDates.map(function(ed) {
                            return ed.date;
                        });
                        dates.sort(function(a, b) {
                            return a - b;
                        });
                        printout.examinationDatesAggregate = dates
                            .map(function(d) {
                                return moment(d).format('DD.MM.YYYY');
                            })
                            .join(', ');
                    });
                    vm.printouts = resp.data;
                });
            };
        },
    ],
});
