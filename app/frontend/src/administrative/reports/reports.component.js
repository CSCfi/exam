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

angular.module('app.administrative.reports').component('reports', {
    template: `
        <div>
            <div id="sitnet-header" class="header">
                <div class="col-md-12 header-wrapper">
                    <span class="header-text">{{'sitnet_reports' | translate}}</span>
                </div>
            </div>
        
            <div id="dashboard">
                <div class="report-category"><rooms-report ng-if="$ctrl.rooms" rooms="$ctrl.rooms"></rooms-report></div>
                <div class="report-category"><exams-report ng-if="$ctrl.examNames" exam-names="$ctrl.examNames" file-type="xlsx"></exams-report></div>
                <div class="report-category"><exams-report ng-if="$ctrl.examNames" exam-names="$ctrl.examNames" file-type="json"></exams-report></div>
                <div class="report-category"><students-report ng-if="$ctrl.students" students="$ctrl.students"></students-report></div>
                <div class="report-category"><enrolments-report ng-if="$ctrl.examNames" exam-names="$ctrl.examNames"></enrolments-report></div>
                <div class="report-category"><answers-report></answers-report></div>
                <div class="report-category"><reviews-report></reviews-report></div>
                <div class="report-category"><records-report></records-report></div>
                <div class="report-category"><teachers-report ng-if="$ctrl.teachers" teachers="$ctrl.teachers"></teachers-report></div>
            </div>
        </div>
        `,
    controller: [
        'Reports',
        'Room',
        'UserRes',
        function(Reports, Room, UserRes) {
            const vm = this;

            vm.$onInit = function() {
                Room.rooms.query(
                    resp =>
                        (vm.rooms = resp.map(d =>
                            Object.assign({}, { id: d.id, label: `${d.buildingName} - ${d.name}`, value: d }),
                        )),
                );
                Reports.examNames.query(
                    resp =>
                        (vm.examNames = resp.map(d =>
                            Object.assign({}, { id: d.id, label: `${d.course.code} - ${d.name}`, value: d }),
                        )),
                );

                UserRes.usersByRole.query(
                    { role: 'TEACHER' },
                    resp => (vm.teachers = resp.map(d => Object.assign({}, { id: d.id, label: d.name, value: d }))),
                );

                UserRes.usersByRole.query(
                    { role: 'STUDENT' },
                    resp => (vm.students = resp.map(d => Object.assign({}, { id: d.id, label: d.name, value: d }))),
                );
            };
        },
    ],
});
