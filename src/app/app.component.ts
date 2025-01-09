import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';


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
  
  title = 'ezeiza';
  
  toggleLayerMenu(): void {
    const layerMenu = document.getElementById('layerMenu');
    if (layerMenu) {
      layerMenu.classList.toggle('show');
    }
  }

  toggleLayer(layerName: string): void {
    const event = new CustomEvent('toggleLayer', { detail: layerName });
    window.dispatchEvent(event);
  }

}
