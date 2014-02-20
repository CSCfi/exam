(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$routeParams', '$translate', '$http', 'SITNET_CONF', 'ExamRes',
            function ($scope, $routeParams, $translate, $http, SITNET_CONF, ExamRes) {

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.sections = [];
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

                $scope.addNewSection();
            }]);
})();