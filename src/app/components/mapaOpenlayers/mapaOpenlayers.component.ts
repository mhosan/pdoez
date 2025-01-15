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
import { TileWMS, XYZ } from 'ol/source';


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
  private wmsLayerMz!: TileLayer;
  private wmsLayerPl!: TileLayer;
  private osmLayer!: TileLayer;
  private satelliteLayer!: TileLayer;

  constructor(private dataFromGeoJsonService: GeojsonService) { }

  ngOnInit(): void {
    this.initMap();
    /** ========================== lectura del geojson de los límites del partido ============= */
    this.dataFromGeoJsonService.getGeojson('pdoEzeiza3857.geojson').subscribe(data => {
      console.log(data);
      //this.addPointsToMap(data);
      this.addGeojsonToMapPdo(data);
    });
    /** ========================== lectura del geojson de las cabeceras de algunos partidos === */
    this.dataFromGeoJsonService.getGeojson('pdoEzeizaCabeceras.geojson').subscribe(data => {
      console.log(data);
      this.addPointsToMapFromGeoJsonCabeceras(data);
    });
    /** ========================== lectura del geojson de lFFCC================================ */
    this.dataFromGeoJsonService.getGeojson('pdoEzeizaFFCC3857.geojson').subscribe(data => {
      console.log(data);
      this.addLinesToMapFromGeoJsonFFCC(data);
    });
    /** ========================== lectura del geojson de vias de circulación================== */
    this.dataFromGeoJsonService.getGeojson('pdoEzeizaViasCirculacion3857.geojson').subscribe(data => {
      console.log(data);
      this.addLinesToMapFromGeoJsonViasCirculacion(data);
    });
    /** ========================== agregar servicio WMS ======================================= */
    this.addWmsLayerMz();
    /** ========================== agregar servicio WMS ======================================= */
    this.addWmsLayerPl();
    // Escuchar el evento personalizado para alternar la visibilidad de las capas
    window.addEventListener('toggleLayer', (event: any) => {
      this.toggleLayer(event.detail);
    });
    // Escuchar el evento personalizado para alternar las capas base 
    window.addEventListener('toggleLayerBase', (event: any) => {
      this.changeBaseLayer(event.detail);
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

    // Agregar evento pointermove para cambiar el cursor por una manito
    this.map.on('pointermove', (event) => {
      const hit = this.map.hasFeatureAtPixel(event.pixel);
      this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  }

  private initMap(): void {
    this.osmLayer = new TileLayer({
      source: new OSM(),
      visible: true
    });

    this.satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'http://www.google.cn/maps/vt?lyrs=s&x={x}&y={y}&z={z}'
      }),
      visible: false
    });

    this.map = new Map({
      target: 'map',
      layers: [
        this.osmLayer,
        this.satelliteLayer
      ],
      view: new View({
        center: fromLonLat([-58.525879837178536, -34.85481804911688]), // Coordenadas de Buenos Aires, Muni Eze: -34.85481804911688, -58.525879837178536
        zoom: 11
      })
    });
  }

  changeBaseLayer(layerName: string): void {
    switch (layerName) {
      case 'osm':
        this.osmLayer.setVisible(true);
        this.satelliteLayer.setVisible(false);
        break;
      case 'satellite':
        this.osmLayer.setVisible(false);
        this.satelliteLayer.setVisible(true);
        break;
    }
  }


  /**=================================================================
   * 
   * GeoJson con el partido de Ez.
   *  
   ==================================================================*/
  private addGeojsonToMapPdo(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }
    const features = new GeoJSON().readFeatures(data);
    const vectorSource = new VectorSource({
      features: features
    });
    this.vectorLayerPdo = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(6, 24, 104, 0.1)'
        }),
        stroke: new Stroke({
          color: 'rgba(240, 177, 83, 0.99)',
          width: 5,
          lineDash: [10, 10], // Línea discontinua
          lineDashOffset: 0
        })
      })
    });
    this.map.addLayer(this.vectorLayerPdo);
  }


  /** =================================================================
   * 
   * GeoJson con los puntos de las cabeceras de partido 
   * 
   ===================================================================*/
  private addPointsToMapFromGeoJsonCabeceras(data: any): void {
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

  /** =================================================================
   *  
   * GeoJson con las líneas de FFCC 
   *  
   ===================================================================*/
  private addLinesToMapFromGeoJsonFFCC(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }
    const features = new GeoJSON().readFeatures(data);
    const vectorSource = new VectorSource({
      features: features
    });
    this.vectorLayerFFCC = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: '#0000FF', // Color azul para las líneas de ferrocarril
          width: 2,
          lineDash: [10, 10, 1, 10], // Línea discontinua
          
        })
      })
    });
    this.map.addLayer(this.vectorLayerFFCC);
  }

  /** =================================================================
   * 
   * GeoJson con las líneas de vias de circulación 
   *  
   ===================================================================*/
  private addLinesToMapFromGeoJsonViasCirculacion(data: any): void {
    if (!this.map) {
      console.error("El mapa no se ha inicializado todavía!");
      return;
    }
    const features = new GeoJSON().readFeatures(data);

    const vectorSource = new VectorSource({
      features: features
    });

    this.vectorLayerViasCirculacion = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: 'rgb(105, 105, 105)', // Color gris oscuro
          width: 0.5,
        })
      })
    });
    this.map.addLayer(this.vectorLayerViasCirculacion);
  }

  /** =================================================================
   * 
   * Layer wms de manzanas de ARBA
   * 
   ===================================================================*/
  private addWmsLayerMz(): void {
    this.wmsLayerMz = new TileLayer({
      source: new TileWMS({
        url: 'http://geo.arba.gov.ar/geoserver/idera/wms', // Reemplaza con la URL de tu servidor WMS
        params: {
          'LAYERS': 'Manzana', // Reemplaza con el nombre de la capa WMS
          'TILED': true
        },
        serverType: 'geoserver', // Reemplaza con el tipo de servidor WMS (por ejemplo, 'geoserver')
        transition: 0
      }),
      visible: false
    });
    this.map.addLayer(this.wmsLayerMz);
  }


  /** =================================================================
   * 
   * Layer wms de parcelas de ARBA
   * 
   ===================================================================*/
  private addWmsLayerPl(): void {
    this.wmsLayerPl = new TileLayer({
      source: new TileWMS({
        url: 'http://geo.arba.gov.ar/geoserver/idera/wms', // Reemplaza con la URL de tu servidor WMS
        params: {
          'LAYERS': 'Parcela', // Reemplaza con el nombre de la capa WMS
          'TILED': true
        },
        serverType: 'geoserver', // Reemplaza con el tipo de servidor WMS (por ejemplo, 'geoserver')
        transition: 0
      }),
      visible: false
    });
    this.map.addLayer(this.wmsLayerPl);
  }

  /** =================================================================
   * 
   * Switch para alternar la visibilidad de las capas 
   * 
   ===================================================================*/
  toggleLayer(layerName: string): void {
    switch (layerName) {
      case 'pdo':
        this.vectorLayerPdo.setVisible(!this.vectorLayerPdo.getVisible());
        break;
      case 'cabeceras':
        this.vectorLayerCabeceras.setVisible(!this.vectorLayerCabeceras.getVisible());
        break;
      case 'ffcc':
        this.vectorLayerFFCC.setVisible(!this.vectorLayerFFCC.getVisible());
        break;
      case 'viasCirculacion':
        this.vectorLayerViasCirculacion.setVisible(!this.vectorLayerViasCirculacion.getVisible());
        break;
      case 'wmsMz':
        this.wmsLayerMz.setVisible(!this.wmsLayerMz.getVisible());
        break;
      case 'wmsPl':
        this.wmsLayerPl.setVisible(!this.wmsLayerPl.getVisible());
        break;
    }
  }
}
