import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Link {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  private readonly api = 'http://localhost:3000/api/links';

  constructor(private http: HttpClient) {}

  getLinks(): Observable<Link[]> {
    return this.http.get<Link[]>(this.api);
  }

  createLink(url: string): Observable<Link> {
    return this.http.post<Link>(this.api, { url });
  }
}
