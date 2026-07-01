// convert data phôi theo số lớp

import { PaperPrice } from "../data/interface/pricePhoi";


type PaperPriceByWave = {
  id: number;
  productId: number;
  type: string; // "3 lớp C" | "3 lớp B" | "3 lớp E" | "5 lớp BC" | "5 lớp BE" | "7 lớp BCE"
  price: number;
};

export function convertProductsToPrices(
  products: PaperPrice[]
): PaperPriceByWave[] {
  const result: PaperPriceByWave[] = [];
  let idCounter = 1;

  products.forEach((product) => {
    if (product.type === 3) {
      if (product.price3LayerC && product.price3LayerC > 0) {
        result.push({
          id: idCounter++,
          productId: product.id,
          type: "3 lớp C",
          price: product.price3LayerC,
        });
      }
      if (product.price3LayerB && product.price3LayerB > 0) {
        result.push({
          id: idCounter++,
          productId: product.id,
          type: "3 lớp B",
          price: product.price3LayerB,
        });
      }
      if (product.price3LayerE && product.price3LayerE > 0) {
        result.push({
          id: idCounter++,
          productId: product.id,
          type: "3 lớp E",
          price: product.price3LayerE,
        });
      }
    }

    if (product.type === 5) {
      if (product.price5LayerBC && product.price5LayerBC > 0) {
        result.push({
          id: idCounter++,
          productId: product.id,
          type: "5 lớp BC",
          price: product.price5LayerBC,
        });
      }
      if (product.price5LayerBE && product.price5LayerBE > 0) {
        result.push({
          id: idCounter++,
          productId: product.id,
          type: "5 lớp BE",
          price: product.price5LayerBE,
        });
      }
    }

    if (product.type === 7) {
      if (product.priceBCE && product.priceBCE > 0) {
        result.push({
          id: idCounter++,
          productId: product.id,
          type: "7 lớp BCE",
          price: product.priceBCE,
        });
      }
    }
  });

  return result;
}
