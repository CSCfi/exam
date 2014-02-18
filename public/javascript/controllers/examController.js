(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$http', 'ExamRes', function ($scope, $http, ExamRes) {

            $scope.exams = ExamRes.query();

            $scope.openCreateExamDialog = function () {
                $http.post('/exam')
                    .success(function () {
                        toastr.success("Great success!");
                    })
                    .error(function (message) {
                        toastr.error(message, "You failed!");
                    });
            };

            $scope.createExam = function () {
                var formData = {
                    courseCode: $scope.course.code,
                    courseName: $scope.course.name,
                    courseScope: $scope.course.credits,
                    facultyName: $scope.faculty.name,
                    instructorName: $scope.exam.instructor
                };

                $http.post('/exam', formData)
                    .success(function () {
                        toastr.success("Great success!");
                    })
                    .error(function (message) {
                        toastr.error(message, "You failed!");
                    });
            }
        }]);
})();