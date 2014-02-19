(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$routeParams', '$translate', '$http', 'SITNET_CONF', 'ExamRes', function ($scope, $routeParams, $translate, $http, SITNET_CONF, ExamRes) {

            $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
            $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";

            $scope.exams = ExamRes.query();

            $scope.sections = [];


            $scope.openCreateExamDialog = function () {
                $http.post('/exam')
                    .success(function () {
                        toastr.success("Great success!");
                    })
                    .error(function (message) {
                        toastr.error(message, "You failed!");
                    });
            };

            $scope.toggleSection = function (section) {
                console.log(section);
            };

            $scope.editSection = function (section) {
                console.log(section);
            };

            $scope.editExam = function () {
                console.log("adassadsad");
            };

            $scope.onDrop = function ($event, $data, questions) {
                questions.push($data);
            };

            $scope.addNewSection = function () {
                $scope.sections.push({
                    id: $scope.sections.length + 1,
                    visible: true,
                    name: "nimi",
                    questions: []
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

            $scope.addNewSection();

            //todo: replace this data
            for (var i = 0; i < $scope.sections.length; i++) {
                var questions = $scope.sections[i]['questions'] = [];

                for (var j = 0; j < 2; j++) {
                    questions.push({
                        icon: "",
                        type: "",
                        principal: "",
                        name: "aaa",
                        visible: true
                    });
                }
                console.log($scope.sections[i]);
            }
        }]);
})();