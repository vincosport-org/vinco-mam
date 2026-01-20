import React from 'react';
import { useParams } from 'react-router-dom';

export default function ImageEditor() {
  const { imageId } = useParams<{ imageId: string }>();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Image Editor</h1>
      <p>Editing image: {imageId}</p>
    </div>
  );
}
