import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File as FileIcon } from 'lucide-react';
import { TreeNode } from '../utils';
import { COCOImage } from '../types';

interface FileTreeProps {
  node: TreeNode;
  level?: number;
  onSelect?: (image: COCOImage) => void;
  selectedImageId?: number | null;
}

export const FileTree: React.FC<FileTreeProps> = ({ node, level = 0, onSelect, selectedImageId }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Open root and first level by default
  const hasChildren = node.children && Object.keys(node.children).length > 0;

  if (node.type === 'file') {
    const isSelected = selectedImageId !== undefined && node.data?.id === selectedImageId;
    
    return (
      <div 
        className={`flex items-center py-1.5 px-2 rounded cursor-pointer text-sm group transition-colors ${
          isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        title={`ID: ${node.data?.id} | Path: ${node.data?.file_name}`}
        onClick={() => node.data && onSelect?.(node.data)}
      >
        <FileIcon className={`w-4 h-4 mr-2 shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-500 group-hover:text-blue-400'}`} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  // Folder Node
  return (
    <div>
      <div 
        className="flex items-center py-1 px-2 hover:bg-slate-800 rounded cursor-pointer text-slate-200 select-none text-sm transition-colors"
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-4 h-4 mr-1 flex items-center justify-center shrink-0">
          {hasChildren && (
             isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          )}
        </div>
        {isOpen ? (
          <FolderOpen className="w-4 h-4 mr-2 text-yellow-500/80 shrink-0" />
        ) : (
          <Folder className="w-4 h-4 mr-2 text-yellow-500/60 shrink-0" />
        )}
        <span className="font-medium truncate">{node.name === 'root' ? 'All Images' : node.name}</span>
        {hasChildren && (
          <span className="ml-2 text-xs text-slate-500 bg-slate-800 px-1.5 rounded-full border border-slate-700">
             {Object.keys(node.children!).length}
          </span>
        )}
      </div>

      {isOpen && node.children && (
        <div className="border-l border-slate-800 ml-[11px]">
          {(Object.entries(node.children) as [string, TreeNode][])
            .sort((a, b) => {
                // Sort folders first, then files
                if (a[1].type !== b[1].type) return a[1].type === 'folder' ? -1 : 1;
                return a[0].localeCompare(b[0]);
            })
            .map(([key, child]) => (
            <FileTree 
              key={child.path} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect}
              selectedImageId={selectedImageId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
