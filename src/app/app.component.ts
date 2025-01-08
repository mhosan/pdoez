import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataFromCSVService } from './services/data-from-csv.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  npuntos: number = 0;
  constructor(private dataFromCSVService: DataFromCSVService) { }
  
  ngOnInit(): void {
    this.dataFromCSVService.getCSVData().subscribe(data => {
      this.npuntos = data.length;
    });
  }

  title = 'ezeiza';
}
