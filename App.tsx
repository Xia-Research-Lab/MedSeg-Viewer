import React, { useState, useMemo, useRef, useEffect } from 'react';
import { COCOJson, COCOImage } from './types';
import { getBasename, buildFileTree } from './utils';
import { Dropzone } from './components/Dropzone';
import { Viewer } from './components/Viewer';
import { FileTree } from './components/FileTree';
import { MetadataPreview } from './components/MetadataPreview';
import { AlertCircle, FileText, Image as ImageIcon, CheckCircle, Database, Layers, FolderTree, Search, GripVertical } from 'lucide-react';

type Tab = 'upload' | 'structure';

function App() {
  const [cocoData, setCocoData] = useState<COCOJson | null>(null);
  
  // Viewer State
  const [currentImageFile, setCurrentImageFile] = useState<File | null>(null);
  const [matchedImageId, setMatchedImageId] = useState<number | null>(null);
  
  // Tree & Preview State
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [treeSearch, setTreeSearch] = useState('');
  const [selectedTreeImage, setSelectedTreeImage] = useState<COCOImage | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Parse JSON file
  const handleJsonUpload = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.images || !json.annotations || !json.categories) {
          throw new Error("Invalid COCO JSON format. Missing images, annotations, or categories.");
        }
        setCocoData(json as COCOJson);
        setCurrentImageFile(null);
        setMatchedImageId(null);
        setSelectedTreeImage(null);
      } catch (err: any) {
        setError("Failed to parse JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Handle Image Upload
  const handleImageUpload = (file: File) => {
    setError(null);
    if (!cocoData) {
      setError("Please upload annotations (JSON) first.");
      return;
    }

    const uploadedBasename = file.name.trim();
    const uploadedNameNoExt = uploadedBasename.substring(0, uploadedBasename.lastIndexOf('.')) || uploadedBasename;

    const matchedImage = cocoData.images.find(img => {
      const jsonBasename = getBasename(img.file_name);
      const jsonNameNoExt = jsonBasename.substring(0, jsonBasename.lastIndexOf('.')) || jsonBasename;
      return jsonNameNoExt.toLowerCase() === uploadedNameNoExt.toLowerCase();
    });

    if (matchedImage) {
      setCurrentImageFile(file);
      setMatchedImageId(matchedImage.id);
      setActiveTab('upload'); // Switch to viewer on successful upload
    } else {
      setCurrentImageFile(null);
      setMatchedImageId(null);
      const examples = cocoData.images.slice(0, 3).map(i => getBasename(i.file_name)).join(', ');
      setError(`Image "${uploadedBasename}" not found. Expected: "${examples}"...`);
    }
  };

  const currentAnnotations = useMemo(() => {
    if (!cocoData) return [];
    // If in upload mode, use matchedImageId. If in structure mode, use selectedTreeImage
    const targetId = activeTab === 'upload' ? matchedImageId : selectedTreeImage?.id;
    if (targetId === null || targetId === undefined) return [];
    
    // CRITICAL FIX: Use loose equality (==) because JSON IDs might be strings while parsed IDs are numbers
    return cocoData.annotations.filter(ann => ann.image_id == targetId);
  }, [cocoData, matchedImageId, selectedTreeImage, activeTab]);

  const fileTree = useMemo(() => {
    if (!cocoData) return null;
    let images = cocoData.images;
    if (treeSearch) {
      const lowerSearch = treeSearch.toLowerCase();
      images = images.filter(img => 
        img.file_name.toLowerCase().includes(lowerSearch) || 
        img.id.toString().includes(lowerSearch)
      );
    }
    return buildFileTree(images);
  }, [cocoData, treeSearch]);

  // Resizing Handlers
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        // Clamp width between 250 and 600
        const newWidth = Math.min(Math.max(e.clientX, 250), 600);
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isResizing]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <header className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-850 shrink-0 shadow-sm z-10 select-none">
        <Database className="w-6 h-6 text-blue-500 mr-3" />
        <h1 className="text-xl font-bold tracking-tight">MedSeg <span className="text-slate-400 font-normal">Viewer</span></h1>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Resizable Sidebar */}
        <aside 
          ref={sidebarRef}
          style={{ width: sidebarWidth }}
          className="bg-slate-850 border-r border-slate-800 flex flex-col overflow-hidden shrink-0 z-10 shadow-lg relative"
        >
          <div className="flex border-b border-slate-800 shrink-0">
            <button 
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${activeTab === 'upload' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Layers className="w-4 h-4 mr-2" />
              Uploads
            </button>
            <button 
              onClick={() => setActiveTab('structure')}
              disabled={!cocoData}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center transition-colors ${activeTab === 'structure' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'} ${!cocoData && 'opacity-50 cursor-not-allowed'}`}
            >
              <FolderTree className="w-4 h-4 mr-2" />
              JSON Tree
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 scrollbar-thin scrollbar-thumb-slate-700">
            {activeTab === 'upload' && (
              <>
                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">1. Load Annotations</h2>
                  <Dropzone 
                    onFileAccepted={handleJsonUpload} 
                    accept="json" 
                    label={cocoData ? "Replace JSON" : "Upload COCO JSON"} 
                  />
                  {cocoData && (
                    <div className="mt-3 flex items-center text-green-400 text-sm bg-green-900/20 p-2 rounded border border-green-900">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span>Loaded {cocoData.images.length} images</span>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">2. Load Image</h2>
                  <Dropzone 
                    onFileAccepted={handleImageUpload} 
                    accept="image" 
                    label="Upload Slice Image" 
                    disabled={!cocoData}
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-sm mb-6 flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                    <span className="break-all">{error}</span>
                  </div>
                )}

                {matchedImageId !== null && currentImageFile && cocoData && (
                  <div className="space-y-4 border-t border-slate-700 pt-6">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Image</h2>
                    <div className="bg-slate-800 rounded p-3 text-sm">
                        <div className="flex items-center text-slate-300 mb-2">
                          <FileText className="w-4 h-4 mr-2 text-slate-500" />
                          <span className="truncate" title={currentImageFile.name}>{currentImageFile.name}</span>
                        </div>
                        <div className="flex items-center text-slate-300">
                          <ImageIcon className="w-4 h-4 mr-2 text-slate-500" />
                          <span>ID: {matchedImageId}</span>
                        </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'structure' && fileTree && (
              <div className="h-full flex flex-col">
                <div className="relative mb-4 shrink-0">
                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                   <input 
                      type="text" 
                      placeholder="Search..." 
                      className="w-full bg-slate-800 border border-slate-700 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={treeSearch}
                      onChange={(e) => setTreeSearch(e.target.value)}
                   />
                </div>
                <div className="flex-1 overflow-x-auto">
                   <FileTree 
                      node={fileTree} 
                      onSelect={(img) => setSelectedTreeImage(img)}
                      selectedImageId={selectedTreeImage?.id}
                   />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className={`w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-20 flex flex-col justify-center items-center ${isResizing ? 'bg-blue-500' : 'bg-slate-800'}`}
        >
          <div className="h-8 bg-slate-600 w-1 rounded-full opacity-0 hover:opacity-100 transition-opacity"></div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-slate-900 p-8 flex flex-col min-w-0 overflow-auto">
          
          {/* View 1: Initial Empty State */}
          {!cocoData && (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                <Database className="w-16 h-16 mb-4 opacity-20" />
                <p>Start by uploading a COCO JSON file in the sidebar.</p>
             </div>
          )}

          {/* View 2: Uploads Tab -> Viewer */}
          {cocoData && activeTab === 'upload' && (
             !currentImageFile ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p>Upload an image to visualize segmentation.</p>
               </div>
             ) : (
               <Viewer 
                 imageFile={currentImageFile}
                 annotations={currentAnnotations}
                 categories={cocoData.categories}
               />
             )
          )}

          {/* View 3: Structure Tab -> Metadata Preview */}
          {cocoData && activeTab === 'structure' && (
             !selectedTreeImage ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                 <FolderTree className="w-16 h-16 mb-4 opacity-20" />
                 <p>Select a file from the tree to view its metadata.</p>
               </div>
             ) : (
               <MetadataPreview 
                 image={selectedTreeImage}
                 annotations={currentAnnotations}
                 categories={cocoData.categories}
               />
             )
          )}

        </div>
      </main>
    </div>
  );
}

export default App;