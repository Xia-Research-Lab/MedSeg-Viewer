export interface COCOImage {
  id: number;
  width: number;
  height: number;
  file_name: string;
  license?: number;
  flickr_url?: string;
  coco_url?: string;
  date_captured?: string;
}

export interface COCOCategory {
  id: number;
  name: string;
  supercategory: string;
}

export interface COCORLE {
  counts: number[] | string;
  size: [number, number]; // [height, width]
}

export interface COCOAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  segmentation: COCORLE | number[][]; // Can be RLE or Polygon (we focus on RLE per requirements)
  area: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  iscrowd: number;
}

export interface COCOJson {
  info?: any;
  licenses?: any[];
  images: COCOImage[];
  annotations: COCOAnnotation[];
  categories: COCOCategory[];
}