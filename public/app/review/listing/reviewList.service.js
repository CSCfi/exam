'use strict';
angular.module('app.review')
    .service('ReviewList', ['Exam',
        function (Exam) {

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

        }]);

