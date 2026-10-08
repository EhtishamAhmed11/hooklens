import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandPalette } from './components/CommandPalette';
import { TestWebhookModal } from './components/TestWebhookModal';
import { NewEndpointModal } from './components/NewEndpointModal';

import { LoginView } from './views/LoginView';
import { OverviewView } from './views/OverviewView';
import { EndpointsView } from './views/EndpointsView';
import { EventsView } from './views/EventsView';
import { EventDetailView } from './views/EventDetailView';

import { getToken, setToken, api } from './services/api';

export default function App() {
  const [user, setUser] = useState('admin');
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [currentView, setCurrentView] = useState('overview');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventsFilterStatus, setEventsFilterStatus] = useState('ALL');

  // Modals
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [isTestWebhookOpen, setIsTestWebhookOpen] = useState(false);
  const [isNewEndpointOpen, setIsNewEndpointOpen] = useState(false);

  // Endpoints list for modals
  const [endpointsList, setEndpointsList] = useState([]);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const loadEndpoints = async () => {
    try {
      const eps = await api.getEndpoints();
      setEndpointsList(eps);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadEndpoints();
    }
  }, [isAuthenticated]);

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsTriageOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = (username) => {
    setUser(username || 'admin');
    setIsAuthenticated(true);
    setCurrentView('overview');
    showToast(`✓ Logged in as ${username || 'admin'}`);
  };

  const handleLogout = () => {
    setToken(null);
    setIsAuthenticated(false);
    showToast("Logged out");
  };

  const handleInspectEvent = (eventId) => {
    setSelectedEventId(eventId);
    setCurrentView('event-detail');
  };

  const handleInspectEndpointEvents = (endpointId) => {
    setCurrentView('events');
    setEventsFilterStatus('ALL');
  };

  const handleTriageFilterFailed = () => {
    setEventsFilterStatus('FAILED');
    setCurrentView('events');
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-200">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView === 'event-detail' ? 'events' : currentView}
        setView={(v) => {
          setEventsFilterStatus('ALL');
          setCurrentView(v);
        }}
        onLogout={handleLogout}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0a0f19]">
        {/* Top Header */}
        <TopNav onOpenTriage={() => setIsTriageOpen(true)} />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'overview' && (
            <OverviewView
              onOpenTestWebhook={() => setIsTestWebhookOpen(true)}
              onInspectEvent={handleInspectEvent}
            />
          )}

          {currentView === 'endpoints' && (
            <EndpointsView
              onOpenNewEndpoint={() => setIsNewEndpointOpen(true)}
              onInspectEndpointEvents={handleInspectEndpointEvents}
              showToast={showToast}
            />
          )}

          {currentView === 'events' && (
            <EventsView
              initialStatus={eventsFilterStatus}
              onInspectEvent={handleInspectEvent}
              showToast={showToast}
            />
          )}

          {currentView === 'event-detail' && (
            <EventDetailView
              eventId={selectedEventId}
              onBack={() => setCurrentView('events')}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Triage / Command Palette Modal */}
      <CommandPalette
        isOpen={isTriageOpen}
        onClose={() => setIsTriageOpen(false)}
        onNavigate={(v) => {
          setEventsFilterStatus('ALL');
          setCurrentView(v);
        }}
        onTriggerTestWebhook={() => setIsTestWebhookOpen(true)}
        onFilterFailed={handleTriageFilterFailed}
      />

      {/* Test Webhook Modal */}
      <TestWebhookModal
        isOpen={isTestWebhookOpen}
        onClose={() => setIsTestWebhookOpen(false)}
        endpoints={endpointsList}
        showToast={showToast}
        onEventSent={() => {
          loadEndpoints();
        }}
      />

      {/* New Endpoint Modal */}
      <NewEndpointModal
        isOpen={isNewEndpointOpen}
        onClose={() => setIsNewEndpointOpen(false)}
        showToast={showToast}
        onCreated={() => {
          loadEndpoints();
        }}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#151d2f] border border-indigo-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-200">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="text-xs font-medium font-mono">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
