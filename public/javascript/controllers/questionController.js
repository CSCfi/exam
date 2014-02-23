(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('QuestionCtrl', ['$scope', 'QuestionRes', '$translate', 'SITNET_CONF', 
                                     function ($scope, QuestionRes, $translate, SITNET_CONF) {

            $scope.newOptionTemplate = SITNET_CONF.TEMPLATES_PATH + "/question-editor-option.html";
            
            var newQuestion = {
                type: "MULTIPLE_CHOICE_ONE_CORRECT",
                question: $translate("sitnet_question_write_name"),
                materials: [],
                answers: [],
                evaluationPhrases: [],
                evaluationCriterias: [],
                comments: [],
                options: [{
                                    "id": 1,
                                    "option": "Esimerkki vaihtoehto",
                                    "correctOption": false,
                                    "score": 1
                                }]
            	};
            
            $scope.questions = QuestionRes.query();

            $scope.newQuestion =  newQuestion;
        	
            $scope.saveQuestion = function () {

            	// TODO: first should check if question is saved ok on the server, then push to local
            	$scope.questions.push(newQuestion);

            	QuestionRes.save($scope.newQuestion, function (newQuestion) {
                    toastr.info("Kysymys lisätty.");
                });
            	
            };
            
            
            $scope.addNewOption = function (newQuestion) {
            	$scope.newQuestion.options.push({
            		id: $scope.newQuestion.options.length + 1,
            		option: $translate("sitnet_option"),
                    correctOption: false,
                    score: 1
                });
            };
            
            $scope.radioChecked = function (option) {
            	option.correctOption = true;
            	
            	var checkbox = document.getElementById(option.id);
            	console.log("value "+ checkbox.value);
            	console.log("name "+ checkbox.name);
            	console.log("id "+ checkbox.id);
            	console.log(" ");
            	
                angular.forEach($scope.newQuestion.options,function(value, index){
                	if(value.id != option.id)
                		value.correctOption = false;
                })
            };
            
        }]);
}());
