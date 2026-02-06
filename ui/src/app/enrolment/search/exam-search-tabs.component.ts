// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbNav, NgbNavItem, NgbNavLink } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { CollaborativeExamSearchComponent } from './collaborative-exam-search.component';
import { ExamSearchComponent } from './exam-search.component';

interface ExamTab {
    id: number;
    key: string;
    labelKey: string;
}

const EXAM_TABS: ExamTab[] = [
    { id: 1, key: 'regular', labelKey: 'i18n_exams' },
    { id: 2, key: 'collaborative', labelKey: 'i18n_collaborative_exams' },
];

@Component({
    selector: 'xm-exam-search-tabs',
    template: `
        <xm-page-header text="i18n_exams" />
        <xm-page-content [content]="content" />
        <ng-template #content>
            @if (collaborationSupported) {
                <div class="row">
                    <div class="col-12">
                        <ul ngbNav #nav="ngbNav" [(activeId)]="activeTab" class="nav-tabs" [keyboard]="false">
                            @for (tab of availableTabs; track tab.id) {
                                <li [ngbNavItem]="tab.id">
                                    <a ngbNavLink>{{ tab.labelKey | translate }}</a>
                                </li>
                            }
                        </ul>
                    </div>
                </div>
                @if (activeTab === 1) {
                    <xm-exam-search></xm-exam-search>
                }
                @if (activeTab === 2) {
                    <xm-collaborative-exam-search></xm-collaborative-exam-search>
                }
            } @else {
                <xm-exam-search></xm-exam-search>
            }
        </ng-template>
    `,
    styleUrls: ['./exam-search-tabs.component.scss'],
    imports: [
        NgbNav,
        NgbNavItem,
        NgbNavLink,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
        ExamSearchComponent,
        CollaborativeExamSearchComponent,
    ],
})
export class ExamSearchTabsComponent implements OnInit {
    availableTabs: ExamTab[] = EXAM_TABS;
    activeTab = 1;
    collaborationSupported = false;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private http = inject(HttpClient);

    ngOnInit() {
        this.loadCollaborationConfiguration();
    }

    private setupTabFromUrl() {
        const tabParam = this.route.snapshot.queryParamMap.get('tab');

        if (tabParam === 'collaborative' && this.collaborationSupported) {
            this.activeTab = 2;
        } else {
            this.activeTab = 1;

            // If requested tab is not available, update URL to reflect actual tab
            if (tabParam === 'collaborative' && !this.collaborationSupported) {
                this.router.navigate([], { queryParams: {}, queryParamsHandling: 'merge' });
            }
        }
    }

    private loadCollaborationConfiguration() {
        this.http
            .get<{ isExamCollaborationSupported: boolean }>('/app/settings/iop/examCollaboration')
            .subscribe((config) => {
                this.collaborationSupported = config.isExamCollaborationSupported;
                this.updateAvailableTabs();
                this.setupTabFromUrl();
            });
    }

    private updateAvailableTabs() {
        this.availableTabs = this.collaborationSupported ? EXAM_TABS : [EXAM_TABS[0]];
    }
}
