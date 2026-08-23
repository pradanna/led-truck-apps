<?php

namespace App\Http\Controllers;

use App\Services\HolowitsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CctvMonitoringController extends Controller
{
    protected HolowitsService $holowits;

    public function __construct(HolowitsService $holowits)
    {
        $this->holowits = $holowits;
    }

    /**
     * Display the Live CCTV Monitoring & Traffic Analytics Dashboard
     * Ultra-lightweight with instant cached status response (0ms render).
     */
    public function index(Request $request): Response
    {
        $monitoringData = \Illuminate\Support\Facades\Cache::get('holowits_truck_statuses', null);
        if (!$monitoringData) {
            $monitoringData = $this->holowits->getLiveMonitoringData();
        }

        return Inertia::render('CctvMonitoring', [
            'monitoringData' => $monitoringData,
        ]);
    }

    /**
     * API endpoint to get real-time stream & traffic statistics
     */
    public function getStreamData(Request $request)
    {
        $force = $request->boolean('force', false);
        $data = $this->holowits->getLiveMonitoringData($force);

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * API endpoint to update NVR Public IP and configurations for a truck
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'truck_id' => 'required|string',
            'nvr_ip' => 'required|string',
            'http_port' => 'nullable|numeric',
            'rtsp_port' => 'nullable|numeric',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $configs = $this->holowits->getTruckConfigs();
        $truckId = $request->input('truck_id');

        if (!isset($configs[$truckId])) {
            return response()->json([
                'success' => false,
                'message' => 'ID Truk tidak ditemukan.'
            ], 404);
        }

        $configs[$truckId]['nvr_ip'] = trim($request->input('nvr_ip'));
        if ($request->filled('http_port')) $configs[$truckId]['http_port'] = (int)$request->input('http_port');
        if ($request->filled('rtsp_port')) $configs[$truckId]['rtsp_port'] = (int)$request->input('rtsp_port');
        if ($request->filled('username')) $configs[$truckId]['username'] = trim($request->input('username'));
        if ($request->filled('password')) $configs[$truckId]['password'] = $request->input('password');

        $this->holowits->saveTruckConfigs($configs);

        // Immediate test connection query
        $freshData = $this->holowits->getLiveMonitoringData(true);

        return response()->json([
            'success' => true,
            'message' => "Pengaturan IP NVR {$configs[$truckId]['name']} berhasil disimpan!",
            'data' => $freshData
        ]);
    }

    /**
     * API endpoint to trigger a camera snapshot
     */
    public function takeSnapshot(Request $request)
    {
        $channel = $request->input('channel', 'CH1');
        $truckId = $request->input('truck_id', 'truck_1');

        $result = $this->holowits->takeSnapshot($truckId, $channel);

        return response()->json($result);
    }

    /**
     * WebRTC Signalling Gateway Proxy to go2rtc sidecar
     */
    public function webrtc(Request $request)
    {
        $src = $request->query('src', 'truck_1_ch1');
        $gatewayUrl = "http://127.0.0.1:1984/api/webrtc?src=" . urlencode($src);

        if ($request->isMethod('post')) {
            try {
                $response = \Illuminate\Support\Facades\Http::timeout(3)
                    ->withBody($request->getContent(), 'application/sdp')
                    ->post($gatewayUrl);

                return response($response->body(), $response->status())
                    ->header('Content-Type', 'application/sdp');
            } catch (\Throwable $e) {
                return response()->json([
                    'error' => 'Gateway WebRTC sedang memulai atau belum siap.'
                ], 503);
            }
        }

        return response()->json([
            'stream_src' => $src,
            'gateway' => 'go2rtc sidecar active',
            'webrtc_endpoint' => $gatewayUrl
        ]);
    }

    /**
     * API endpoint to handle PTZ Movement and Zoom Commands
     */
    public function handlePtz(Request $request)
    {
        $request->validate([
            'truck_id' => 'required|string',
            'channel' => 'required|string',
            'command' => 'required|string', // UP, DOWN, LEFT, RIGHT, ZOOM_IN, ZOOM_OUT, STOP
            'speed' => 'nullable|numeric',
        ]);

        $truckId = $request->input('truck_id', 'truck_1');
        $channel = $request->input('channel', 'CH1');
        $command = strtoupper($request->input('command'));
        $speed = (int)($request->input('speed', 5));

        $result = $this->holowits->sendPtzCommand($truckId, $channel, $command, $speed);

        return response()->json($result);
    }
}
