import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { UploadModal } from './components/UploadModal';
import { LoadingState } from './components/LoadingState';
import { DataStatusBanner } from './components/DataStatusBanner';
import { MetricCards } from './components/MetricCards';
import { TicketTable } from './components/TicketTable';
import { SLACountdownRadar } from './components/SLACountdownRadar';
import { AnalystCapacity } from './components/AnalystCapacity';
import { EscalationQueue } from './components/EscalationQueue';
import { QueueComparison } from './components/QueueComparison';
import { BreachTrend } from './components/BreachTrend';
import { OptimizationImpact } from './components/OptimizationImpact';
import { TicketDetailModal } from './components/TicketDetailModal';
import { api } from './services/api';

export default function App() {
  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadInfo, setUploadInfo] = useState(null); // { filename, count }

  // Dashboard data state
  const [hasData, setHasData] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [beforeQueue, setBeforeQueue] = useState([]);
  const [afterQueue, setAfterQueue] = useState([]);

  // Ticket detail modal
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Fetch all dashboard data from Django
  const fetchAllData = useCallback(async () => {
    try {
      const [metricsData, beforeData, afterData] = await Promise.all([
        api.getDashboardMetrics(),
        api.getBeforeQueue(),
        api.getAfterQueue()
      ]);

      setDashboardData(metricsData);
      setHasData(metricsData.has_data || metricsData.active_tickets_count > 0);
      setBeforeQueue(beforeData || []);
      setAfterQueue(afterData || []);

      // Use the after queue data as the main ticket list (it has all optimization results)
      const ticketList = (afterData && afterData.length > 0) ? afterData : beforeData;
      setTickets(ticketList || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  // Handle upload complete
  const handleUploadComplete = useCallback(async (info) => {
    setUploadInfo(info || uploadInfo);
    await fetchAllData();
  }, [fetchAllData, uploadInfo]);

  // Re-optimize queue
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    try {
      const res = await api.optimizeQueue();
      if (res.success) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div>
      <Header
        onOpenUpload={() => setShowUpload(true)}
        onRunOptimization={handleRunOptimization}
        isOptimizing={isOptimizing}
        hasData={hasData}
      />

      <div className="soc-container">
        {isOptimizing ? (
          <LoadingState />
        ) : !hasData ? (
          <EmptyState onOpenUpload={() => setShowUpload(true)} />
        ) : (
          <>
            {/* Data Status Banner */}
            <DataStatusBanner
              filename={uploadInfo?.filename}
              ticketCount={dashboardData?.active_tickets_count}
              lastRunTimestamp={dashboardData?.kpi_metrics?.last_run_timestamp}
            />

            {/* Top Metrics */}
            <MetricCards
              metrics={dashboardData?.kpi_metrics}
              activeCount={dashboardData?.active_tickets_count}
              riskBreakdown={dashboardData?.risk_tier_breakdown}
            />

            {/* Active Tickets Table */}
            <TicketTable
              tickets={tickets}
              onTicketClick={(t) => setSelectedTicket(t)}
            />

            {/* SLA Countdown + Breach Probability */}
            <div className="grid-2">
              <SLACountdownRadar
                tickets={dashboardData?.countdown_tickets || []}
                onSelectTicket={(ticket) => setSelectedTicket(ticket)}
              />
              <AnalystCapacity analysts={dashboardData?.analyst_fleet?.analysts} />
            </div>

            {/* Escalation Queue + AI Decision Impact */}
            <div className="grid-2">
              <EscalationQueue tickets={dashboardData?.escalation_queue} />
              <OptimizationImpact metrics={dashboardData?.kpi_metrics} />
            </div>

            {/* Before vs After Queue */}
            <QueueComparison
              beforeQueue={beforeQueue}
              afterQueue={afterQueue}
            />

            {/* Breach Trend */}
            <BreachTrend trends={dashboardData?.breach_trends} />
          </>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadComplete={(info) => {
          setUploadInfo(info);
          handleUploadComplete(info);
          setShowUpload(false);
        }}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}
