import { LayerStatus } from '@/lib/types/device';

export class Channel {
  private layers: Map<number, LayerStatus> = new Map();

  constructor(
    public readonly id: number,
    public readonly number: number,
    public readonly resolution: string,
    public readonly frameRate: number
  ) {}

  addLayer(layer: LayerStatus) {
    this.layers.set(layer.number, layer);
  }

  getLayer(layerNumber: number): LayerStatus | undefined {
    const layer = this.layers.get(layerNumber);
    return layer ? { ...layer } : undefined;
  }

  updateLayerStatus(layerNumber: number, status: Partial<LayerStatus>) {
    const layer = this.layers.get(layerNumber);
    if (layer) {
      Object.assign(layer, status);
    }
    return layer;
  }

  getLayers(): LayerStatus[] {
    return Array.from(this.layers.values());
  }
}
