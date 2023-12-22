import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { AccessibilitySelectorComponent } from './accessibility-picker.component';
import { AccessibilityComponent } from './accessibility.component';
import { AccessibilityService } from './accessibility.service';

@NgModule({
    imports: [
        NgbModule,
        TranslateModule,
        CommonModule,
        FormsModule,
        AccessibilityComponent,
        AccessibilitySelectorComponent,
    ],
    exports: [AccessibilityComponent, AccessibilitySelectorComponent],
    providers: [AccessibilityService],
})
export class AccessibilityModule {}
