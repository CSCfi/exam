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
import * as _ from 'lodash';
import * as moment from 'moment';
import { LanguageService } from '../utility/language/language.service';
import { LanguageInspectionService, QueryParams } from './languageInspections.service';
import { LanguageInspection } from './maturity.model';

interface LanguageInspectionData extends LanguageInspection {
    ownerAggregate: string;
    studentName: string;
    studentNameAggregate: string;
    inspectorName: string;
    inspectorNameAggregate: string;
    answerLanguage?: string;
}

export const LanguageInspectionsComponent: angular.IComponentOptions = {
    template: require('./languageInspections.template.html'),
    controller: class LanguageInspectionsController implements angular.IComponentController {

        private startDate: Date;
        private endDate: Date;
        private ongoingInspections: LanguageInspectionData[];
        private processedInspections: LanguageInspectionData[];

        constructor(
            private Language: LanguageService,
            private LanguageInspections: LanguageInspectionService
        ) {
            'ngInject';
        }

        $onInit = () => this.query();

        private query = () => {
            const params: QueryParams = {};
            const tzOffset = new Date().getTimezoneOffset() * 60000;
            if (this.startDate) {
                params.start = this.startDate.getTime() + tzOffset;
            }
            if (this.endDate) {
                const m = moment(this.endDate).add(1, 'days');
                params.end = Date.parse(m.format());
            }
            const refreshAll = _.isEmpty(params);
            this.LanguageInspections.query(params).then(
                (resp) => {
                    const inspections: LanguageInspectionData[] = resp.data.map(i =>
                        _.assign(i, {
                            ownerAggregate: i.exam.parent ? i.exam.parent.examOwners
                                .map(o => `${o.firstName} ${o.lastName}`).join(', ') : '',
                            studentName: i.exam.creator ?
                                `${i.exam.creator.firstName} ${i.exam.creator.lastName}` : '',
                            studentNameAggregate: i.exam.creator ?
                                `${i.exam.creator.lastName} ${i.exam.creator.firstName}` : '',
                            inspectorName: i.modifier ?
                                `${i.modifier.firstName} ${i.modifier.lastName}` : '',
                            inspectorNameAggregate: i.modifier ?
                                `${i.modifier.lastName} ${i.modifier.firstName}` : '',
                            answerLanguage: i.exam.answerLanguage ?
                                this.Language.getLanguageNativeName(i.exam.answerLanguage) : undefined
                        })
                    );
                    if (refreshAll) {
                        this.ongoingInspections = inspections.filter(i => !i.finishedAt);
                    }
                    this.processedInspections = inspections.filter(i => i.finishedAt);
                });
        }

        startDateChanged = (date) => {
            this.startDate = date;
            this.query();
        }

        endDateChanged = (date) => {
            this.endDate = date;
            this.query();
        }

    }
};


angular.module('app.maturity').component('languageInspections', LanguageInspectionsComponent);

