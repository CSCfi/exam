(function () {
    'use strict';
    angular.module('app.exam')
        .controller('PrintoutController', ['$http', '$routeParams', '$location', '$sce', 'fileService',
            function ($http, $routeParams, $location, $sce, fileService) {

                var ctrl = this;

                ctrl.viewPrintout = function () {
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
                };

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
                    var path = $routeParams.tab ? "/exams/examTabs/" + $routeParams.id + "/" +$routeParams.tab : "/printouts";
                    $location.path(path);
                };

                ctrl.print = function () {
                    window.print();
                };

                ctrl.printAttachment = function () {
                    fileService.download('/app/attachment/exam/' + $routeParams.id, ctrl.exam.attachment.fileName);
                };

                ctrl.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };

                ctrl.listPrintouts = function () {
                    $http.get('/app/exam/printouts').success(function (printouts) {
                        printouts.forEach(function (printout) {
                            var dates = printout.examinationDates.map(function (ed) {
                                return ed.date;
                            });
                            dates.sort(function (a, b) {return a - b;});
                            printout.examinationDatesAggregate = dates.map(function (d) {
                                return moment(d).format("DD.MM.YYYY");
                            }).join(", ");
                        });
                        ctrl.printouts = printouts;
                    });
                }

            }]);
}());
