import React, { useEffect, useRef, useState, useMemo } from 'react';
import { COCOAnnotation, COCOCategory, COCORLE } from '../types';
import { decodeRleToCanvas, calculateCentroid, getColorForId } from '../utils';

interface ViewerProps {
  imageFile: File;
  annotations: COCOAnnotation[];
  categories: COCOCategory[];
}

export const Viewer: React.FC<ViewerProps> = ({ imageFile, annotations, categories }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  
  const getCategoryName = (id: number) => {
    return categories.find(c => c.id === id)?.name || `Class ${id}`;
  };

  // Prepare legend data
  const legendItems = useMemo(() => {
    const uniqueItems = new Map<number, { name: string, color: string }>();
    annotations.forEach(ann => {
      if (!uniqueItems.has(ann.category_id)) {
        const color = getColorForId(ann.id);
        const colorHex = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        uniqueItems.set(ann.category_id, {
          name: getCategoryName(ann.category_id),
          color: colorHex
        });
      }
    });
    return Array.from(uniqueItems.entries());
  }, [annotations, categories]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageFile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setLoading(true);
    console.log(`[Viewer] Starting render. Annotations to draw: ${annotations.length}`);

    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);
    img.src = objectUrl;
    
    img.onload = async () => {
      // 1. Set Canvas Dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // 2. Draw Base Image
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, 0, 0);

      requestAnimationFrame(() => {
        let maskCount = 0;
        let bboxCount = 0;

        // Pass 1: Draw Masks & Bounding Boxes
        annotations.forEach((ann) => {
          const color = getColorForId(ann.id); // [r, g, b]

          // A. Draw Bounding Box (Enhanced Visibility)
          if (ann.bbox && ann.bbox.length === 4) {
             const [x, y, w, h] = ann.bbox;
             ctx.save();
             
             // 1. Semi-transparent fill
             ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.25)`;
             ctx.fillRect(x, y, w, h);
             
             // 2. Solid thick border
             ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1.0)`;
             ctx.lineWidth = 3;
             ctx.setLineDash([]); // Ensure solid line
             ctx.strokeRect(x, y, w, h);
             
             ctx.restore();
             bboxCount++;
          }

          // B. Draw RLE Mask (Supports both Array and String via utils)
          if (typeof ann.segmentation === 'object' && 'counts' in ann.segmentation) {
            const rle = ann.segmentation as COCORLE;
            const maskCanvas = decodeRleToCanvas(rle, color);
             if (maskCanvas) {
               ctx.drawImage(maskCanvas, 0, 0, img.width, img.height);
               maskCount++;
             } else {
               // Silent fail or minimal log, bbox will cover it
             }
          }
        });
        
        console.log(`[Viewer] Rendered: ${maskCount} Masks, ${bboxCount} BBoxes.`);

        // Pass 2: Draw Labels
        ctx.globalAlpha = 1.0;
        ctx.font = 'bold 14px sans-serif'; // Slightly smaller for better fit
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        annotations.forEach((ann) => {
           let labelX = 0;
           let labelY = 0;
           let hasPosition = false;

           // Position Label (Prefer above BBox)
           if (ann.bbox && ann.bbox.length === 4) {
              const [x, y, w, h] = ann.bbox;
              labelX = x + w / 2;
              // Position above the bounding box
              // Box height is approx 22px (14px text + 2*4px pad)
              labelY = y - 15;
              
              // If too close to top edge, place below
              if (labelY < 15) {
                  labelY = y + h + 15;
              }
              
              hasPosition = true;
           } 
           // Fallback to Centroid if no bbox
           else if (typeof ann.segmentation === 'object' && 'counts' in ann.segmentation) {
             const rle = ann.segmentation as COCORLE;
             const centroid = calculateCentroid(rle);
             if (centroid) {
               labelX = centroid.x;
               labelY = centroid.y;
               hasPosition = true;
             }
           }

           if (hasPosition) {
             const text = getCategoryName(ann.category_id);
             const textMetrics = ctx.measureText(text);
             const pad = 4;
             const textH = 14;
             
             ctx.save();
             
             const boxW = textMetrics.width + pad * 2;
             const boxH = textH + pad * 2;
             const boxX = labelX - boxW / 2;
             const boxY = labelY - boxH / 2;

             // Shadow
             ctx.shadowColor = 'rgba(0,0,0,0.8)';
             ctx.shadowBlur = 4;
             
             // Label Background
             ctx.fillStyle = `rgba(0, 0, 0, 0.6)`;
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
             ctx.lineWidth = 1;
             
             ctx.beginPath();
             if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxW, boxH, 4);
             } else {
                ctx.rect(boxX, boxY, boxW, boxH);
             }
             ctx.fill();
             ctx.stroke();

             // Text
             ctx.shadowColor = 'transparent';
             ctx.fillStyle = '#ffffff';
             ctx.fillText(text, labelX, labelY);
             ctx.restore();
           }
        });

        setLoading(false);
      });
    };

    img.onerror = () => {
      console.error("Failed to load image for canvas");
      setLoading(false);
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile, annotations, categories]);

  return (
    <div className="relative flex-1 min-h-[500px] flex flex-col">
       {/* Container for Canvas */}
       <div 
        ref={containerRef}
        className="flex-1 bg-black/90 overflow-auto relative flex items-center justify-center border border-slate-700 rounded-lg shadow-inner"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-20 text-white backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <span className="font-medium text-slate-300">Rendering Segmentation...</span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
          className="shadow-2xl"
        />

        {/* Legend Overlay */}
        <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 shadow-xl backdrop-blur-md max-w-xs z-10">
           <div className="flex items-center justify-between mb-2 border-b border-slate-700 pb-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Objects Found ({annotations.length})
              </h3>
           </div>
           
           {legendItems.length === 0 ? (
             <p className="text-xs text-slate-500 italic">No masks rendered.</p>
           ) : (
             <ul className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
               {annotations.map(ann => {
                  const name = getCategoryName(ann.category_id);
                  const color = getColorForId(ann.id);
                  const colorStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
                  return (
                    <li key={ann.id} className="flex items-center text-xs text-slate-200">
                      <span className="w-3 h-3 rounded-full mr-2 shrink-0 border border-white/20" style={{ backgroundColor: colorStyle }}></span>
                      <span className="truncate">ID:{ann.id} - {name}</span>
                    </li>
                  )
               })}
             </ul>
           )}
           <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-700 pt-1">
              * Box: Bounding Box (Filled)<br/>
              * Shape: RLE Mask
           </div>
        </div>
      </div>
    </div>
  );
};