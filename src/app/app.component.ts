import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { LinksService, Link } from './links.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private svc = inject(LinksService);

  url = signal('');
  submitting = signal(false);
  formError = signal('');
  newLink = signal<Link | null>(null);
  links = signal<Link[]>([]);
  loadError = signal('');

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.svc.getLinks().subscribe({
      next: (data) => this.links.set(data),
      error: (e: HttpErrorResponse) => this.loadError.set(e.message),
    });
  }

  private isHttpUrl(v: string): boolean {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  submit(form: NgForm): void {
    const raw = this.url().trim();
    if (!this.isHttpUrl(raw)) {
      this.formError.set('Please enter a valid http(s) URL.');
      return;
    }
    this.formError.set('');
    this.newLink.set(null);
    this.submitting.set(true);

    this.svc.createLink(raw).subscribe({
      next: (link) => {
        this.newLink.set(link);
        this.url.set('');
        form.resetForm();
        this.submitting.set(false);
        this.refresh();
      },
      error: (e: HttpErrorResponse) => {
        this.formError.set(e.error?.error ?? e.message);
        this.submitting.set(false);
      },
    });
  }
}
