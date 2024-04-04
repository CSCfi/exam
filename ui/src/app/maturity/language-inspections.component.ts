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

import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { addDays } from 'date-fns';
import { PageContentComponent } from '../shared/components/page-content.component';
import { PageHeaderComponent } from '../shared/components/page-header.component';
import { LanguageService } from '../shared/language/language.service';
import type { QueryParams } from './language-inspections.service';
import { LanguageInspectionService } from './language-inspections.service';
import { ReviewedInspectionsComponent } from './listing/reviewed-inspections.component';
import { UnfinishedInspectionsComponent } from './listing/unfinished-inspections.component';
import type { LanguageInspection } from './maturity.model';

export interface LanguageInspectionData extends LanguageInspection {
    ownerAggregate: string;
    studentName: string;
    studentNameAggregate: string;
    inspectorName: string;
    inspectorNameAggregate: string;
    answerLanguage?: string;
}

@Component({
    selector: 'xm-language-inspections',
    template: `
        <xm-page-header text="i18n_language_inspections" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            <div class="tab-wrapper-exams">
                <!-- Under review language inspection -->
                @if (ongoingInspections) {
                    <xm-unfinished-inspections [inspections]="ongoingInspections" />
                }

                <!-- Reviewed language inspection -->
                @if (processedInspections) {
                    <xm-reviewed-inspections
                        [inspections]="processedInspections"
                        (endDateChanged)="endDateChanged($event)"
                        (startDateChanged)="startDateChanged($event)"
                    >
                    </xm-reviewed-inspections>
                }
            </div>
        </ng-template>
    `,
    standalone: true,
    imports: [
        UnfinishedInspectionsComponent,
        ReviewedInspectionsComponent,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
})
export class LanguageInspectionsComponent implements OnInit {
    ongoingInspections: LanguageInspectionData[] = [];
    processedInspections: LanguageInspectionData[] = [];
    private startDate: Date | null = null;
    private endDate: Date | null = null;

    constructor(
        private Language: LanguageService,
        private LanguageInspection: LanguageInspectionService,
    ) {}

    ngOnInit() {
        this.query();
    }

    startDateChanged = (event: { date: Date | null }) => {
        this.startDate = event.date;
        this.query();
    };

    endDateChanged = (event: { date: Date | null }) => {
        this.endDate = event.date;
        this.query();
    };

    private query = () => {
        const params: QueryParams = {};
        const tzOffset = new Date().getTimezoneOffset() * 60000;
        if (this.startDate) {
            params.start = this.startDate.getTime() + tzOffset;
        }
        if (this.endDate) {
            params.end = addDays(this.endDate, 1).getTime();
        }
        const refreshAll = Object.keys(params).length === 0;
        this.LanguageInspection.query(params).subscribe((resp: LanguageInspection[]) => {
            const inspections: LanguageInspectionData[] = resp.map((i) =>
                Object.assign(i, {
                    ownerAggregate: i.exam.parent
                        ? i.exam.parent.examOwners.map((o) => `${o.firstName} ${o.lastName}`).join(', ')
                        : '',
                    studentName: i.exam.creator ? `${i.exam.creator.firstName} ${i.exam.creator.lastName}` : '',
                    studentNameAggregate: i.exam.creator
                        ? `${i.exam.creator.lastName} ${i.exam.creator.firstName}`
                        : '',
                    inspectorName: i.modifier ? `${i.modifier.firstName} ${i.modifier.lastName}` : '',
                    inspectorNameAggregate: i.modifier ? `${i.modifier.lastName} ${i.modifier.firstName}` : '',
                    answerLanguage: i.exam.answerLanguage
                        ? this.Language.getLanguageNativeName(i.exam.answerLanguage, i.exam)
                        : undefined,
                }),
            );
            if (refreshAll) {
                this.ongoingInspections = inspections.filter((i) => !i.finishedAt);
            }
            this.processedInspections = inspections.filter((i) => i.finishedAt);
        });
    };
}
