import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MachineService } from './machines.service';
import { MachineListComponent } from './machineList.component';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MachineComponent } from './machine.component';
import { UtilityModule } from '../../utility/utility.module';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';

@NgModule({
    entryComponents: [MachineListComponent, MachineComponent],
    imports: [CommonModule, TranslateModule, NgbModule, UtilityModule, UIRouterUpgradeModule],
    providers: [MachineService],
    declarations: [MachineListComponent, MachineComponent],
    exports: [MachineListComponent],
})
export class MachineModule {}
