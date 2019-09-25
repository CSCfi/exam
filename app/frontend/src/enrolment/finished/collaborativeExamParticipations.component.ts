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
 *
 */

import * as angular from 'angular';
import { Participation } from '../../exam/exam.model';
import { CollaborativeExamService } from '../../exam/collaborative/collaborativeExam.service';

interface Filter {
    ordering: string;
    text: string;
}

export const CollaborativeExamParticipationsComponent: angular.IComponentOptions = {
    template: require('./examParticipations.template.html'),
    controller: class CollaborativeExamParticipationsController implements angular.IComponentController {

        collaborative = true;
        originals: Participation[];
        participations: Participation[];
        pageSize = 10;
        currentPage = 1;
        filter: Filter;

        constructor(
            private CollaborativeExam: CollaborativeExamService
        ) {
            'ngInject';
        }

        $onInit() {
            this.filter = { ordering: '-ended', text: '' };
            this.CollaborativeExam.listStudentParticipations().then((participations: Participation[]) => {
                this.originals = Array.from(participations);
                this.participations = Array.from(participations);
            }).catch(angular.noop);
        }

        pageSelected(page: number) {
            this.currentPage = page;
        }

        search() {
            const text = this.filter.text;
            if (!text || text.length < 1) {
                this.participations = this.originals;
                return;
            }
            this.participations = this.originals.filter((participation: Participation) => {
                const exam = participation.exam;
                return exam && exam.name && exam.name.indexOf(text) > -1;
            });
        }

    }
};

angular.module('app.enrolment')
    .component('collaborativeExamParticipations', CollaborativeExamParticipationsComponent);
