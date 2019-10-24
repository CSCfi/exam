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
import angular from 'angular';

angular.module('app.printout')
    .component('printout', {
    template: require('./printout.template.html'),
    controller: [
        '$http',
        '$stateParams',
        '$state',
        '$window',
        '$sce',
        'Files',
        function($http, $stateParams, $state, $window, $sce, Files) {
            const vm = this;

            vm.$onInit = function() {
                $http.get('/app/exams/' + $stateParams.id + '/preview').then(function(resp) {
                    resp.data.examSections.sort(function(a, b) {
                        return a.sequenceNumber - b.sequenceNumber;
                    });
                    resp.data.examSections.forEach(function(es) {
                        es.sectionQuestions
                            .filter(function(esq) {
                                return esq.question.type === 'ClozeTestQuestion' && esq.clozeTestAnswer.answer;
                            })
                            .forEach(function(esq) {
                                esq.clozeTestAnswer.answer = JSON.parse(esq.clozeTestAnswer.answer);
                            });
                    });
                    resp.data.examLanguages.forEach(function(l) {
                        l.ord = ['fi', 'sv', 'en', 'de'].indexOf(l.code); // TODO: fixed languages?
                    });
                    // set sections and question numbering
                    angular.forEach(resp.data.examSections, function(section, index) {
                        section.index = index + 1;
                    });

                    vm.exam = resp.data;
                });
            };

            vm.getLanguageName = function(lang) {
                // TODO: fixed languages?
                let name;
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

            vm.getQuestionTypeName = function(esq) {
                let name;
                switch (esq.question.type) {
                    case 'WeightedMultipleChoiceQuestion':
                        name =
                            'Monivalintakysymys (voit valita monta) / Flervalsfråga (du kan välja många) / Multiple choice question (you can pick multiple)';
                        break;
                    case 'MultipleChoiceQuestion':
                        name =
                            'Monivalintakysymys (valitse yksi) / Flervalsfråga (välj en) / Multiple choice question (pick one)';
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

            vm.exitPreview = function() {
                if ($stateParams.tab) {
                    $state.go('examEditor', {
                        id: $stateParams.id,
                        tab: $stateParams.tab,
                    });
                } else {
                    $state.go('printouts');
                }
            };

            vm.print = function() {
                $window.print();
            };

            vm.printAttachment = function() {
                Files.download('/app/attachment/exam/' + $stateParams.id, vm.exam.attachment.fileName);
            };

            vm.trustAsHtml = function(content) {
                return $sce.trustAsHtml(content);
            };
        },
    ],
});
