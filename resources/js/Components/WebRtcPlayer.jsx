import React, { useEffect, useRef, useState } from 'react';
import { Video, RefreshCw, AlertCircle, WifiOff } from 'lucide-react';

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
    const [pcState, setPcState] = useState('idle'); // 'idle' | 'connecting' | 'connected' | 'failed'
    const [errorMsg, setErrorMsg] = useState('');
    
    // Internal zoom state if not controlled from parent
    const [internalZoom, setInternalZoom] = useState(1);
    const [internalPan, setInternalPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const currentZoom = zoom !== 1 ? zoom : internalZoom;
    const currentPanX = panX !== 0 ? panX : internalPan.x;
    const currentPanY = panY !== 0 ? panY : internalPan.y;

    const handleZoomIn = (e) => {
        e?.stopPropagation?.();
        setInternalZoom(prev => Math.min(prev + 0.5, 4));
    };

    const handleZoomOut = (e) => {
        e?.stopPropagation?.();
        setInternalZoom(prev => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setInternalPan({ x: 0, y: 0 });
            return next;
        });
    };

    const handleResetZoom = (e) => {
        e?.stopPropagation?.();
        setInternalZoom(1);
        setInternalPan({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (currentZoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - internalPan.x, y: e.clientY - internalPan.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && currentZoom > 1) {
            const maxPan = (currentZoom - 1) * 120;
            const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x));
            const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y));
            setInternalPan({ x: newX, y: newY });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        if (onStatusChange) {
            onStatusChange(pcState);
        }
    }, [pcState, onStatusChange]);

    useEffect(() => {
        if (!isOnline || !streamKey) {
            setPcState('disconnected');
            return;
        }

        let pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        setPcState('connecting');

        pc.ontrack = (ev) => {
            if (videoRef.current && ev.streams && ev.streams[0]) {
                videoRef.current.srcObject = ev.streams[0];
                videoRef.current.play().catch(() => {});
                setPcState('connected');
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setPcState('connected');
            } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                setPcState('failed');
            }
        };

        // Create offer with recvonly video and audio
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
                // Wait for ICE candidates gathering (timeout 1s max for local LAN)
                return new Promise((resolve) => {
                    if (pc.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        const checkState = () => {
                            if (pc.iceGatheringState === 'complete') {
                                pc.removeEventListener('icegatheringstatechange', checkState);
                                resolve();
                            }
                        };
                        pc.addEventListener('icegatheringstatechange', checkState);
                        setTimeout(resolve, 800);
                    }
                });
            })
            .then(() => {
                const sdp = pc.localDescription.sdp;
                return fetch(`http://${window.location.hostname}:1984/api/webrtc?src=${encodeURIComponent(streamKey)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: sdp
                });
            })
            .then((res) => {
                if (!res.ok) throw new Error('Gateway streaming go2rtc belum siap');
                return res.text();
            })
            .then((answerSdp) => {
                return pc.setRemoteDescription(new RTCSessionDescription({
                    type: 'answer',
                    sdp: answerSdp
                }));
            })
            .catch((err) => {
                console.warn('WebRTC direct handshake note:', err.message);
                // Fallback to proxy route
                fetch(`/api/cctv/webrtc?src=${encodeURIComponent(streamKey)}`, {
                    method: 'POST',
                    body: pc.localDescription?.sdp
                })
                .then(r => r.text())
                .then(ans => pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: ans })))
                .catch(() => setPcState('failed'));
            });

        return () => {
            if (pc) {
                pc.close();
            }
        };
    }, [streamKey, isOnline]);

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
                style={{
                    transform: `scale(${currentZoom}) translate(${currentPanX}px, ${currentPanY}px)`,
                    transition: isDragging ? 'none' : 'transform 0.25s ease-out'
                }}
                className={`w-full h-full object-cover origin-center ${
                    pcState === 'connected' ? 'opacity-100' : 'opacity-0 absolute'
                }`}
            />

            {/* Quick Digital Zoom HUD Controls Overlay */}
            {showControls && pcState === 'connected' && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        title="Zoom In Digital"
                        className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20 font-bold text-xs cursor-pointer transition-colors"
                    >
                        +
                    </button>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 px-1">
                        {currentZoom.toFixed(1)}x
                    </span>
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        title="Zoom Out Digital"
                        disabled={currentZoom <= 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-white/20 font-bold text-xs cursor-pointer disabled:opacity-30 transition-colors"
                    >
                        -
                    </button>
                    {currentZoom > 1 && (
                        <button
                            type="button"
                            onClick={handleResetZoom}
                            title="Reset Zoom (1x)"
                            className="text-[9px] font-mono font-bold text-slate-300 hover:text-white px-1 ml-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            )}

            {/* Fallback to Snapshot Image or connecting state */}
            {pcState !== 'connected' && (
                fallbackImage ? (
                    <img
                        src={fallbackImage}
                        alt={channelName}
                        style={{
                            transform: `scale(${currentZoom}) translate(${currentPanX}px, ${currentPanY}px)`,
                            transition: 'transform 0.25s ease-out'
                        }}
                        className="w-full h-full object-cover origin-center"
                    />
                ) : (
                    <div className="text-center p-6 space-y-2">
                        <Video className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                        <div className="text-xs font-bold text-white font-mono">{channelName}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                            {pcState === 'connecting' ? 'Menghubungkan WebRTC Feed...' : 'Live RTSP Siap Dijalankan'}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
