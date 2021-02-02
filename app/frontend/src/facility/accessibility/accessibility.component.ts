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

import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';
import { Accessibility } from '../../reservation/reservation.model';
import { AccessibilityService } from './accessibility.service';

@Component({
    template: require('./accessibility.component.html'),
    selector: 'accessibility',
})
export class AccessibilityComponent implements OnInit {
    newItem: { name: string };
    accessibilities: Accessibility[];
    showName = false;

    constructor(private translate: TranslateService, private accessibilityService: AccessibilityService) {}

    ngOnInit() {
        this.newItem = { name: '' };
        this.accessibilityService.getAccessibilities().subscribe(resp => {
            this.accessibilities = resp;
        });
    }

    initItem = () => {
        this.newItem = { name: '' };
    };

    add = () =>
        this.accessibilityService.addAccessibility(this.newItem).subscribe(resp => {
            this.accessibilities.push(resp);
            toast.info(this.translate.instant('sitnet_accessibility_added'));
            this.initItem();
        });

    update = (accessibility: Accessibility) =>
        this.accessibilityService.updateAccessibility(accessibility).subscribe(() => {
            toast.info(this.translate.instant('sitnet_accessibility_updated'));
        });

    remove = (accessibility: Accessibility) =>
        this.accessibilityService.removeAccessibility(accessibility.id).subscribe(() => {
            this.accessibilities.splice(this.accessibilities.indexOf(accessibility), 1);
            toast.info(this.translate.instant('sitnet_accessibility_removed'));
        });
}
