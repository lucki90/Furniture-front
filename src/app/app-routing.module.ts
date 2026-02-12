import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AloneCabinetComponent} from './alone-cabinet/alone-cabinet.component';
import {SecretLockerComponent} from './secret-locker/secret-locker.component';
import {KitchenPageComponent} from "./kitchen/kitchen-page.component";

const routes: Routes = [
  {path: '', redirectTo: '/alone-cabinet', pathMatch: 'full'},
  {path: 'alone-cabinet', component: AloneCabinetComponent},
  {path: 'secret-locker', component: SecretLockerComponent},
  {path: 'kitchen', component: KitchenPageComponent},
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
