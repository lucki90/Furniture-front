import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AloneCabinetComponent} from './alone-cabinet/alone-cabinet.component';
import {KitchenPageComponent} from "./kitchen/kitchen-page.component";
import {KitchenProjectsListComponent} from "./kitchen/projects-list/kitchen-projects-list.component";
import {SettingsComponent} from "./settings/settings.component";
import {LoginComponent} from "./login/login.component";
import {RegisterComponent} from "./register/register.component";
import {authGuard, adminGuard} from "./core/auth/auth.guard";

const routes: Routes = [
  {path: '', redirectTo: '/login', pathMatch: 'full'},
  {path: 'login', component: LoginComponent},
  {path: 'register', component: RegisterComponent},
  {path: 'alone-cabinet', component: AloneCabinetComponent},
  {path: 'kitchen', component: KitchenPageComponent, canActivate: [authGuard]},
  {path: 'kitchen/projects', component: KitchenProjectsListComponent, canActivate: [authGuard]},
  {path: 'settings', component: SettingsComponent, canActivate: [authGuard]},
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [authGuard, adminGuard]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
