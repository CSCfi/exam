// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Component, inject, input, output, signal } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import type { Organisation } from 'src/app/calendar/calendar.model';
import { CalendarService } from 'src/app/calendar/calendar.service';

@Component({
    selector: 'xm-calendar-organisation-picker',
    template: `
        <section
            class="xm-stack xm-gap-2"
            [class.xm-study-item-container]="selectedOrganisation()"
            [class.xm-study-item-container--inactive]="!selectedOrganisation()"
        >
            <header class="xm-split">
                <h2 class="calendar-phase-title">
                    {{ sequenceNumber() }}. {{ 'i18n_choose_institution' | translate }}
                </h2>
                @if (selectedOrganisation()) {
                    <img class="arrow_icon" src="/assets/images/icon-phase.png" alt="" />
                }
            </header>
            <div class="xm-cluster">
                <div ngbDropdown>
                    <button
                        [disabled]="disabled()"
                        ngbDropdownToggle
                        class="btn btn-outline-secondary"
                        type="button"
                        id="dropDownMenu21"
                        aria-haspopup="true"
                        aria-expanded="true"
                    >
                        {{ 'i18n_faculty_name' | translate }}&nbsp;
                    </button>
                    <ul ngbDropdownMenu role="menu" aria-labelledby="dropDownMenu21">
                        @for (org of organisations(); track org.code) {
                            <li
                                ngbDropdownItem
                                [hidden]="org.filtered"
                                role="presentation"
                                (click)="setOrganisation(org)"
                            >
                                <a role="menuitem">{{ org.code }}&nbsp;({{ org.name }})</a>
                            </li>
                        }
                    </ul>
                </div>
                <button class="btn btn-outline-secondary" (click)="makeInternalReservation()">
                    {{ 'i18n_internal_reservation' | translate }}&nbsp;
                </button>
            </div>
            @if (selectedOrganisation()) {
                <div>{{ selectedOrganisation()?.name }}&nbsp;({{ selectedOrganisation()?.code }})</div>
            }
        </section>
    `,
    styleUrls: ['../calendar.component.scss'],
    imports: [NgbDropdownModule, TranslateModule],
})
export class OrganisationPickerComponent {
    readonly sequenceNumber = input(0);
    readonly disabled = input(false);
    readonly selected = output<Organisation>();
    readonly cancelled = output<void>();

    readonly organisations = signal<Organisation[]>([]);
    readonly selectedOrganisation = signal<Organisation | undefined>(undefined);

    private readonly Calendar = inject(CalendarService);

    constructor() {
        this.Calendar.listOrganisations$().subscribe((resp) =>
            this.organisations.set(resp.filter((org) => !org.homeOrg && org.facilities.length > 0)),
        );
    }

    setOrganisation(organisation: Organisation) {
        const i = this.organisations().findIndex((o) => o._id === organisation._id);
        const orgs = this.organisations().map((o) => ({ ...o, filtered: false }));
        orgs.splice(i, 1, { ...orgs[i], filtered: true });
        this.organisations.set(orgs);
        this.selectedOrganisation.set({ ...organisation, filtered: true });
        this.selected.emit(organisation);
    }

    makeInternalReservation() {
        this.cancelled.emit();
    }
}
