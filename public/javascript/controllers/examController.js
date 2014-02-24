(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('ExamCtrl', ['$scope', '$routeParams', '$translate', '$http', 'SITNET_CONF', 'ExamRes', 'QuestionRes',
            function ($scope, $routeParams, $translate, $http, SITNET_CONF, ExamRes, QuestionRes) {

                $scope.sectionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section.html";
                $scope.questionPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_question.html";
                $scope.generalInfoPath = SITNET_CONF.TEMPLATES_PATH + "/exam_section_general.html";
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
                            default:
                                icon = "fa-edit";
                                break;
                        }
                        item.icon = icon;
                    });
                    $scope.questions = questions;
                });

                $scope.contentTypes = ["aineistotyypit", "haettava", "kannasta", "Kaikki aineistotyypit - oletus"];
                $scope.libraryFilter = "";
                $scope.selected = undefined;


                $scope.toggleSection = function (section) {
                    section.icon = "";
                    section.hide = !section.hide;
                };

                $scope.save = function () {

                };

                $scope.removeSection = function (section) {
                    if (confirm('Poistetaanko osio?')) {
                    	$scope.sections.splice($scope.sections.indexOf(section), 1);
                    }
                }

                $scope.clearAllQuestions = function (section) {
                    if (confirm('Poistetaanko kaikki kysymykset?')) {
                        section.questions.splice(0, questions.length);
                    }
                }

                $scope.removeQuestion = function (section, question) {
                    if (confirm('Poistetaanko kysymys?')) {
                    	section.questions.splice(section.questions.indexOf(question), 1);
                    }
                }


                $scope.editSection = function (section) {
                    console.log(section);
                };

                $scope.toggleQuestion = function (question) {
                    question.hide = !question.hide;
                };

                $scope.editQuestion = function (question) {

                };

                $scope.editExam = function () {

                };

                $scope.onDrop = function ($event, $data, questions) {
                    questions.push($data);
                };

                $scope.addNewSection = function () {
                    $scope.sections.push({
                        id: $scope.sections.length + 1,
                        hide: false,
                        name: $translate("section_default_name"),
                        questions: []
                    });

                };

                $scope.addNewSection();
            }]);
}());