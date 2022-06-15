/*
 * Copyright (c) 2018 Exam Consortium
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
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UIRouterModule } from '@uirouter/angular';
import { SharedModule } from '../shared/shared.module';
import { InspectionStatementDialogComponent } from './dialogs/inspection-statement-dialog.component';
import { LanguageInspectionsComponent } from './language-inspections.component';
import { LanguageInspectionService } from './language-inspections.service';
import { ReviewedInspectionsComponent } from './listing/reviewed-inspections.component';
import { UnfinishedInspectionsComponent } from './listing/unfinished-inspections.component';
import { MaturityReportingComponent } from './reporting/maturity-reporting.component';

@NgModule({
    imports: [NgbModule, RouterModule, UIRouterModule, SharedModule],
    exports: [ReviewedInspectionsComponent],
    declarations: [
        LanguageInspectionsComponent,
        MaturityReportingComponent,
        ReviewedInspectionsComponent,
        UnfinishedInspectionsComponent,
        InspectionStatementDialogComponent,
    ],
    bootstrap: [InspectionStatementDialogComponent],
    providers: [LanguageInspectionService],
})
export class MaturityModule {}
