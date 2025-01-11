import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeojsonService {

  private basePath = environment.GeoJSONpath;

  constructor(private http: HttpClient) { }

  getGeojson(fileName: string): Observable<any> {
    return this.http.get<any>(`${this.basePath}${fileName}`);
  }
}
