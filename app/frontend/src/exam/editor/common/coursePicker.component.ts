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
import { Course } from '../../exam.model';

export const CoursePickerComponent: angular.IComponentOptions = {
    template: require('./coursePicker.template.html'),
    bindings: {
        course: '<',
        onUpdate: '&'
    },
    controller: class CoursePickerController implements angular.IComponentController, angular.IOnInit {

        course: Course;
        onUpdate: (_: { course: { name: string; code: string } }) => any;
        filter: { name: string; code: string };
        loadingCoursesByCode: boolean;
        loadingCoursesByName: boolean;

        constructor(
            private $q: angular.IQService,
            private $translate: angular.translate.ITranslateService,
            private $http: angular.IHttpService,
        ) {
            'ngInject';
        }

        $onInit = () => {
            this.filter = {
                name: this.course ? this.course.name : '',
                code: this.course ? this.course.code : ''
            };
        }

        getCourses = (filter: string, criteria: string): angular.IPromise<Course[]> => {
            this.toggleLoadingIcon(filter, true);
            this.setInputValue(filter, criteria);
            const deferred: angular.IDeferred<Course[]> = this.$q.defer();
            this.$http.get('/app/courses', { params: { filter: filter, q: criteria } }).then(
                (resp: angular.IHttpResponse<Course[]>) => {
                    this.toggleLoadingIcon(filter, false);
                    if (resp.data.length === 0) {
                        toast.error(`${this.$translate.instant('sitnet_course_not_found')} ( ${criteria} )`);
                    }
                    return deferred.resolve(resp.data);
                }).catch(() => {
                    this.toggleLoadingIcon(filter, false);
                    toast.error(`${this.$translate.instant('sitnet_course_not_found')} ( ${criteria} )`);
                    return deferred.resolve([]);
                });
            return deferred.promise;
        }

        onCourseSelect = (selection: { name: string; code: string }) => {
            this.filter = { name: selection.name, code: selection.code };
            this.onUpdate({ course: selection });
        }

        toggleLoadingIcon = (filter: string, isOn: boolean) => {
            if (filter && filter === 'code') {
                this.loadingCoursesByCode = isOn;
            } else if (filter && filter === 'name') {
                this.loadingCoursesByName = isOn;
            }
        }

        setInputValue = (filter: string, value: string) => {
            if (filter === 'code') {
                this.filter = { code: value, name: '' };
            } else if (filter === 'name') {
                this.filter = { name: value, code: '' };
            }
        }
    }
};

angular.module('app.exam.editor').component('coursePicker', CoursePickerComponent);
