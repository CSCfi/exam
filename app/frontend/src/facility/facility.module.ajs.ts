// /*
//  * Copyright (c) 2017 Exam Consortium
//  *
//  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
//  * versions of the EUPL (the "Licence");
//  * You may not use this work except in compliance with the Licence.
//  * You may obtain a copy of the Licence at:
//  *
//  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
//  *
//  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
//  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the Licence for the specific language governing permissions and limitations under the Licence.
//  */

import { downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import * as angular from 'angular';
import { ExamRoomsAdminTabsComponent } from './examRoomsAdminTabs.component';
import { AvailabilityComponent } from './rooms/availability.component';
import { ExceptionListAllComponent } from './rooms/exceptionListAll.component';
import { InteroperabilityResourceService } from './rooms/interoperabilityResource.service';
import { MultiRoomComponent } from './rooms/multiRoom.component';
import { RoomComponent } from './rooms/room.component';
import { RoomService } from './rooms/room.service';
import { RoomListComponent } from './rooms/roomList.component';
import { SettingsResourceService } from './rooms/settingsResource';
import { ExceptionDialogComponent } from './schedule/exceptionDialog.component';
import { ExceptionListComponent } from './schedule/exceptionList.component';
import { OpenHoursComponent } from './schedule/openHours.component';
import { StartingTimeComponent } from './schedule/startingTime.component';

angular
    .module('app.facility', ['app.facility.accessibility', 'app.facility.machines'])
    .service('InteroperabilityResource', downgradeInjectable(InteroperabilityResourceService))
    .service('Room', downgradeInjectable(RoomService))
    .service('SettingsResource', downgradeInjectable(SettingsResourceService))
    .directive('exception-dialog', downgradeComponent({ component: ExceptionDialogComponent }))
    .directive('exception-list', downgradeComponent({ component: ExceptionListComponent }))
    .directive('open-hours', downgradeComponent({ component: OpenHoursComponent }))
    .directive('starting-time', downgradeComponent({ component: StartingTimeComponent }))
    .directive('availability', downgradeComponent({ component: AvailabilityComponent }))
    .directive('exception-list-all', downgradeComponent({ component: ExceptionListAllComponent }))
    .directive('multi-room', downgradeComponent({ component: MultiRoomComponent }))
    .directive('room', downgradeComponent({ component: RoomComponent }))
    .directive('room-list', downgradeComponent({ component: RoomListComponent }))
    .directive('examRoomsAdminTabs', downgradeComponent({ component: ExamRoomsAdminTabsComponent })).name;
