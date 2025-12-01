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

import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import type { ExaminationQuestion } from 'src/app/examination/examination.model';
import { ExaminationService } from 'src/app/examination/examination.service';

@Component({
    selector: 'xm-examination-lti-question',
    template: `
        <div class="pb-3">xm-examination-lti-question</div>
        @if (ltiUrl) {
            <iframe
                class="lti-frame"
                [src]="ltiUrl"
                title="LTI tool"
                referrerpolicy="no-referrer-when-downgrade"
                allow="clipboard-write *; camera *; microphone *"
            ></iframe>
        } @else {
            <div>NO LTI Tool loaded</div>
        }
    `,
    standalone: true,
    imports: [FormsModule, TranslateModule],
    styleUrls: ['./question.shared.scss'],
})
export class ExaminationLtiComponent implements OnInit {
    @Input() sq!: ExaminationQuestion;
    @Input() isPreview = false;
    ltiUrl: SafeResourceUrl | null = null;
    resourceUrl: string | undefined;

    questionTitle!: string;

    constructor(
        private Examination: ExaminationService,
        private sanitizer: DomSanitizer,
    ) {}

    ngOnInit() {
        console.log('init ' + this.questionTitle);
        console.log('ltiId ' + this.sq.question.ltiId);
        const id = this.sq?.question?.ltiId ?? '';
        this.ltiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            `http://localhost:9000/integration/lti/start-login?resourceId=${encodeURIComponent(id)}`,
        );
        this.resourceUrl = 'http://localhost:9000/integration/lti/resource';
    }
}
