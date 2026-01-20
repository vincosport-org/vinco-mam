import React from 'react';
import { useParams } from 'react-router-dom';

export default function AthleteDetail() {
  const { athleteId } = useParams<{ athleteId: string }>();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Athlete Detail</h1>
      <p>Athlete ID: {athleteId}</p>
    </div>
  );
}
