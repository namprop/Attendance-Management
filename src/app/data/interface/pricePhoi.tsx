export type PaperPrice = {
  id: number;
  name: string;
  unit: string;
  supplier?: string;
  price3LayerC?: number;
  price3LayerB?: number;
  price3LayerE?: number;
  price5LayerBC?: number;
  price5LayerBE?: number;
  priceBCE?: number;
  note?: string;
  type?: number;
};
