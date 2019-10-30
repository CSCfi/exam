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
import * as angular from 'angular';
import * as toast from 'toastr';

import { Course, Exam } from '../../exam.model';
import { ExamService } from '../../exam.service';

export const ExamCourseComponent: angular.IComponentOptions = {
    template: require('./examCourse.template.html'),
    bindings: {
        exam: '<',
        onUpdate: '&',
    },
    controller: class ExamCourseController implements angular.IComponentController {
        exam: Exam;
        onUpdate: (_: { course: Course }) => unknown;

        constructor(
            private $translate: angular.translate.ITranslateService,
            private $http: angular.IHttpService,
            private Exam: ExamService,
        ) {
            'ngInject';
        }

        displayGradeScale = () =>
            this.exam.course && this.exam.course.gradeScale
                ? this.Exam.getScaleDisplayName(this.exam.course.gradeScale)
                : null;

        setCourse = (course: Course) =>
            this.$http.put(`/app/exams/${this.exam.id}/course/${course.id}`, {}).then(() => {
                toast.success(this.$translate.instant('sitnet_exam_associated_with_course'));
                this.exam.course = course;
                this.onUpdate({ course: course });
            });
    },
};

angular.module('app.exam.editor').component('examCourse', ExamCourseComponent);
