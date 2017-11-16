'use strict';
angular.module('app.review')
    .service('ReviewList', ['Exam', '_',
        function (Exam, _) {

            var self = this;

            self.gradeExam = function (exam) {
                if (!exam.grade || !exam.grade.id) {
                    exam.grade = {};
                }
                if (!exam.selectedGrade) {
                    exam.selectedGrade = {};
                }
                var scale = exam.gradeScale || exam.parent.gradeScale || exam.course.gradeScale;
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
                var noGrade = {type: 'NONE', name: Exam.getExamGradeDisplayName('NONE')};
                if (exam.gradeless && !exam.selectedGrade) {
                    exam.selectedGrade = noGrade;
                }
                exam.selectableGrades.push(noGrade);
            };

            self.filterReview = function (filter, review) {
                if (!filter) {
                    return true;
                }
                var s = filter.toLowerCase();
                var name = _.get(review, 'user.firstName', '') + ' ' + _.get(review, 'user.lastName', '');
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

