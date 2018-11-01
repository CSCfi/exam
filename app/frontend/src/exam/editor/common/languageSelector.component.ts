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

import * as angular from 'angular';
import * as toast from 'toastr';
import { LanguageService } from '../../../common/language.service';
import { Exam, ExamLanguage } from '../../exam.model';

export const LanguageSelectorComponent: angular.IComponentOptions = {
    template: require('./languageSelector.template.html'),
    bindings: {
        exam: '<',
        collaborative: '<'
    },
    controller: class LanguageSelectorController implements angular.IComponentController {
        exam: Exam;
        collaborative: boolean;

        examLanguages: ExamLanguage[];

        constructor(
            private $http: angular.IHttpService,
            private $q: angular.IQService,
            private $translate: angular.translate.ITranslateService,
            private Language: LanguageService
        ) {
            'ngInject';
        }

        $onInit = () =>
            this.Language.getExamLanguages().then((languages: ExamLanguage[]) => {
                this.examLanguages = languages.map((language) => {
                    language.name = this.Language.getLanguageNativeName(language.code) || '';
                    return language;
                });
            })

        selectedLanguages = () =>
            this.exam.examLanguages.length === 0 ? this.$translate.instant('sitnet_select') :
                this.exam.examLanguages.map((language) =>
                    this.Language.getLanguageNativeName(language.code))
                    .join(', ')

        isSelected = (lang: ExamLanguage) =>
            this.exam.examLanguages.map(el => el.code).indexOf(lang.code) > -1

        updateExamLanguage = (lang: ExamLanguage) => {
            const resource = this.collaborative ? '/integration/iop/exams' : '/app/exams';
            this.$http.put(`${resource}/${this.exam.id}/language/${lang.code}`, {}).then(
                () => {
                    if (this.isSelected(lang)) {
                        const index = this.exam.examLanguages.map(el => el.code).indexOf(lang.code);
                        this.exam.examLanguages.splice(index, 1);
                    } else {
                        this.exam.examLanguages.push(lang);
                    }
                    toast.info(this.$translate.instant('sitnet_exam_language_updated'));
                }
            ).catch(resp => toast.error(resp.data));
        }
    }
};

angular.module('app.exam.editor').component('languageSelector', LanguageSelectorComponent);
