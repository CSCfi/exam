(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('PrintoutController', ['$http', '$routeParams', '$location',
            function ($http, $routeParams, $location) {

                var ctrl = this;

                $http.get('/app/exampreview/' + $routeParams.id).success(function (data) {
                    data.examSections.sort(function (a, b) {
                        return a.sequenceNumber - b.sequenceNumber;
                    });
                    data.examSections.forEach(function (es) {
                        es.sectionQuestions.filter(function (esq) {
                            return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                        }).forEach(function (esq) {
                            esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                        });
                    });
                    data.examLanguages.forEach(function (l) {
                        l.ord = ['fi', 'sv', 'en', 'de'].indexOf(l.code);
                    });
                    // set sections and question numbering
                    angular.forEach(data.examSections, function (section, index) {
                        section.index = index + 1;
                    });

                    ctrl.exam = data;

                });

                ctrl.getLanguageName = function (lang) {
                    var name;
                    switch (lang.code) {
                        case 'fi':
                            name = 'suomeksi';
                            break;
                        case 'sv':
                            name = 'på svenska';
                            break;
                        case 'en':
                            name = 'in English';
                            break;
                        case 'de':
                            name = 'auf Deutsch';
                            break;
                    }
                    return name;
                };

                ctrl.getQuestionTypeName = function (esq) {
                    var name;
                    switch (esq.question.type) {
                        case 'WeightedMultipleChoiceQuestion':
                            name = 'Monivalintakysymys (voit valita monta) / Flervalsfråga (du kan välja många) / Multiple choice question (you can pick multiple)';
                            break;
                        case 'MultipleChoiceQuestion':
                            name = 'Monivalintakysymys (valitse yksi) / Flervalsfråga (välj en) / Multiple choice question (pick one)';
                            break;
                        case 'EssayQuestion':
                            name = 'Esseekysymys / Essefråga / Essay question';
                            break;
                        case 'ClozeTestQuestion':
                            name = 'Aukkotehtävä / Fyll i det som saknas / Cloze test question';
                            break;
                    }
                    return name;
                };

                ctrl.exitPreview = function () {
                    $location.path("/exams/examTabs/" + $routeParams.id + "/1");
                };

                ctrl.print = function () {
                    window.print();
                }


            }]);
}());
