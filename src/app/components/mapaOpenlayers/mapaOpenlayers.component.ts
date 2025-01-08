import { Component, OnInit, AfterViewInit } from '@angular/core';
import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { DataFromCSVService } from '../../services/data-from-csv.service';
import { GeojsonService } from '../../services/geojson.service';

import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';
import GeoJSON from 'ol/format/GeoJSON';


@Component({
  selector: 'app-mapa-openlayers',
  standalone: true,
  templateUrl: './mapaOpenlayers.component.html',
  styleUrls: ['./mapaOpenlayers.component.css']
})
export class MapaOpenlayersComponent implements OnInit, AfterViewInit {
  private map!: Map; 
  private overlay!: Overlay; 

  constructor(private dataFromGeoJsonService: GeojsonService) { }

  ngOnInit(): void {
    this.initMap();
    this.dataFromGeoJsonService.getGeojson('pdoEzeiza.geojson').subscribe(data => {
      //this.addPointsToMap(data);
      this.addGeojsonToMap(data);
      console.log(data);
    });
  }

  ngAfterViewInit(): void {
    this.overlay = new Overlay({
      element: document.getElementById('popup')!,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });

    this.map.addOverlay(this.overlay);

    this.map.on('click', (event) => {
      const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
        //console.log(feature);
        return feature;
      });

      if (feature) {
        const coordinates = (feature.getGeometry() as Point).getCoordinates();
        //console.log(`Coordenadas: ${coordinates}`);
        const lonLat = toLonLat(coordinates);
        //console.log(`Latitud: ${lonLat[1]}, Longitud: ${lonLat[0]}`);
        const popupContent = `<div>Latitud: ${lonLat[1]}, Longitud: ${lonLat[0]}</div>`;
        const popupElement = document.getElementById('popup-content');
        if (popupElement) {
          popupElement.innerHTML = popupContent;
        } else {
          console.error("No se encontró el elemento popup-content");
        }
        this.overlay.setPosition(coordinates);
      } else {
        this.overlay.setPosition(undefined);
      }
    });

    // Agregar evento pointermove para cambiar el cursor
    this.map.on('pointermove', (event) => {
      const hit = this.map.hasFeatureAtPixel(event.pixel);
      this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  }

  private initMap(): void {
    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([-60.7000, -36.6167]), // Coordenadas de Buenos Aires
        zoom: 5
      })
    });
  }
  private addGeojsonToMap(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }

    const features = new GeoJSON().readFeatures(data, {
      dataProjection: 'EPSG:22185', // Proyección original de los datos
      featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
    }).map(feature => {
      const geometry = feature.getGeometry();
      if (geometry) {
        // Transformar solo si la proyección de origen es diferente a EPSG:4326
        if (geometry.getType() !== 'Point' && geometry.getType() !== 'LineString' && geometry.getType() !== 'Polygon') {
          console.warn('Tipo de geometría no soportado:', geometry.getType());
          return null;
        }
        try {
          geometry.transform('EPSG:22185', 'EPSG:4326');
        } catch (error) {
          console.error('Error al transformar la geometría:', error);
          return null;
        }
      } else {
        console.warn('Feature sin geometría:', feature);
        return null;
      }
      return feature;
    }).filter(feature => feature !== null);

    const vectorSource = new VectorSource({
      features: features
    });


    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.6)'
        }),
        stroke: new Stroke({
          color: '#319FD3',
          width: 1
        })
      })
    });

    this.map.addLayer(vectorLayer);

  /* private addPointsToMap(data: any[]): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return; 
    }
    const vectorSource = new VectorSource();
    data.forEach(point => {
      const lat = parseFloat(point.latitud);
      const lng = parseFloat(point.longitud);
      if (!isNaN(lat) && !isNaN(lng)) {
        const feature = new Feature({
          geometry: new Point(fromLonLat([lng, lat]))
        });
        vectorSource.addFeature(feature);
      }
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: 'red' }),
          stroke: new Stroke({ color: 'white', width: 1 })
        })
      })
    });

    this.map.addLayer(vectorLayer); */
  }
}