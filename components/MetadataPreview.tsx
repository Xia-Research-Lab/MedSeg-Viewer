import React, { useMemo } from 'react';
import { COCOImage, COCOAnnotation, COCOCategory } from '../types';
import { FileText, Image as ImageIcon, Ruler, Tag, Info } from 'lucide-react';

interface MetadataPreviewProps {
  image: COCOImage;
  annotations: COCOAnnotation[];
  categories: COCOCategory[];
}

export const MetadataPreview: React.FC<MetadataPreviewProps> = ({ image, annotations, categories }) => {
  
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    annotations.forEach(ann => {
      counts[ann.category_id] = (counts[ann.category_id] || 0) + 1;
    });
    return counts;
  }, [annotations]);

  return (
    <div className="max-w-2xl mx-auto w-full p-6">
       <div className="bg-slate-850 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          
          <div className="bg-slate-800 p-6 border-b border-slate-700 flex items-start gap-4">
             <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400">
                <FileText className="w-8 h-8" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white break-all">{image.file_name}</h2>
               <p className="text-slate-400 text-sm mt-1">Image Metadata Preview</p>
             </div>
          </div>

          <div className="p-6 space-y-6">
             
             {/* Tech Specs */}
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center text-slate-400 mb-2 text-sm uppercase tracking-wider font-semibold">
                    <Ruler className="w-4 h-4 mr-2" /> Dimensions
                  </div>
                  <div className="text-2xl font-mono text-slate-100">
                    {image.width} <span className="text-slate-500">x</span> {image.height}
                  </div>
               </div>
               
               <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center text-slate-400 mb-2 text-sm uppercase tracking-wider font-semibold">
                    <Info className="w-4 h-4 mr-2" /> Image ID
                  </div>
                  <div className="text-2xl font-mono text-blue-400">
                    #{image.id}
                  </div>
               </div>
             </div>

             {/* Annotation Stats */}
             <div>
                <div className="flex items-center text-slate-400 mb-4 text-sm uppercase tracking-wider font-semibold border-b border-slate-800 pb-2">
                  <Tag className="w-4 h-4 mr-2" /> Annotations ({annotations.length})
                </div>
                
                {annotations.length === 0 ? (
                  <div className="text-slate-500 italic p-4 text-center bg-slate-900/30 rounded">
                    No annotations found for this image in the JSON.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(categoryCounts).map(([catIdStr, count]) => {
                      const catId = parseInt(catIdStr);
                      const cat = categories.find(c => c.id === catId);
                      return (
                        <div key={catId} className="flex items-center justify-between p-3 bg-slate-800 rounded hover:bg-slate-750 transition-colors">
                           <div className="flex items-center">
                             <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: `hsl(${(catId * 137.508) % 360}, 70%, 50%)` }}></div>
                             <span className="font-medium text-slate-200">{cat?.name || `Category ${catId}`}</span>
                           </div>
                           <span className="px-2 py-1 bg-slate-900 text-slate-400 rounded text-xs font-mono">
                             {count} objects
                           </span>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>

             <div className="mt-4 p-4 bg-yellow-900/10 border border-yellow-900/30 rounded text-yellow-200/80 text-sm flex items-start">
               <ImageIcon className="w-5 h-5 mr-3 shrink-0" />
               <p>This is a metadata preview. To view the actual medical image and segmentation masks, please switch to the <strong>Uploads</strong> tab and drop the matching image file.</p>
             </div>

          </div>
       </div>
    </div>
  );
};
