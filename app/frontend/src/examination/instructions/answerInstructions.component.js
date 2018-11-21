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

angular.module('app.examination')
    .component('answerInstructions', {
        template: '' +
            '<!-- ANSWER INSTRUCTIONS -->' +
            '<div class="studentexam-header">' +
            '    <h1><span class="exam-title">{{\'sitnet_exam_guide\' | translate}}</span></h1>' +
            '</div>' +
            '<div class="guide-wrapper marr0 pad-15 col-md-12">' +
            '    <div class="guide-column">' +
            '        <span class="header col-md-4"><span>{{ \'sitnet_course_name\' | translate }}:</span></span>' +
            '        <span class="text col-md-8">{{ $ctrl.exam.course.name }}&nbsp;</span>' +
            '    </div>' +
            '    <div class="guide-column">' +
            '        <span class="header col-md-4"><span>{{ \'sitnet_course_code\' | translate }}:</span></span>' +
            '        <span class="text col-md-8">{{ $ctrl.exam.course.code }}&nbsp;</span>' +
            '    </div>' +
            '    <div class="guide-column">' +
            '        <span class="header col-md-4"><span>{{ \'sitnet_exam_name\' | translate }}:</span></span>' +
            '        <span class="text col-md-8">{{ $ctrl.exam.name }}&nbsp;</span>' +
            '    </div>' +
            '    <div class="guide-column">' +
            '        <span class="header col-md-4"><span>{{ \'sitnet_exam_duration\' | translate }}:</span></span>' +
            '        <span class="text col-md-8">{{ $ctrl.printExamDuration() }}&nbsp;</span>' +
            '    </div>' +
            '    <div class="guide-column padtop">' +
            '        <span>{{ \'sitnet_exam_guide\' | translate }}:</span>' +
            '    </div>' +
            '    <div class="guide-column">' +
            '        <div class="list-group">' +
            '            <form class="form-inline pad-15" role="form">' +
            '                <div class="guide-instruction col-md-12" ng-bind-html="$ctrl.exam.instruction"></div>' +
            '            </form>' +
            '        </div>' +
            '    </div>' +
            '</div>',
        bindings: {
            exam: '<'
        },
        controller: ['DateTime',
            function (DateTime) {

                const vm = this;

                vm.printExamDuration = function () {
                    return DateTime.printExamDuration(vm.exam);
                };
            }
        ]
    });
