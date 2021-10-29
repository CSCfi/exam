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
import { TranslateService } from '@ngx-translate/core';
import { StateService } from '@uirouter/angular';
import * as toast from 'toastr';

import { SessionService } from '../session/session.service';
import { WindowRef } from '../utility/window/window.service';
import { RoomService } from './rooms/room.service';

import type { OnInit } from '@angular/core';
import type { User } from '../session/session.service';

@Component({
    templateUrl: './examRoomsAdminTabs.component.html',
    selector: 'exam-rooms-admin-tabs',
})
export class ExamRoomsAdminTabsComponent implements OnInit {
    user: User;

    constructor(
        private translate: TranslateService,
        private session: SessionService,
        private window: WindowRef,
        private state: StateService,
        private room: RoomService,
    ) {}

    ngOnInit() {
        this.user = this.session.getUser();
    }

    createExamRoom = () => {
        this.room.getDraft$().subscribe(
            (room) => {
                toast.info(this.translate.instant('sitnet_room_draft_created'));
                this.state.go('room', { id: room.id });
            },
            (error) => {
                toast.error(error.data);
            },
        );
    };

    editMultipleRooms = function () {
        this.state.go('multiRoom');
    };

    goBack = (event: Event) => {
        event.preventDefault();
        this.window.nativeWindow.history.back();
    };

    getHeadingTranslation = (translation: string) => this.translate.instant(translation);
}
