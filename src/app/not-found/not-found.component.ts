import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthService} from '../core/auth/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {
  private readonly authService = inject(AuthService);

  readonly primaryAction = computed(() => this.authService.isLoggedIn()
    ? {label: 'Przejdź do projektów', link: '/kitchen/projects'}
    : {label: 'Przejdź do logowania', link: '/login'}
  );
}
