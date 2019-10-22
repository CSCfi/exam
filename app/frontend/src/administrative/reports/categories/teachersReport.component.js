/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
import toast from 'toastr';

angular.module('app.administrative.reports').component('teachersReport', {
    template: `
        <div class="top-row">
            <h4 class="col-md-12">
                {{'sitnet_get_all_teacher_exams' | translate}}
            </h4>
        </div>
        <div class="bottom-row">
            <div class="col-md-2">
                <label for="teacher">{{'sitnet_teacher' | translate}}</label>
                 <drop-down-select id="teacher" options="$ctrl.teachers" on-select="$ctrl.teacherSelected(value)">
                 </drop-down-select>
            </div>
            <div class="col-md-4">
                <label for="startAt">{{'sitnet_start_time' | translate}}</label>
                <div id="startAt">
                    <date-picker on-update="$ctrl.startDateChanged(date)"></date-picker>
                </div>
            </div>
            <div class="col-md-4">
                <label for="endAt">{{'sitnet_end_time' | translate}}</label>
                <div id="endAt">
                    <date-picker on-update="$ctrl.endDateChanged(date)"></date-picker>
                </div>
            </div>
            <div class="col-md-2">
                <label for="link">&nbsp;</label>
                <div id="link">
                    <a ng-click="$ctrl.getTeacherExamsByDate()" class="fa-stack fa-lg pointer pull-right" 
                        download popover-trigger="'mouseenter'" uib-popover="{{'sitnet_download' | translate}}">
                        <i class="fa fa-stop fa-stack-2x sitnet-text-ready"></i>
                        <i class="fa fa-file-word-o sitnet-white fa-stack-1x"></i>
                    </a>
                </div>
            </div>
        </div>
        `,
    bindings: {
        teachers: '<',
    },
    controller: [
        '$filter',
        '$translate',
        'Files',
        function($filter, $translate, Files) {
            const vm = this;

            vm.getTeacherExamsByDate = function() {
                const f = $filter('date')(vm.startDate || new Date(), 'dd.MM.yyyy');
                const t = $filter('date')(vm.endDate || new Date(), 'dd.MM.yyyy');
                if (vm.teacher) {
                    Files.download(
                        `/app/statistics/teacherexamsbydate/${vm.teacher.id}/${f}/${t}`,
                        `teacherexams_${f}_${t}.xlsx`,
                    );
                } else {
                    toast.error($translate.instant('sitnet_choose_teacher'));
                }
            };

            vm.teacherSelected = function(value) {
                vm.teacher = value;
            };

            vm.answerStartDateChanged = function(date) {
                vm.answerStartDate = date;
            };

            vm.answerEndDateChanged = function(date) {
                vm.answerEndDate = date;
            };
        },
    ],
});
