/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

'use strict';
angular.module('app.exam')
    .component('printout', {
        templateUrl: '/assets/app/exam/printout/printout.template.html',
        controller: ['$http', '$routeParams', '$location', '$sce', 'Files',
            function ($http, $routeParams, $location, $sce, Files) {

                var vm = this;

                vm.$onInit = function () {
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
                            l.ord = ['fi', 'sv', 'en', 'de'].indexOf(l.code); // TODO: fixed languages?
                        });
                        // set sections and question numbering
                        angular.forEach(data.examSections, function (section, index) {
                            section.index = index + 1;
                        });

                        vm.exam = data;

                    });
                };


                vm.getLanguageName = function (lang) { // TODO: fixed languages?
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

                vm.getQuestionTypeName = function (esq) {
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

                vm.exitPreview = function () {
                    var path = $routeParams.tab ? '/exams/' + $routeParams.id + '/' + $routeParams.tab : '/printouts';
                    $location.path(path);
                };

                vm.print = function () {
                    window.print();
                };

                vm.printAttachment = function () {
                    Files.download('/app/attachment/exam/' + $routeParams.id, vm.exam.attachment.fileName);
                };

                vm.trustAsHtml = function (content) {
                    return $sce.trustAsHtml(content);
                };


            }]
    });

