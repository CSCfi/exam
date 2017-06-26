'use strict';
angular.module('app.exam.editor')
    .component('languageSelector', {
        templateUrl: '/assets/app/exam/editor/common/languageSelector.template.html',
        bindings: {
            exam: '<'
        },
        controller: ['$q', '$translate', 'Language', 'ExamRes',
            function ($q, $translate, Language, ExamRes) {

                var vm = this;

                vm.$onInit = function () {
                    Language.languages.query(function (languages) {
                        vm.examLanguages = languages.map(function (language) {
                            language.name = getLanguageNativeName(language.code);
                            return language;
                        });
                    });
                };

                vm.selectedLanguages = function () {
                    return vm.exam.examLanguages.length === 0 ? $translate.instant('sitnet_select') :
                        vm.exam.examLanguages.map(function (language) {
                            return getLanguageNativeName(language.code);
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
                            var index = vm.exam.examLanguages.map(function (el) {
                                return el.code;
                            }).indexOf(lang.code);
                            vm.exam.examLanguages.splice(index, 1);
                        } else {
                            vm.exam.examLanguages.push(lang);
                        }
                        toastr.info($translate.instant('sitnet_exam_language_updated'));
                    }, function (error) {
                        toastr.error(error.data);
                    });
                }

            }]
    });
