import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { MaterialAdminService } from './material-admin.service';

const ADMIN_URL = `${environment.apiUrl}/admin/materials`;
const OPTIONS_URL = `${environment.apiUrl}/materials/options`;

describe('MaterialAdminService', () => {
  let service: MaterialAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MaterialAdminService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MaterialAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads material options from the authenticated non-admin API', () => {
    service.getMaterialOptions().subscribe();

    const req = http.expectOne(`${OPTIONS_URL}/materials`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('loads component options from the authenticated non-admin API', () => {
    service.getComponentOptions().subscribe();

    const req = http.expectOne(`${OPTIONS_URL}/components`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('loads job options from the authenticated non-admin API', () => {
    service.getJobOptions().subscribe();

    const req = http.expectOne(`${OPTIONS_URL}/jobs`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('loads board color options from the authenticated non-admin API', () => {
    service.getBoardColorOptions('CHIPBOARD').subscribe();

    const req = http.expectOne(request =>
      request.url === `${OPTIONS_URL}/board-colors`
      && request.params.get('materialCode') === 'CHIPBOARD');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('keeps admin operations under the admin API', () => {
    service.getAllMaterials().subscribe();

    const req = http.expectOne(`${ADMIN_URL}/materials`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
