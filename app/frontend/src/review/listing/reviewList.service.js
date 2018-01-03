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


import _ from 'lodash';

angular.module('app.review')
    .service('ReviewList', ['Exam',
        function (Exam) {

            const self = this;

            self.gradeExam = function (exam) {
                if (!exam.grade || !exam.grade.id) {
                    exam.grade = {};
                }
                if (!exam.selectedGrade) {
                    exam.selectedGrade = {};
                }
                const scale = exam.gradeScale || exam.parent.gradeScale || exam.course.gradeScale;
                scale.grades = scale.grades || [];
                exam.selectableGrades = scale.grades.map(function (grade) {
                    grade.type = grade.name;
                    grade.name = Exam.getExamGradeDisplayName(grade.name);
                    if (exam.grade && exam.grade.id === grade.id) {
                        exam.grade.type = grade.type;
                        exam.selectedGrade = grade;
                    }
                    return grade;
                });
                const noGrade = {type: 'NONE', name: Exam.getExamGradeDisplayName('NONE')};
                if (exam.gradeless && !exam.selectedGrade) {
                    exam.selectedGrade = noGrade;
                }
                exam.selectableGrades.push(noGrade);
            };

            self.filterReview = function (filter, review) {
                if (!filter) {
                    return true;
                }
                const s = filter.toLowerCase();
                const name = _.get(review, 'user.firstName', '') + ' ' + lodash.get(review, 'user.lastName', '');
                return name.toLowerCase().indexOf(s) > -1
                    || _.get(review, 'user.email', '').toLowerCase().indexOf(s) > -1;
            };

            self.applyFilter = function (filter, items) {
                if (!filter) {
                    return items;
                }
                return items.filter(function (i) {
                    return self.filterReview(filter, i);
                });
            }

        }]);

