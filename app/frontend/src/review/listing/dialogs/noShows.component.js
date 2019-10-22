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

class NoShowsController {
    constructor($translate, $window, $scope, ExamRes) {
        //TODO: This could be combined with the aborted exams component by adding some more bindings for customization.
        this.$onInit = () => {
            this.noShows = this.resolve.noShows;
            this.noShows.forEach(r => {
                r.displayName = r.user ? `${r.user.lastName} ${r.user.firstName}` : r.exam.id;
            });
        };
        this.permitRetrial = reservation => {
            ExamRes.reservation.update({ id: reservation.id }, () => {
                reservation.retrialPermitted = true;
                toast.info($translate.instant('sitnet_retrial_permitted'));
            });
        };
        this.cancel = () => {
            this.dismiss({ $value: 'cancel' });
        };
        // Close modal if user clicked the back button and no changes made
        $scope.$on('$routeChangeStart', () => {
            if (!$window.onbeforeunload) {
                this.cancel();
            }
        });
    }
}

angular.module('app.review').component('noShows', {
    template: require('./noShows.template.html'),
    bindings: {
        dismiss: '&',
        resolve: '<',
    },
    controller: ['$translate', '$window', '$scope', 'ExamRes', NoShowsController],
});
