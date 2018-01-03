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
import toast from 'toastr';

angular.module('app.exam.editor')
    .component('languageSelector', {
        template: require('./languageSelector.template.html'),
        bindings: {
            exam: '<'
        },
        controller: ['$q', '$translate', 'Language', 'ExamRes',
            function ($q, $translate, Language, ExamRes) {

                const vm = this;

                vm.$onInit = function () {
                    Language.languageApi.query(function (languages) {
                        vm.examLanguages = languages.map(function (language) {
                            language.name = Language.getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                vm.selectedLanguages = function () {
                    return vm.exam.examLanguages.length === 0 ? $translate.instant('sitnet_select') :
                        vm.exam.examLanguages.map(function (language) {
                            return Language.getLanguageNativeName(language.code);
                        }).join(", ");
                };

                vm.isSelected = function (lang) {
                    return vm.exam.examLanguages.map(function (el) {
                            return el.code;
                        }).indexOf(lang.code) > -1;
                };

                vm.updateExamLanguage = function (lang) {
                    ExamRes.language.update({eid: vm.exam.id, code: lang.code}, function (){
                        if (vm.isSelected(lang)) {
                            const index = vm.exam.examLanguages.map(function (el) {
                                return el.code;
                            }).indexOf(lang.code);
                            vm.exam.examLanguages.splice(index, 1);
                        } else {
                            vm.exam.examLanguages.push(lang);
                        }
                        toast.info($translate.instant('sitnet_exam_language_updated'));
                    }, function (error) {
                        toast.error(error.data);
                    });
                }

            }]
    });
