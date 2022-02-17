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
import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import * as toast from 'toastr';

import { SessionService } from '../session/session.service';
import { WindowRef } from '../utility/window/window.service';
import { RoomService } from './rooms/room.service';
import { MaintenancePeriodDialogComponent } from './schedule/maintenancePeriodDialog.component';

import type { MaintenancePeriod } from '../exam/exam.model';
import type { User } from '../session/session.service';
@Component({
    templateUrl: './examRoomsAdminTabs.component.html',
    selector: 'exam-rooms-admin-tabs',
})
export class ExamRoomsAdminTabsComponent {
    user: User;
    maintenancePeriods: MaintenancePeriod[] = [];

    constructor(
        private modal: NgbModal,
        private translate: TranslateService,
        private session: SessionService,
        private window: WindowRef,
        private state: StateService,
        private room: RoomService,
    ) {
        this.user = this.session.getUser();
    }

    ngOnInit() {
        this.room.listMaintenancePeriods$().subscribe((periods) => (this.maintenancePeriods = periods));
    }

    createExamRoom = () => {
        this.room.getDraft$().subscribe(
            (room) => {
                toast.info(this.translate.instant('sitnet_room_draft_created'));
                this.state.go('staff.room', { id: room.id });
            },
            (error) => {
                toast.error(error.data);
            },
        );
    };

    createPeriod = () => {
        const modalRef = this.modal.open(MaintenancePeriodDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.result
            .then((res: MaintenancePeriod) => {
                this.room.createMaintenancePeriod$(res).subscribe(
                    (mp) => {
                        toast.info(this.translate.instant('sitnet_created'));
                        this.maintenancePeriods.push(mp);
                    },
                    (err) => toast.error(err),
                );
            })
            .catch((err) => toast.error(err));
    };

    updatePeriod = (period: MaintenancePeriod) => {
        const modalRef = this.modal.open(MaintenancePeriodDialogComponent, {
            backdrop: 'static',
            keyboard: true,
            size: 'lg',
        });
        modalRef.componentInstance.period = period;
        modalRef.result
            .then((res: MaintenancePeriod) => {
                this.room.updateMaintenancePeriod$(res).subscribe(
                    () => {
                        toast.info(this.translate.instant('sitnet_updated'));
                        const index = this.maintenancePeriods.indexOf(res);
                        this.maintenancePeriods.splice(index, 1, res);
                    },
                    (err) => toast.error(err),
                );
            })
            .catch((err) => toast.error(err));
    };

    removePeriod = (period: MaintenancePeriod) => {
        this.room.removeMaintenancePeriod$(period).subscribe(
            () => {
                toast.info(this.translate.instant('sitnet_removed'));
                this.maintenancePeriods.splice(this.maintenancePeriods.indexOf(period), 1);
            },
            (err) => toast.error(err),
        );
    };

    editMultipleRooms = () => this.state.go('staff.multiRoom');

    goBack = (event: Event) => {
        event.preventDefault();
        this.window.nativeWindow.history.back();
    };

    getHeadingTranslation = (translation: string) => this.translate.instant(translation);
}
