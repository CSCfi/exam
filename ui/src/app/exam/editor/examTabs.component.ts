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
import { ChangeDetectorRef, Component, Input, ViewChild } from '@angular/core';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { StateService, UIRouterGlobals } from '@uirouter/angular';
import * as _ from 'lodash';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SessionService } from '../../session/session.service';
import { Exam } from '../exam.model';
import { ExamTabService } from './examTabs.service';

import type { OnInit } from '@angular/core';
import type { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import type { User } from '../../session/session.service';
@Component({
    selector: 'exam-tabs',
    templateUrl: './examTabs.component.html',
})
export class ExamTabsComponent implements OnInit {
    @Input() exam: Exam;
    @Input() collaborative: boolean;

    user: User;
    examInfo: { title: string | null };
    activeTab = 1;
    private ngUnsubscribe = new Subject();

    @ViewChild('nav', { static: false }) nav: NgbNav;

    constructor(
        private cdr: ChangeDetectorRef,
        private state: StateService,
        private routing: UIRouterGlobals,
        private translate: TranslateService,
        private Session: SessionService,
        private Tabs: ExamTabService,
    ) {
        this.examInfo = { title: null };
        this.Tabs.tabChange$.pipe(takeUntil(this.ngUnsubscribe)).subscribe((tab: number) => {
            this.activeTab = tab;
            this.cdr.detectChanges();
        });
    }

    ngOnInit() {
        this.user = this.Session.getUser();
        this.updateTitle(!this.exam.course ? null : this.exam.course.code, this.exam.name);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    updateTitle = (code: string | null, name: string | null) => {
        if (code && name) {
            this.examInfo.title = `${code.split('_')[0]} ${name}`;
        } else if (code) {
            this.examInfo.title = `${code.split('_')[0]} ${this.translate.instant('sitnet_no_name')}`;
        } else {
            this.examInfo.title = name;
        }
    };

    isOwner = () =>
        this.exam?.examOwners.some(
            (x) => x.id === this.user.id || x.email.toLowerCase() === this.user.email.toLowerCase(),
        );

    navChanged = (event: NgbNavChangeEvent, forceRegularExam = false) => {
        const params = forceRegularExam ? { collaborative: 'false', id: this.exam.id } : undefined;
        if (event.nextId === 1) {
            this.state.go('examEditor.basic', params);
        } else if (event.nextId === 2) {
            this.state.go('examEditor.sections', params);
        } else if (event.nextId === 3) {
            this.state.go('examEditor.publication', params);
        } else if (event.nextId === 4) {
            this.state.go('examEditor.assessments', params);
        } else {
            // TODO
            const params = { id: this.exam.id, tab: event.nextId };
            this.state.go('examEditor', params, { reload: false });
        }
    };

    examUpdated = (props: { code: string; name: string; scaleChange: boolean }) => {
        this.updateTitle(props.code, props.name);
        if (props.scaleChange) {
            // Propagate a change so that children (namely auto eval component) can act based on scale change
            this.exam = _.cloneDeep(this.exam);
        }
    };
}
