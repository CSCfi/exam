/*
 * Copyright (c) 2018 Exam Consortium
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

import { CollaborativeExam } from '../../exam/exam.model';
import { CollaborativeExamService } from '../../exam/collaborative/collaborativeExam.service';
import { EnrolmentService } from '../enrolment.service';

interface CollaborativeExamInfo extends CollaborativeExam {
    languages: string[];
    reservationMade: boolean;
    enrolled: boolean;
}

export const CollaborativeExamSearchComponent: angular.IComponentOptions = {
    template: require('./collaborativeExamSearch.template.html'),
    controller: class CollaborativeExamSearchController implements angular.IComponentController {
        exams: CollaborativeExamInfo[];
        filter: { text: string };
        loader: { loading: boolean };

        constructor(
            private Enrolment: EnrolmentService,
            private Language: any,
            private CollaborativeExam: CollaborativeExamService,
        ) {
            'ngInject';
        }

        $onInit() {
            this.filter = { text: '' };
            this.loader = { loading: false };
        }

        search = () => {
            const { text } = this.filter;

            if (text.length <= 2) {
                return;
            }

            this.loader = { loading: true };
            this.CollaborativeExam.searchExams(text)
                .then((exams: CollaborativeExam[]) => this.updateExamList(exams))
                .catch(angular.noop)
                .finally(() => {
                    this.loader = { loading: false };
                });
        };

        updateExamList(exams: CollaborativeExam[]) {
            this.exams = exams.map(e =>
                _.assign(e, {
                    reservationMade: false,
                    enrolled: false,
                    languages: e.examLanguages.map(l => this.Language.getLanguageNativeName(l.code)),
                }),
            );
            this.exams.forEach(e => {
                this.Enrolment.getEnrolments(e.id, true)
                    .then(enrolments => {
                        e.reservationMade = enrolments.some(e => _.isObject(e.reservation));
                        e.enrolled = enrolments.length > 0;
                    })
                    .catch(angular.noop);
            });
        }
    },
};

angular.module('app.enrolment').component('collaborativeExamSearch', CollaborativeExamSearchComponent);
