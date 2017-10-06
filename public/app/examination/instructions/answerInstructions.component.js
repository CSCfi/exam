'use strict';

angular.module('app.examination')
    .component('answerInstructions', {
        template: '' +
        '<!-- ANSWER INSTRUCTIONS -->' +
        '<div class="studentexam-header">' +
        '    <span class="exam-title">{{\'sitnet_exam_guide\' | translate}}</span>' +
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

                var vm = this;

                vm.printExamDuration = function () {
                    return DateTime.printExamDuration(vm.exam);
                };
            }
        ]
    });
