import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  HardHat, 
  Factory, 
  Cloud, 
  History, 
  Settings, 
  Loader2, 
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Plus,
  FileText,
  X,
  ArrowRight
} from 'lucide-react';
import { CameraCapture } from './components/CameraCapture';
import { SyncStatus } from './components/SyncStatus';
import { processNameplate, processRoofImage, ISCData, EFSData } from './services/geminiService';
import { saveSurvey, getPendingSurveys, getAllSurveys, markAsSynced, SurveyRecord } from './services/dbService';
import { pushToMonday } from './services/mondayService';

type View = 'home' | 'isc' | 'efs' | 'history' | 'review';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<SurveyRecord> | null>(null);
  const [history, setHistory] = useState<SurveyRecord[]>([]);
  const [boardId, setBoardId] = useState(localStorage.getItem('monday_board_id') || '');
  const [serverConfig, setServerConfig] = useState({ hasApiKey: false, hasDefaultBoard: false });
  const [verifiedBoardName, setVerifiedBoardName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEditingBoardId, setIsEditingBoardId] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');

  useEffect(() => {
    if (boardId) {
      setSpreadsheetId(localStorage.getItem(`google_sheet_${boardId}`) || '');
    }
  }, [boardId]);

  const checkGoogleStatus = async () => {
    try {
      const res = await fetch('/api/google/status');
      const data = await res.json();
      setGoogleConnected(data.connected);
    } catch (err) {
      console.error("Google status check failed", err);
    }
  };

  const handleGoogleConnect = () => {
    alert("Google connection is managed via Service Account in the server settings.");
  };

  const setupGoogleSheet = async (name: string) => {
    if (!googleConnected || spreadsheetId) return spreadsheetId;
    const res = await fetch('/api/google/setup-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardName: name })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to setup Google Sheet");
    }
    if (data.spreadsheetId) {
      setSpreadsheetId(data.spreadsheetId);
      localStorage.setItem(`google_sheet_${boardId}`, data.spreadsheetId);
      return data.spreadsheetId;
    }
    throw new Error("No spreadsheet ID returned from server");
  };

  const handleExportToSheets = async () => {
    if (!googleConnected) {
      handleGoogleConnect();
      return;
    }

    if (!verifiedBoardName) {
      alert("Please verify a Monday board ID first.");
      return;
    }

    setIsExporting(true);
    try {
      let sid = spreadsheetId;
      if (!sid) {
        // Use boardId as the name as requested
        sid = await setupGoogleSheet(boardId);
      }

      if (!sid) throw new Error("Could not initialize Google Sheet");

      const res = await fetch('/api/google/sync-monday-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: sid, boardId })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Export Complete! ${data.count} records synced to Google Sheets.`);
        window.open(`https://docs.google.com/spreadsheets/d/${sid}`, '_blank');
      } else {
        throw new Error(data.error || "Export failed");
      }
    } catch (err: any) {
      console.error("Export failed", err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setGoogleConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    checkGoogleStatus();
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    localStorage.setItem('monday_board_id', boardId.trim());
    if (boardId.trim() && serverConfig.hasApiKey) {
      const timer = setTimeout(verifyBoard, 1000);
      return () => clearTimeout(timer);
    } else {
      setVerifiedBoardName(null);
    }
  }, [boardId, serverConfig.hasApiKey]);

  const verifyBoard = async () => {
    const id = boardId.trim();
    if (!id) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/monday/verify-board/${id}`);
      if (res.ok) {
        const data = await res.json();
        setVerifiedBoardName(data.name);
        // If Google is connected, setup the sheet
        if (googleConnected) {
          setupGoogleSheet(data.name);
        }
      } else {
        setVerifiedBoardName(null);
      }
    } catch (err) {
      setVerifiedBoardName(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const checkConfig = async () => {
    try {
      const res = await fetch('/api/monday/config');
      const data = await res.json();
      setServerConfig(data);
    } catch (err) {
      console.error("Config check failed", err);
    }
  };

  useEffect(() => {
    checkConfig();
    
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    refreshStatus();
    loadHistory();

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const refreshStatus = async () => {
    const pending = await getPendingSurveys();
    setPendingCount(pending.length);
  };

  const loadHistory = async () => {
    const all = await getAllSurveys();
    setHistory(all.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleCapture = (type: 'ISC' | 'EFS' | 'GENERAL', base64: string) => {
    setSessionImages(prev => [...prev, base64]);
  };

  const handleAnalyze = async (type: 'ISC' | 'EFS' | 'GENERAL') => {
    if (sessionImages.length === 0) return;
    
    setIsProcessing(true);
    try {
      // Bolt ⚡: Parallelized image analysis to reduce wait time from O(N) to O(max(latency))
      const createdRecords = await Promise.all(sessionImages.map(async (img) => {
        let rawData: any = {};
        try {
          if (type === 'ISC') {
            rawData = await processNameplate([img]);
          } else if (type === 'EFS') {
            rawData = await processRoofImage([img]);
          }

          let data: any = {};
          if (rawData.values && rawData.values.length > 0) {
            const row = rawData.values[0];
            if (type === 'ISC') {
              data = {
                siteName: row[0],
                category: row[1],
                subcategory: row[2],
                manufacturer: row[3],
                modelNumber: row[4],
                serialNumber: row[5],
                year: row[6],
                voltage: row[7],
                phase: row[8],
                amperage: row[9],
                capacity: row[10],
                fanRLA: row[11],
                compressorRLA: row[12],
                fla: row[13],
                lra: row[14],
                indoorFan: row[15],
                outdoorFan: row[16],
                manualLink: row[17],
                observations: row[18]
              };
            } else if (type === 'EFS') {
              data = {
                siteName: row[0],
                category: row[1],
                subcategory: row[2],
                material: row[3],
                defects: typeof row[4] === 'string' ? row[4].split(',').map((s: string) => s.trim()) : row[4],
                features: typeof row[5] === 'string' ? row[5].split(',').map((s: string) => s.trim()) : row[5],
                classification: row[6]
              };
            }
          }

          const record: SurveyRecord = {
            id: crypto.randomUUID(),
            type,
            data,
            images: sessionImages, // Attach all session images for context
            boardId,
            status: 'pending',
            timestamp: Date.now()
          };

          await saveSurvey(record);
          return record;
        } catch (imgErr) {
          console.error("Individual image processing failed:", imgErr);
          // Save a record with no data if analysis fails for one image
          const record: SurveyRecord = {
            id: crypto.randomUUID(),
            type,
            data: {},
            images: sessionImages, // Attach all session images for context
            boardId,
            status: 'pending',
            timestamp: Date.now()
          };
          await saveSurvey(record);
          return record;
        }
      }));

      setSessionImages([]);
      if (createdRecords.length === 1) {
        setCurrentRecord(createdRecords[0]);
        setView('review');
      } else {
        await loadHistory();
        setView('history');
        alert(`Analyzed ${createdRecords.length} images individually. Review them in History.`);
      }
      await refreshStatus();
    } catch (err) {
      console.error("Batch processing error:", err);
      alert("An error occurred during batch processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async (record: SurveyRecord) => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    
    try {
      const category = record.data?.category || (record.type === 'ISC' ? 'HVAC' : record.type === 'EFS' ? 'Roofing' : 'General');
      const subcategory = record.data?.subcategory || 'General';
      
      // Map Subcategory to Existing Item ID from Madison Template
      const subcategoryIdMap: Record<string, string> = {
        // HVAC
        "RTU-Thermostat": "11335883234",
        "Roof Top Units": "11335891047",
        "Split Systems": "11335891048",
        "Split System - Thermostat": "11335892636",
        "Ptacs-Vtacs": "11335891049",
        "Ptac - Thermostats": "11335891039",
        "Boiler": "11335883236",
        "Chiller": "11335883235",
        // Cold Storage
        "Walk in Coolers": "11335883329",
        "Beverage Coolers": "11335883251",
        // Nano Cool (Roofing)
        "Start Here-Roof Assessment": "11335892640",
        "Sky Lights": "11335891038",
        "Drains": "11335892627",
        "Debris": "11335883157",
        "Ponding Water": "11335883328",
        // Electrical
        "Main Electrical Panel": "11335883159",
        "Sub Panels": "11335892637"
      };
      
      const subcategoryItemId = subcategoryIdMap[subcategory];
      
      // Naming convention for the update header
      const detail = record.type === 'ISC' 
        ? `${record.data?.manufacturer || ''} ${record.data?.modelNumber || ''}`.trim()
        : record.data?.material || '';
        
      const itemName = `${subcategory}: ${detail || new Date(record.timestamp).toLocaleDateString()}`;
      
      const columnValues = {
        status: "Working on it",
        text: JSON.stringify(record.data)
      };
      
      // Map Categories to Parent Item IDs
      const categoryParentMap: Record<string, string> = {
        'HVAC': '11335890913',
        'Cold Storage': '11335883222',
        'Roofing': '11335890908',
        'Electrical': '11335891044'
      };

      // Direct to subcategory item if found, otherwise use category parent
      const parentItemId = subcategoryItemId || categoryParentMap[category];

      // We always create a new subitem under the identified parent to ensure
      // images and AI output are associated with a fresh record.
      // Bolt ⚡: Parallelized Monday.com push and Google Sheets update
      await Promise.all([
        pushToMonday(itemName, columnValues, record.boardId, record.notes, record.images, parentItemId),
        (async () => {
          // Also update Google Sheet if connected
          if (googleConnected && spreadsheetId) {
            try {
              await fetch('/api/google/update-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spreadsheetId, record })
              });
            } catch (gErr) {
              console.error("Google Sheet update failed", gErr);
            }
          }
        })()
      ]);

      await markAsSynced(record.id);
      await refreshStatus();
      await loadHistory();
      
      setSyncCompleted(true);
      // alert("Sync Complete! Data delivered to Monday.com.");
      // setView('home');
      // setCurrentRecord(null);
    } catch (err: any) {
      console.error("Sync error:", err);
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">MADISON</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">Site Surveyor v1.0</p>
          </div>
        </div>
          <div className="flex items-center gap-4">
            {!googleConnected && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                  <AlertCircle className="w-3 h-3" />
                  Google Not Configured
                </div>
                <button 
                  onClick={checkGoogleStatus}
                  className="p-1 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                  title="Retry connection check"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
            {googleConnected && (
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Google Service Active
              </div>
            )}
            <SyncStatus isOnline={isOnline} pendingCount={pendingCount} />
          </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 pb-32">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Strategic Intelligence Unit</h2>
                <p className="text-zinc-500">Select a module to begin field data capture.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Monday Job Board ID</label>
                    <div className="flex gap-2 items-center">
                      {serverConfig.hasApiKey ? (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><CheckCircle className="w-2 h-2" /> API LINKED</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-2 h-2" /> NO API KEY</span>
                          <button 
                            onClick={checkConfig}
                            className="p-1 hover:bg-zinc-800 rounded transition-colors"
                            title="Refresh Connection"
                          >
                            <RefreshCw className="w-3 h-3 text-zinc-500" />
                          </button>
                        </div>
                      )}
                      {!isOnline && <span className="text-[10px] text-amber-500 font-bold">OFFLINE</span>}
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={boardId}
                      onChange={(e) => setBoardId(e.target.value)}
                      placeholder={serverConfig.hasDefaultBoard ? "Using default from Secrets..." : "Enter Board ID (Required)..."}
                      className={`w-full bg-black border rounded-lg px-4 py-2 text-sm outline-none transition-colors ${verifiedBoardName ? 'border-emerald-500/50' : 'border-zinc-700 focus:border-emerald-500'}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isVerifying && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
                      {verifiedBoardName && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    </div>
                  </div>
                  {verifiedBoardName && (
                    <p className="text-[10px] text-emerald-500/70 italic flex items-center gap-1">
                      <CheckCircle className="w-2 h-2" /> Linked to board: "{verifiedBoardName}"
                    </p>
                  )}
                  {!boardId && !serverConfig.hasDefaultBoard && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-amber-500/70 italic">Please enter a Board ID to enable capture modules.</p>
                      <button 
                        onClick={() => setBoardId('18401101635')}
                        className="text-[10px] text-zinc-500 hover:text-emerald-500 underline transition-colors"
                      >
                        Use Board ID: 18401101635
                      </button>
                    </div>
                  )}
                  {boardId && !verifiedBoardName && !isVerifying && serverConfig.hasApiKey && (
                    <p className="text-[10px] text-red-500/70 italic">Board not found. Please check the ID.</p>
                  )}
                </div>

                {!isOnline && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/80 leading-relaxed">
                      You are currently offline. Surveys will be saved to local storage and can be synced once a connection is restored.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModuleButton 
                    icon={<Factory className="w-6 h-6" />}
                  title="Industrial Spec Capture"
                  description="OCR analysis for mechanical nameplates"
                  onClick={() => (boardId || serverConfig.hasDefaultBoard) ? setView('isc') : alert('Please enter a Board ID first')}
                  color="emerald"
                  disabled={!boardId && !serverConfig.hasDefaultBoard}
                />
                <ModuleButton 
                  icon={<Cloud className="w-6 h-6" />}
                  title="Exterior Forensic Scan"
                  description="Roofing material and defect classification"
                  onClick={() => (boardId || serverConfig.hasDefaultBoard) ? setView('efs') : alert('Please enter a Board ID first')}
                  color="blue"
                  disabled={!boardId && !serverConfig.hasDefaultBoard}
                />
                <ModuleButton 
                  icon={<History className="w-6 h-6" />}
                  title="Survey History"
                  description="Review and sync pending records"
                  onClick={() => setView('history')}
                  color="zinc"
                />
              </div>
            </motion.div>
          )}

          {(view === 'isc' || view === 'efs') && (
            <motion.div 
              key="capture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Modules</span>
              </button>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  {view === 'isc' ? 'Industrial Spec Capture' : 'Exterior Forensic Scan'}
                </h2>
                <p className="text-zinc-500">Capture one or more photos for AI analysis.</p>
              </div>

              {sessionImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono tracking-widest uppercase text-zinc-500">Captured Photos ({sessionImages.length})</span>
                    <button 
                      onClick={() => setSessionImages([])}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {sessionImages.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800">
                        <img src={img} alt={`Capture ${i}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setSessionImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handleAnalyze(view === 'isc' ? 'ISC' : 'EFS')}
                    disabled={isProcessing}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Analyzing {sessionImages.length} Photos...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Analyze {sessionImages.length} Photos</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <CameraCapture 
                label={view === 'isc' ? "Capture Nameplate" : "Capture Roof Section"} 
                onCapture={(base64) => handleCapture(view === 'isc' ? 'ISC' : 'EFS', base64)}
                captureCount={sessionImages.length}
              />

              <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-xs text-zinc-500 leading-relaxed">
                <p><strong>Note:</strong> Ensure high contrast and clear focus. {view === 'isc' ? 'For nameplates, include the entire manufacturer plate.' : 'For roofing, capture defects from approximately 5ft height.'}</p>
              </div>
            </motion.div>
          )}

          {view === 'review' && currentRecord && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Review Data</h2>
                <button onClick={() => { setSyncCompleted(false); setView('home'); }} className="text-zinc-500 underline text-sm">Dismiss</button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono tracking-widest uppercase text-zinc-500">Captured Photos ({currentRecord.images?.length || 0})</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                  {currentRecord.images?.map((img, i) => (
                    <div key={i} className="relative aspect-video w-4/5 shrink-0 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 snap-center">
                      <img src={img} alt={`Captured ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
                  <span className="text-xs font-mono tracking-widest uppercase text-zinc-400">AI Extraction Results</span>
                  {currentRecord.status === 'synced' && (
                    <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                      <CheckCircle className="w-3 h-3" /> SYNCED
                    </span>
                  )}
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <DataField label="Site Name" value={currentRecord.data?.siteName} />
                    </div>
                    <DataField label="Category" value={currentRecord.data?.category} />
                    <DataField label="Subcategory" value={currentRecord.data?.subcategory} />
                  </div>
                  
                  <div className="h-px bg-zinc-800 my-2" />

                  {currentRecord.type === 'ISC' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <DataField label="Manufacturer" value={currentRecord.data?.manufacturer} />
                      <DataField label="Model" value={currentRecord.data?.modelNumber} />
                      <DataField label="Serial" value={currentRecord.data?.serialNumber} />
                      <DataField label="Year" value={currentRecord.data?.year} />
                      <DataField label="Voltage" value={currentRecord.data?.voltage} />
                      <DataField label="Capacity" value={currentRecord.data?.capacity} />
                      <div className="col-span-2">
                        <DataField label="AI Observations" value={currentRecord.data?.observations} />
                      </div>
                      {currentRecord.data?.manualLink && (
                        <a 
                          href={currentRecord.data.manualLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="col-span-2 flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-sm hover:bg-emerald-500/20 transition-colors"
                        >
                          <span className="font-medium">Technical Manual Found</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ) : currentRecord.type === 'EFS' ? (
                    <div className="space-y-4">
                      <DataField label="Material" value={currentRecord.data?.material} />
                      <div className="space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Identified Defects</span>
                        <div className="flex flex-wrap gap-2">
                          {currentRecord.data?.defects?.map((d: string) => (
                            <span key={d} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded uppercase font-bold">{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400 italic">General project profile capture. Use the Field Notes below to provide additional context for this submission.</p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Target Board ID</label>
                      <button 
                        onClick={() => setIsEditingBoardId(!isEditingBoardId)}
                        className="text-[10px] text-emerald-500 hover:underline"
                      >
                        {isEditingBoardId ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {isEditingBoardId ? (
                      <input 
                        type="text"
                        value={currentRecord.boardId || ''}
                        onChange={(e) => {
                          const updated = { ...currentRecord, boardId: e.target.value.trim() };
                          setCurrentRecord(updated);
                          saveSurvey(updated as SurveyRecord);
                        }}
                        className="w-full bg-black border border-emerald-500/50 rounded-lg px-3 py-1.5 text-xs text-emerald-500 outline-none"
                        placeholder="Enter correct Board ID..."
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-black/30 p-2 rounded border border-zinc-800">
                        <Settings className="w-3 h-3 opacity-50" />
                        {currentRecord.boardId || 'No Board ID set'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Field Notes (Optional - Syncs as Comment)</label>
                    <textarea 
                      value={currentRecord.notes || ''}
                      onChange={(e) => {
                        const updated = { ...currentRecord, notes: e.target.value };
                        setCurrentRecord(updated);
                        saveSurvey(updated as SurveyRecord);
                      }}
                      placeholder="Add site observations..."
                      className="w-full h-24 bg-black border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:border-emerald-500 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              {currentRecord.status === 'pending' && (
                <button
                  onClick={() => handleSync(currentRecord as SurveyRecord)}
                  disabled={!isOnline || isSyncing}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Syncing to Monday...</span>
                    </>
                  ) : (
                    <span>{isOnline ? 'Sync to Monday.com' : 'Offline - Saved Locally'}</span>
                  )}
                </button>
              )}

              {syncCompleted && (
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setSyncCompleted(false);
                        setCurrentRecord(null);
                        setView('home');
                      }}
                      className="py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <span>Survey Complete</span>
                    </button>
                    <button
                      onClick={() => {
                        setSyncCompleted(false);
                        setCurrentRecord(null);
                        // Go back to the module they were using
                        setView(currentRecord.type === 'ISC' ? 'isc' : 'efs');
                      }}
                      className="py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Edit Survey</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={handleExportToSheets}
                    disabled={isExporting || !googleConnected}
                    className="w-full py-4 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-2xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Exporting to Sheets...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-5 h-5" />
                        <span>Export Job Board to Google Sheets</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Survey History</h2>
                {verifiedBoardName && (
                  <button 
                    onClick={handleExportToSheets}
                    disabled={isExporting}
                    className="flex items-center gap-2 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Export to Sheets
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {history.map(record => (
                  <div 
                    key={record.id}
                    onClick={() => {
                      setCurrentRecord(record);
                      setView('review');
                    }}
                    className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-4 cursor-pointer hover:border-zinc-600 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      <img src={record.images?.[0]} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${record.type === 'ISC' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                          {record.type}
                        </span>
                        <span className="text-xs text-zinc-500">{new Date(record.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-medium truncate mt-1">
                        {record.type === 'ISC' ? record.data?.manufacturer || 'Unknown Unit' : record.data?.material || 'Roof Scan'}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-0.5">BOARD: {record.boardId}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700" />
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="py-12 text-center text-zinc-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No surveys captured yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
              <div className="absolute inset-0 blur-2xl bg-emerald-500/20 animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold mt-8 mb-2">Analyzing Data</h3>
            <p className="text-zinc-500 max-w-xs">Gemini 1.5 Flash is extracting specifications and identifying defects...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ModuleButton = memo(function ModuleButton({ icon, title, description, onClick, color, disabled, loading }: any) {
  const colors = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500/20",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-500 group-hover:bg-blue-500/20",
    zinc: "bg-zinc-800 border-zinc-700 text-zinc-400 group-hover:bg-zinc-700"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled || loading}
      className={`group p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-6 text-left transition-all hover:border-zinc-600 active:scale-[0.98] ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`p-4 rounded-xl transition-colors ${colors[color as keyof typeof colors]}`}>
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
      </div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 text-zinc-500 ml-auto animate-spin" />
      ) : (
        <ChevronRight className="w-5 h-5 text-zinc-700 ml-auto group-hover:text-zinc-400 transition-colors" />
      )}
    </button>
  );
}

const DataField = memo(function DataField({ label, value }: { label: string, value?: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">{label}</span>
      <p className="text-sm font-medium text-zinc-200">{value || '---'}</p>
    </div>
  );
}
