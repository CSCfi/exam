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

angular.module('app.administrative.reports').component('examsReport', {
    template: `
        <div class="top-row">
            <h4 class="col-md-12">
                {{'sitnet_get_all_info_from_exam' | translate }} 
                <span ng-if="$ctrl.fileType==='xlsx'">{{'sitnet_excel_file' | translate}}</span>
                <span ng-if="$ctrl.fileType==='json'">{{'sitnet_json_file' | translate}}</span>
            </h4>
        </div>
        
        <div class="bottom-row">
            <div class="col-md-10">
                <label for="exam">{{'sitnet_select_exam' | translate}}</label>
                <drop-down-select id="exam" options="$ctrl.examNames" on-select="$ctrl.examSelected(value)">
                </drop-down-select>
                
            </div>
        
            <div class="col-md-2">
                <label for="link"></label>
                <div id="link">
                    <a ng-click="$ctrl.getExams()" class="fa-stack fa-lg pull-right"
                       download popover-trigger="'mouseenter'"
                       uib-popover="{{'sitnet_download' | translate}}">
                        <i class="fa fa-stop fa-stack-2x sitnet-text-ready"></i>
                        <i ng-if="$ctrl.fileType==='xlsx'" class="fa fa-file-word-o sitnet-white fa-stack-1x"></i>
                        <i ng-if="$ctrl.fileType==='json'" class="fa fa-file-code-o sitnet-white fa-stack-1x"></i>
                    </a>
                </div>
            </div>
        
        </div>
        `,
    bindings: {
        examNames: '<',
        fileType: '@', // json|xlsx
    },
    controller: [
        '$translate',
        'Files',
        function($translate, Files) {
            const vm = this;

            vm.examSelected = function(value) {
                vm.exam = value;
            };

            vm.getExams = function() {
                if (vm.exam) {
                    const url = `/app/statistics/examnames/${vm.exam.id}/${vm.fileType}`;
                    const fileName = `exams.${vm.fileType}`;
                    Files.download(url, fileName);
                } else {
                    toast.error($translate.instant('sitnet_choose_exam'));
                }
            };
        },
    ],
});
