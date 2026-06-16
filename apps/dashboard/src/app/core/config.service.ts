import { Service } from '@angular/core';

import { environment } from '../../environments/environment';

@Service()
export class ConfigService {
  apiPath(path: string): string {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return base ? `${base}${path}` : path;
  }
}
