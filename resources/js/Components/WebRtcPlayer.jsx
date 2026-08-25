import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, RefreshCw, AlertCircle, WifiOff, Wifi } from 'lucide-react';

// Multiple STUN servers for better NAT traversal on public/mobile NVR connections
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.openrelay.metered.ca:80' },
];

// Clamp video bitrate in SDP to reduce bandwidth on weak connections
function constrainSdpBandwidth(sdp, maxKbps = 1500) {
    return sdp.replace(
        /^(m=video.*\r\n)/m,
        (match) => `${match}b=AS:${maxKbps}\r\n`
    );
}

const MAX_RETRIES = 5;
const BASE_RETRY_MS = 2000;

export default function WebRtcPlayer({
    streamKey,
    streamUrl,
    isOnline = false,
    channelName = 'Kamera CCTV',
    fallbackImage = null,
    className = '',
    onStatusChange = null,
    zoom = 1,
    panX = 0,
    panY = 0,
    showControls = true
}) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const pcRef = useRef(null);
    const retryTimerRef = useRef(null);
    const stallTimerRef = useRef(null);
    const lastTimeRef = useRef(0);
    const retryCountRef = useRef(0);
    const unmountedRef = useRef(false);

    const [pcState, setPcState] = useState('idle');
    const [retryCount, setRetryCount] = useState(0);

    const [internalZoom, setInternalZoom] = useState(1);
    const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const currentZoom = zoom !== 1 ? zoom : internalZoom;
    const currentPanX = panX !== 0 ? panX : internalPan.x;
    const currentPanY = panY !== 0 ? panY : internalPan.y;

    const handleZoomIn = (e) => { e?.stopPropagation?.(); setInternalZoom(prev => Math.min(prev + 0.5, 4)); };
    const handleZoomOut = (e) => {
        e?.stopPropagation?.();
        setInternalZoom(prev => { const next = Math.max(prev - 0.5, 1); if (next === 1) setInternalPan({ x: 0, y: 0 }); return next; });
    };
    const handleResetZoom = (e) => { e?.stopPropagation?.(); setInternalZoom(1); setInternalPan({ x: 0, y: 0 }); };
    const handleMouseDown = (e) => { if (currentZoom > 1) { setIsDragging(true); setDragStart({ x: e.clientX - internalPan.x, y: e.clientY - internalPan.y }); } };
    const handleMouseMove = (e) => {
        if (isDragging && currentZoom > 1) {
            const maxPan = (currentZoom - 1) * 120;
            setInternalPan({ x: Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x)), y: Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y)) });
        }
    };
    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => { if (onStatusChange) onStatusChange(pcState); }, [pcState, onStatusChange]);

    const cleanupPc = useCallback(() => {
        clearTimeout(retryTimerRef.current);
        clearInterval(stallTimerRef.current);
        if (pcRef.current) {
            try { pcRef.current.close(); } catch (_) {}
            pcRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const scheduleReconnect = useCallback((connectFn) => {
        if (unmountedRef.current) return;
        cleanupPc();
        const currentRetry = retryCountRef.current;
        if (currentRetry >= MAX_RETRIES) {
            setPcState('failed');
            setRetryCount(currentRetry);
            return;
        }
        retryCountRef.current = currentRetry + 1;
        setRetryCount(currentRetry + 1);
        setPcState('reconnecting');
        const delay = Math.min(BASE_RETRY_MS * Math.pow(2, currentRetry), 16000);
        console.info(`[WebRTC][${streamKey}] Reconnect #${currentRetry + 1}/${MAX_RETRIES} in ${delay}ms`);
        retryTimerRef.current = setTimeout(() => {
            if (!unmountedRef.current) connectFn();
        }, delay);
    }, [cleanupPc, streamKey]);

    useEffect(() => {
        unmountedRef.current = false;
        retryCountRef.current = 0;

        if (!isOnline || !streamKey) {
            setPcState('disconnected');
            return;
        }

        function connect() {
            if (unmountedRef.current || !isOnline || !streamKey) return;
            cleanupPc();

            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            pcRef.current = pc;

            if (retryCountRef.current === 0) {
                setPcState('connecting');
            } else {
                setPcState('reconnecting');
            }

            pc.ontrack = (ev) => {
                if (unmountedRef.current) return;
                if (videoRef.current && ev.streams?.[0]) {
                    videoRef.current.srcObject = ev.streams[0];
                    videoRef.current.play().catch(() => {});
                    setPcState('connected');
                    retryCountRef.current = 0;
                    setRetryCount(0);

                    // Stall detection: video currentTime not advancing -> reconnect
                    clearInterval(stallTimerRef.current);
                    lastTimeRef.current = 0;
                    stallTimerRef.current = setInterval(() => {
                        const vid = videoRef.current;
                        if (!vid || unmountedRef.current) return;
                        if (vid.currentTime === lastTimeRef.current && !vid.paused) {
                            console.warn(`[WebRTC][${streamKey}] Video stall detected`);
                            clearInterval(stallTimerRef.current);
                            scheduleReconnect(connect);
                        }
                        lastTimeRef.current = vid.currentTime;
                    }, 5000);
                }
            };

            pc.oniceconnectionstatechange = () => {
                if (unmountedRef.current) return;
                const state = pc.iceConnectionState;
                if (state === 'connected' || state === 'completed') {
                    setPcState('connected');
                    retryCountRef.current = 0;
                    setRetryCount(0);
                } else if (state === 'failed' || state === 'disconnected') {
                    console.warn(`[WebRTC][${streamKey}] ICE ${state}`);
                    scheduleReconnect(connect);
                }
            };

            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => new Promise(resolve => {
                    if (pc.iceGatheringState === 'complete') { resolve(); return; }
                    const check = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', check);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', check);
                    setTimeout(resolve, 3000);
                }))
                .then(() => {
                    const constrainedSdp = constrainSdpBandwidth(pc.localDescription.sdp, 1500);
                    return fetch(`http://${window.location.hostname}:1984/api/webrtc?src=${encodeURIComponent(streamKey)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/sdp' },
                        body: constrainedSdp
                    }).catch(() =>
                        fetch(`/api/cctv/webrtc?src=${encodeURIComponent(streamKey)}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/sdp' },
                            body: constrainedSdp
                        })
                    );
                })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.text();
                })
                .then(answerSdp => pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp })))
                .catch(err => {
                    console.warn(`[WebRTC][${streamKey}] Error:`, err.message);
                    if (!unmountedRef.current) scheduleReconnect(connect);
                });
        }

        connect();

        return () => {
            unmountedRef.current = true;
            cleanupPc();
        };
    }, [streamKey, isOnline, cleanupPc, scheduleReconnect]);

    const handleManualRetry = () => {
        retryCountRef.current = 0;
        setRetryCount(0);
        if (!isOnline || !streamKey) return;
        cleanupPc();
        // Re-trigger by toggling — leverage the effect cleanup/reconnect cycle
        setPcState('connecting');
        setTimeout(() => {
            retryCountRef.current = 0;
            setRetryCount(0);
        }, 100);
    };

    if (!isOnline) {
        return (
            <div className={`w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-2 ${className}`}>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <WifiOff className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-300 font-mono">{channelName}</p>
                <p className="text-[10px] text-slate-500">Perangkat NVR sedang offline atau belum terhubung</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-full bg-black relative flex items-center justify-center overflow-hidden select-none ${currentZoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                preload="auto"
                style={{
                    transform: `scale(${currentZoom}) translate(${currentPanX}px, ${currentPanY}px)`,
                    transition: isDragging ? 'none' : 'transform 0.25s ease-out'
                }}
                className={`w-full h-full object-cover origin-center ${
                    pcState === 'connected' ? 'opacity-100' : 'opacity-0 absolute'
                }`}
            />

            {showControls && pcState === 'connected' && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 opacity-0 hover:opacity-100 transition-opacity">
                    <button type="button" onClick={handleZoomIn} title="Zoom In" className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20 font-bold text-xs cursor-pointer transition-colors">+</button>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 px-1">{currentZoom.toFixed(1)}x</span>
                    <button type="button" onClick={handleZoomOut} title="Zoom Out" disabled={currentZoom <= 1} className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20 font-bold text-xs cursor-pointer disabled:opacity-30 transition-colors">-</button>
                    {currentZoom > 1 && (
                        <button type="button" onClick={handleResetZoom} title="Reset Zoom" className="text-[9px] font-mono font-bold text-slate-300 hover:text-white px-1 ml-1 bg-white/10 rounded hover:bg-white/20 transition-colors">Reset</button>
                    )}
                </div>
            )}

            {pcState !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    {fallbackImage && (
                        <img
                            src={fallbackImage}
                            alt={channelName}
                            style={{ transform: `scale(${currentZoom}) translate(${currentPanX}px, ${currentPanY}px)`, transition: 'transform 0.25s ease-out' }}
                            className="absolute inset-0 w-full h-full object-cover origin-center opacity-30"
                        />
                    )}
                    <div className="relative z-10 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 text-center space-y-2 max-w-[85%]">
                        {pcState === 'failed' ? (
                            <>
                                <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                                <div className="text-xs font-bold text-white font-mono">{channelName}</div>
                                <div className="text-[10px] text-rose-300">Koneksi stream tidak dapat dijangkau</div>
                                <button
                                    onClick={handleManualRetry}
                                    className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 mx-auto cursor-pointer transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" /> Coba Sambung Ulang
                                </button>
                            </>
                        ) : pcState === 'reconnecting' ? (
                            <>
                                <RefreshCw className="w-6 h-6 text-amber-400 mx-auto animate-spin" />
                                <div className="text-xs font-bold text-white font-mono">{channelName}</div>
                                <div className="text-[10px] text-amber-300">Menyambungkan ulang... ({retryCount}/{MAX_RETRIES})</div>
                            </>
                        ) : (
                            <>
                                <Wifi className="w-6 h-6 text-emerald-400 mx-auto animate-pulse" />
                                <div className="text-xs font-bold text-white font-mono">{channelName}</div>
                                <div className="text-[10px] text-emerald-400 font-mono">Menghubungkan WebRTC Feed...</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
