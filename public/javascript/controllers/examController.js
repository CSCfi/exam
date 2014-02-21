(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$routeParams', '$translate', '$http', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, $routeParams, $translate, $http, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.sections = [];
                $scope.exams = ExamRes.query();

                var questions = QuestionRes.query(function () {
                    questions.map(function (item) {
                        var icon = "";
                        switch (item.type) {
                            case "MULTIPLE_CHOICE_ONE_CORRECT":
                            case "MULTIPLE_CHOICE_SEVERAL_CORRECT":
                                icon = "fa-list-ol";
                                break;
                            case "ESSAY":
                                icon = "fa-edit";
                                break;
                            default: "";
                                icon = "fa-edit";
                                break;
                        }
                        item.icon = icon;
                    });
                    $scope.questions = questions;
                });

                $scope.options;
                $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
                $scope.libraryFilter = "";
                $scope.selected = undefined;

 
                $scope.toggleSection = function (section) {
                   section.icon = "";
                   section.hide ^= true;
                };

                $scope.save = function() {
                	alert("save");
                }
                
                $scope.editSection = function (section) {
                    console.log(section);
                };

                $scope.toggleQuestion = function (question) {
                    question.hide ^= true;
                };

                $scope.editQuestion = function (question) {
                    console.log(question);
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
                        hide: false,
                        name: "Osio",
                        questions: []
                    });

                };

                $scope.addNewSection();
            }]);
})();