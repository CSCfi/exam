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
import { SessionService } from '../../session/session.service';
import { TeacherDashboardService } from './teacherDashboard.service';

interface ExtraColumn {
    text: string;
    property: string;
    link: string;
    checkOwnership: boolean;
}

export const TeacherDashboardComponent: angular.IComponentOptions = {
    template: require('./teacherDashboard.template.html'),
    controller: class TeacherDashboardController implements angular.IComponentController {

        activeTab: number;
        userId: number;
        activeExtraColumns: ExtraColumn[];
        finishedExtraColumns: ExtraColumn[];
        archivedExtraColumns: ExtraColumn[];
        draftExtraColumns: ExtraColumn[];
        finishedExams: any[];
        filteredFinished: any[];
        activeExams: any[];
        filteredActive: any[];
        archivedExams: any[];
        filteredArchived: any[];
        draftExams: any[];
        filteredDrafts: any[];

        constructor(
            private $location: angular.ILocationService,
            private $filter: angular.IFilterService,
            private TeacherDashboard: TeacherDashboardService,
            private Session: SessionService
        ) {
            'ngInject';
            this.activeExtraColumns = [
                {
                    text: 'sitnet_participation_unreviewed',
                    property: 'unassessedCount',
                    link: '/exams/__/4',
                    checkOwnership: true
                }, {
                    text: 'sitnet_participation_unfinished',
                    property: 'unfinishedCount',
                    link: '/exams/__/4',
                    checkOwnership: true
                }, {
                    text: 'sitnet_dashboard_title_waiting_reservation',
                    property: 'reservationCount',
                    link: '/reservations/__',
                    checkOwnership: false
                }
            ];
            this.finishedExtraColumns = [
                {
                    text: 'sitnet_participation_unreviewed',
                    property: 'unassessedCount',
                    link: '/exams/__/4',
                    checkOwnership: true
                }, {
                    text: 'sitnet_participation_unfinished',
                    property: 'unfinishedCount',
                    link: '/exams/__/4',
                    checkOwnership: true
                }
            ];
            this.archivedExtraColumns = [
                {
                    text: 'sitnet_participations_assessed',
                    property: 'assessedCount',
                    link: '/exams/__/4',
                    checkOwnership: true
                }
            ];
            this.draftExtraColumns = [];
        }

        $onInit() {
            this.activeTab = this.$location.search().tab ? parseInt(this.$location.search().tab) : 1;
            this.userId = this.Session.getUser().id;
            this.TeacherDashboard.populate(this).then(() => {
                this.filteredFinished = this.finishedExams;
                this.filteredActive = this.activeExams;
                this.filteredArchived = this.archivedExams;
                this.filteredDrafts = this.draftExams;
            });
        }

        changeTab = (index) => this.$location.search('tab', index);

        search(text) {

            // Use same search parameter for all the 4 result tables
            this.filteredFinished = this.$filter('filter')(this.finishedExams, text);
            this.filteredActive = this.$filter('filter')(this.activeExams, text);
            this.filteredArchived = this.$filter('filter')(this.archivedExams, text);
            this.filteredDrafts = this.$filter('filter')(this.draftExams, text);

            // for drafts, display exams only for owners AM-1658
            this.filteredDrafts = this.filteredDrafts.filter(exam => exam.examOwners.some(eo => eo.id === this.userId));

            // for finished, display exams only for owners OR if exam has unassessed reviews AM-1658
            this.filteredFinished = this.filteredFinished.filter(
                exam => exam.unassessedCount > 0 || exam.examOwners.some(eo => eo.id === this.userId));

            // for active, display exams only for owners OR if exam has unassessed reviews AM-1658
            this.filteredActive = this.filteredActive.filter(exam =>
                exam.unassessedCount > 0 || exam.examOwners.some(eo => eo.id === this.userId));

        }

    }
};

