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
import CircleStyle from 'ol/style/Circle';


@Component({
  selector: 'app-mapa-openlayers',
  standalone: true,
  templateUrl: './mapaOpenlayers.component.html',
  styleUrls: ['./mapaOpenlayers.component.css']
})
export class MapaOpenlayersComponent implements OnInit, AfterViewInit {
  private map!: Map;
  private overlay!: Overlay;
  private vectorLayerPdo!: VectorLayer;
  private vectorLayerCabeceras!: VectorLayer;
  private vectorLayerFFCC!: VectorLayer;
  private vectorLayerViasCirculacion!: VectorLayer;

  constructor(private dataFromGeoJsonService: GeojsonService) { }

  ngOnInit(): void {
    this.initMap();
    /** ========================== lectura del geojson de los límites del partido ============= */
    this.dataFromGeoJsonService.getGeojson('pdoEzeiza3857.geojson').subscribe(data => {
      console.log(data);
      //this.addPointsToMap(data);
      this.addGeojsonToMap(data);
    });
    /** ========================== lectura del geojson de las cabeceras de algunos partidos === */
    this.dataFromGeoJsonService.getGeojson('pdoEzeizaCabeceras.geojson').subscribe(data => {
      console.log(data);
      this.addPointsToMapFromGeoJson(data);
    });
    /** ========================== lectura del geojson de lFFCC================================ */
    this.dataFromGeoJsonService.getGeojson('pdoEzeizaFFCC3857.geojson').subscribe(data => {
      console.log(data);
      this.addLinesToMapFromGeoJson(data);
    });
    /** ========================== lectura del geojson de vias de circulación================== */
    this.dataFromGeoJsonService.getGeojson('pdoEzeizaViasCirculacion3857.geojson').subscribe(data => {
      console.log(data);
      this.addLinesToMapFromGeoJsonViasCirculacion(data);
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
      const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        return { feature, layer };
      });


      if (feature) {
        const coordinates = (feature.feature.getGeometry() as Point).getCoordinates();
        const lonLat = toLonLat(coordinates);
        const properties = (feature.feature as Feature).getProperties();
        const layer = feature.layer;

        let popupContent = '';

        if (layer === this.vectorLayerPdo) {
          // Mostrar propiedades específicas para la capa de límites del partido
          popupContent = `<div>Propiedad 1: ${properties['fna']}</div>`;

        } else if (layer === this.vectorLayerCabeceras) {
          // Mostrar propiedades específicas para la capa de puntos
          popupContent = `<div>Localidad: ${properties['nombre']}</div>`;
        }

        const popupElement = document.getElementById('popup-content');
        console.log(popupContent)
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
    /* if (feature) {
      const coordinates = (feature.getGeometry() as Point).getCoordinates();
      const properties = JSON.stringify(feature.getProperties()["nombre"]);
      //this.showPopup(coordinates, properties);
      const popupContent = `<div>Coord.: ${coordinates}, Localidad: ${properties}</div>`;
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
  });*/


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


  /** =================================================================
   * @param data 
   * En data viene el geojson que se va a agregar al mapa
   * @returns 
   ====================================================================*/
  private addGeojsonToMap(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }

    const features = new GeoJSON().readFeatures(data);

    /** ============================ transformación de coordenadas ========================== */
    /* const features = new GeoJSON().readFeatures(data, {
     dataProjection: 'EPSG:4326', // Proyección original de los datos (coordenadas geográficas)
     featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
   }); */

    /* const features = new GeoJSON().readFeatures(data, {
      dataProjection: 'EPSG:22185', // Proyección original de los datos
      featureProjection: 'EPSG:22185' // Mantener la proyección original para la transformación manual
    }).map(feature => {
      const geometry = feature.getGeometry();
      if (geometry) {
        if (geometry.getType() !== 'Point' && geometry.getType() !== 'LineString' && geometry.getType() !== 'Polygon' &&
            geometry.getType() !== 'MultiPoint' && geometry.getType() !== 'MultiLineString' && geometry.getType() !== 'MultiPolygon') {
          console.warn('Tipo de geometría no soportado:', geometry.getType());
          return null;
        }
        try {
          // Transformar de EPSG:22185 a EPSG:4326
          geometry.transform('EPSG:22185', 'EPSG:4326');
          // Transformar de EPSG:4326 a EPSG:3857
          geometry.transform('EPSG:4326', 'EPSG:3857');
        } catch (error) {
          console.error('Error al transformar la geometría:', error);
          return null;
        }
      } else {
        console.warn('Feature sin geometría:', feature);
        return null;
      }
      return feature;
    }).filter(feature => feature !== null); */

    /* // Verificar si hay geometrías de tipo MultiLineString
 const multiLineStringFeatures = features.filter(feature => {
   const geometry = feature.getGeometry();
   return geometry && geometry.getType() === 'MultiLineString';
 });

 if (multiLineStringFeatures.length === 0) {
   console.warn('No se encontraron geometrías de tipo MultiLineString');
 } else {
   //console.log('Geometrías de tipo MultiLineString encontradas:', multiLineStringFeatures);
 } */

    /* const features = new GeoJSON().readFeatures(data, {
      dataProjection: 'EPSG:22185', // Proyección original de los datos
      featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
    }).map(feature => {
      const geometry = feature.getGeometry();
      if (geometry) {
        // Transformar solo si la proyección de origen es diferente a EPSG:4326
        if (geometry.getType() !== 'Point' && geometry.getType() !== 'LineString' && geometry.getType() !== 'Polygon' &&
            geometry.getType() !== 'MultiPoint' && geometry.getType() !== 'MultiLineString' && geometry.getType() !== 'MultiPolygon') {
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
    }).filter(feature => feature !== null); */

    const vectorSource = new VectorSource({
      features: features
    });

    /**=======================================================
     * Crear una capa vectorial con las geometrías del GeoJSON
     * Definir aqui el estilo de la capa
     =========================================================*/
    this.vectorLayerPdo = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(6, 24, 104, 0.1)'
        }),
        stroke: new Stroke({
          color: '#319FD3',
          width: 2
        })
      })
    });

    this.map.addLayer(this.vectorLayerPdo);
  }


  /**
   * Agregar capa de puntos desde geoJson
   * @param data 
   * @returns 
   */
  private addPointsToMapFromGeoJson(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }

    const features = new GeoJSON().readFeatures(data, {
      dataProjection: 'EPSG:4326', // Proyección original de los datos (coordenadas geográficas)
      featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
    });

    const vectorSource = new VectorSource({
      features: features
    });

    /**=======================================================
    * Crear una capa vectorial con las geometrías del GeoJSON
    * Definir aqui el estilo de la capa
    =========================================================*/
    this.vectorLayerCabeceras = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: '#FF0000' // Color rojo para los puntos
          }),
          stroke: new Stroke({
            color: '#FFFFFF', // Borde blanco para los puntos
            width: 1
          })
        })
      })
    });

    this.map.addLayer(this.vectorLayerCabeceras);
  }
  
  private addLinesToMapFromGeoJson(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }
    const features = new GeoJSON().readFeatures(data);
    /* const features = new GeoJSON().readFeatures(data, {
      dataProjection: 'EPSG:4326', // Proyección original de los datos (coordenadas geográficas)
      featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
    }); */

    const vectorSource = new VectorSource({
      features: features
    });

    this.vectorLayerFFCC = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#0000FF', // Color azul para las líneas de ferrocarril
          width: 2,
          lineDash: [10, 10], // Línea discontinua
          lineDashOffset: 0
        })
      })
    });

    this.map.addLayer(this.vectorLayerFFCC);
  }

  private addLinesToMapFromGeoJsonViasCirculacion(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }
    const features = new GeoJSON().readFeatures(data);
    /* const features = new GeoJSON().readFeatures(data, {
      dataProjection: 'EPSG:4326', // Proyección original de los datos (coordenadas geográficas)
      featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
    }); */

    const vectorSource = new VectorSource({
      features: features
    });

    this.vectorLayerFFCC = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000', // Color rojo
          width: 0.5,
        })
      })
    });

    this.map.addLayer(this.vectorLayerFFCC);
  }

}

/* private addPointsToMapFromCSV(data: any[]): void {
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