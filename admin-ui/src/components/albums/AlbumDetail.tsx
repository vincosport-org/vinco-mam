import React from 'react';
import { useParams } from 'react-router-dom';

export default function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Album Detail</h1>
      <p>Album ID: {albumId}</p>
    </div>
  );
}
