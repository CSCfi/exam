(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$http', '$modal', function ($scope, $http, $modal) {
            $scope.dialog;
            $scope.openCreateExamDialog = function () {
                $scope.dialog = $modal.open({
                    templateUrl: 'assets/templates/create_exam_form.html',
                    backdrop: 'static',
                    controller: "ExamCtrl",
                    resolve : $scope.dialog
                });
            };

            $scope.createExam = function () {
            	var formData = {
                        courseCode: $scope.course.code,
                        courseName: $scope.course.name,
                        courseScope: $scope.course.scope,
                        facultyName: $scope.faculty.name,
                        instructorName: $scope.exam.instructor
                    };
            	
            	$http.post('/exam', formData)
            		.success(function (token) {
                    	toastr.success("Great success!");
                    })
                    .error(function (message) {
                    	toastr.error(message, "You failed!");
                    });
            	
                if($scope.dialog) {
                    $scope.dialog.close();
                }
            }
        }]);
})();