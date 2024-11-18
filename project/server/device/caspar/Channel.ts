import { LayerInfo } from './types';

export class Channel {
  private layers: Map<number, LayerInfo> = new Map();

  constructor(
    public readonly id: number,
    public readonly number: number,
    public readonly resolution: string,
    public readonly frameRate: number
  ) {}

  addLayer(layer: LayerInfo) {
    this.layers.set(layer.number, layer);
  }

  getLayer(layerNumber: number): LayerInfo | undefined {
    return this.layers.get(layerNumber);
  }

  getLayers(): Map<number, LayerInfo> {
    return new Map(this.layers);
  }

  updateLayerStatus(layerNumber: number, status: Partial<LayerInfo>) {
    const layer = this.layers.get(layerNumber);
    if (layer) {
      Object.assign(layer, status);
    }
    return layer;
  }

  clearLayers() {
    this.layers.clear();
  }
}
