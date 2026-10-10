import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Report } from '../types';

interface PollutionMapProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
  selectedReportId?: string | null;
}

export const PollutionMap: React.FC<PollutionMapProps> = ({
  reports,
  onSelectReport,
  selectedReportId
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).fitWorld();
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    reports.forEach((report) => {
      // Color coded pins
      let markerColor = '#f59e0b'; // MEDIUM (amber)
      if (report.status === 'CLEANED_AND_VERIFIED') {
        markerColor = '#10b981'; // Green
      } else if (report.severity === 'CRITICAL') {
        markerColor = '#ef4444'; // Red
      } else if (report.severity === 'HIGH') {
        markerColor = '#f97316'; // Orange
      } else if (report.severity === 'LOW') {
        markerColor = '#3b82f6'; // Blue
      }

      const isSelected = selectedReportId === report.id;
      const markerHtml = `
        <div style="
          background-color: ${markerColor};
          width: ${isSelected ? '28px' : '22px'};
          height: ${isSelected ? '28px' : '22px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 11px;
        ">
          ${report.status === 'CLEANED_AND_VERIFIED' ? '✓' : '!'}
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-pollution-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 max-w-[220px] text-xs';
      popupContent.innerHTML = `
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #111827;">${report.address}</div>
        <div style="display: flex; gap: 4px; margin-bottom: 6px;">
          <span style="background: ${markerColor}; color: white; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${report.severity}</span>
          <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-weight: 500;">${report.status}</span>
        </div>
        <p style="margin: 0 0 6px 0; color: #4b5563; font-size: 11px;">${report.description.substring(0, 85)}...</p>
        <button id="view-rep-btn-${report.id}" style="
          width: 100%;
          background: #059669;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 600;
        ">View Details & Evidence</button>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-rep-btn-${report.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectReport) onSelectReport(report);
          };
        }
      });

      markersLayerRef.current?.addLayer(marker);
    });

    // Auto fit bounds if reports exist
    if (reports.length > 0) {
      const group = L.featureGroup(markersLayerRef.current.getLayers() as L.Layer[]);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.15));
    }
  }, [reports, selectedReportId, onSelectReport]);

  return (
    <div className="w-full h-full min-h-[420px] rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
