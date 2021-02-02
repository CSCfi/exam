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

import { HttpClient } from '@angular/common/http';
import { Component, OnInit, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { Accessibility, ExamRoom } from '../../reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    template: require('./accessibilitySelector.component.html'),
    selector: 'accessibility-selector',
})
export class AccessibilitySelectorComponent implements OnInit {
    @Input() room: ExamRoom;
    accessibilities: Accessibility[];

    constructor(private translate: TranslateService, private accessibilityService: AccessibilityService) {}

    ngOnInit() {
        this.accessibilityService.getAccessibilities().subscribe(resp => {
            this.accessibilities = resp;
        });
    }

    selectedAccessibilities = () => {
        return this.room.accessibilities.length === 0
            ? this.translate.instant('sitnet_select')
            : this.room.accessibilities
                  .map(ac => {
                      return ac.name;
                  })
                  .join(', ');
    };

    isSelected = (ac: Accessibility) => {
        return this.getIndexOf(ac) > -1;
    };

    updateAccessibility = (ac: Accessibility) => {
        const index = this.getIndexOf(ac);
        if (index > -1) {
            this.room.accessibilities.splice(index, 1);
        } else {
            this.room.accessibilities.push(ac);
        }
        const ids = this.room.accessibilities.map(item => item.id).join(', ');

        this.accessibilityService.updateRoomAccessibilities(this.room.id, { ids: ids }).subscribe(() => {
            toast.info(this.translate.instant('sitnet_room_updated'));
        });
    };

    getIndexOf = (ac: Accessibility) => this.room.accessibilities.map(a => a.id).indexOf(ac.id);
}
