import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeojsonService {

  private basePath = 'assets/data/';

  constructor(private http: HttpClient) { }

  getGeojson(fileName: string): Observable<any> {
    return this.http.get<any>(`${this.basePath}${fileName}`);
  }
}
