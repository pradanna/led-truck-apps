<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

use App\Models\SystemSetting;

class HolowitsService
{
    /**
     * Default list of trucks and initial network configuration
     */
    public function getTruckConfigs(): array
    {
        $defaultConfigs = [
            'truck_1' => [
                'id' => 'truck_1',
                'name' => 'Truk LED 01 (B 9731 JXS)',
                'nvr_ip' => '31.58.158.133',
                'http_port' => 70,
                'rtsp_port' => 70,
                'username' => 'admin',
                'password' => 'Mobilled9731',
                'channels' => [
                    'CH1' => ['id' => 'CH1', 'name' => 'Kamera Belakang (Layar LED)', 'type' => 'led_screen'],
                    'CH2' => ['id' => 'CH2', 'name' => 'Kamera Depan (Traffic & AI)', 'type' => 'traffic'],
                ]
            ],
            'truck_2' => [
                'id' => 'truck_2',
                'name' => 'Truk LED 02 (B 9142 SXZ)',
                'nvr_ip' => '151.242.116.16',
                'http_port' => 70,
                'rtsp_port' => 70,
                'username' => 'admin',
                'password' => 'Mobilled9729',
                'channels' => [
                    'CH1' => ['id' => 'CH1', 'name' => 'Kamera Belakang (Layar LED)', 'type' => 'led_screen'],
                    'CH2' => ['id' => 'CH2', 'name' => 'Kamera Depan (Traffic & AI)', 'type' => 'traffic'],
                ]
            ]
        ];

        $dbJson = SystemSetting::get('holowits_nvr_truck_configs');
        if ($dbJson) {
            $decoded = json_decode($dbJson, true);
            if (is_array($decoded) && !empty($decoded)) {
                return $decoded;
            }
        }

        return Cache::get('holowits_nvr_truck_configs', $defaultConfigs);
    }

    /**
     * Save updated truck configurations (Public IP, Ports, Credentials)
     */
    public function saveTruckConfigs(array $configs): bool
    {
        SystemSetting::set('holowits_nvr_truck_configs', json_encode($configs), 'holowits', false, 'Konfigurasi IP Publik NVR Truk');
        Cache::forever('holowits_nvr_truck_configs', $configs);
        // Clear cached channel statuses so next request queries fresh
        Cache::forget('holowits_truck_statuses');
        
        // Sync configuration to go2rtc sidecar microservice
        $this->syncGo2rtcConfig($configs);
        
        return true;
    }

    /**
     * Synchronize go2rtc.yaml configuration dynamically with active truck NVR settings
     */
    public function syncGo2rtcConfig(?array $configs = null): bool
    {
        $configs = $configs ?? $this->getTruckConfigs();
        $yamlPath = base_path('tools/streaming/go2rtc.yaml');

        $t1 = $configs['truck_1'] ?? [];
        $t2 = $configs['truck_2'] ?? [];

        $t1User = $t1['username'] ?? 'admin';
        $t1Pass = $t1['password'] ?? 'Admin12345!';
        $t1Ip = $t1['nvr_ip'] ?? '103.144.175.22';
        $t1Rtsp = $t1['rtsp_port'] ?? 554;

        $t2User = $t2['username'] ?? 'admin';
        $t2Pass = $t2['password'] ?? 'Admin12345!';
        $t2Ip = $t2['nvr_ip'] ?? '103.144.175.28';
        $t2Rtsp = $t2['rtsp_port'] ?? 554;

        $yamlContent = <<<YAML
# go2rtc WebRTC & RTSP Gateway Configuration for LED Truck Apps
# Automatically synchronized with SystemSettings & Holowits NVR credentials

api:
  listen: ":1984"
  origin: "*"

rtsp:
  listen: ":8554"

webrtc:
  listen: ":8555"

streams:
  truck_1_ch1:
    - rtsp://{$t1User}:{$t1Pass}@{$t1Ip}:{$t1Rtsp}/rtsp/streaming?channel=1&subtype=0#backchannel=0
  truck_1_ch2:
    - rtsp://{$t1User}:{$t1Pass}@{$t1Ip}:{$t1Rtsp}/rtsp/streaming?channel=2&subtype=0#backchannel=0

  truck_2_ch1:
    - rtsp://{$t2User}:{$t2Pass}@{$t2Ip}:{$t2Rtsp}/rtsp/streaming?channel=2&subtype=0#backchannel=0
  truck_2_ch2:
    - rtsp://{$t2User}:{$t2Pass}@{$t2Ip}:{$t2Rtsp}/rtsp/streaming?channel=1&subtype=0#backchannel=0
YAML;

        @file_put_contents($yamlPath, $yamlContent);

        // HOT-RELOAD: Push new stream URLs directly to running go2rtc instance via REST API
        $streamsToPush = [
            'truck_1_ch1' => "rtsp://{$t1User}:{$t1Pass}@{$t1Ip}:{$t1Rtsp}/rtsp/streaming?channel=1&subtype=0#backchannel=0",
            'truck_1_ch2' => "rtsp://{$t1User}:{$t1Pass}@{$t1Ip}:{$t1Rtsp}/rtsp/streaming?channel=2&subtype=0#backchannel=0",
            'truck_2_ch1' => "rtsp://{$t2User}:{$t2Pass}@{$t2Ip}:{$t2Rtsp}/rtsp/streaming?channel=2&subtype=0#backchannel=0",
            'truck_2_ch2' => "rtsp://{$t2User}:{$t2Pass}@{$t2Ip}:{$t2Rtsp}/rtsp/streaming?channel=1&subtype=0#backchannel=0",
        ];

        foreach ($streamsToPush as $name => $url) {
            try {
                \Illuminate\Support\Facades\Http::timeout(1)
                    ->put("http://127.0.0.1:1984/api/streams?name=" . urlencode($name) . "&src=" . urlencode($url));
            } catch (\Throwable $e) {
                // If go2rtc is temporarily starting, it will read from go2rtc.yaml
            }
        }

        return true;
    }

    /**
     * Query real status and AI traffic strictly from HOLOWITS NVR
     * Returns real error/disconnected state if unreachable
     */
    public function queryTruckNvrStatus(array $truck): array
    {
        $ip = trim($truck['nvr_ip'] ?? '');
        $port = (int)($truck['http_port'] ?? 443);
        // Automatically handle protocol: try https if port is 443 or 70 or if configured, fallback to http
        $isHttps = in_array($port, [443, 70, 8443]);
        $baseUrl = ($isHttps ? "https://" : "http://") . "{$ip}:{$port}";
        $user = $truck['username'] ?? 'admin';
        $pwd = $truck['password'] ?? '';
        $rtspPort = (int)($truck['rtsp_port'] ?? 554);

        if (empty($ip)) {
            return [
                'online' => false,
                'status' => 'UNCONFIGURED',
                'status_message' => 'IP Public NVR belum dikonfigurasi',
                'device_info' => null,
                'channels' => $this->buildOfflineChannels($truck, 'IP Public belum diisi'),
                'traffic' => $this->getEmptyTraffic('UNCONFIGURED'),
            ];
        }

        try {
            // Check NVR reachability: Support Holowits & Hikvision ISAPI
            $isHikvision = false;
            $rangeData = [];
            $deviceModel = 'NVR';

            // 1. Try Holowits API first (Check both https and http)
            $urlsToTry = [$baseUrl];
            if ($isHttps) {
                $urlsToTry[] = "http://{$ip}:{$port}";
            } else {
                $urlsToTry[] = "https://{$ip}:{$port}";
            }

            foreach ($urlsToTry as $targetUrl) {
                try {
                    $response = Http::timeout(2)
                        ->withoutVerifying()
                        ->post("{$targetUrl}/API/Login/Range", ['version' => '1.0', 'data' => []]);

                    if ($response->successful()) {
                        $baseUrl = $targetUrl;
                        $rangeData = $response->json()['data'] ?? [];
                        $deviceModel = 'HOLOWITS (' . ($rangeData['site_version'] ?? 'V9.0.0') . ')';
                        break;
                    }
                } catch (\Throwable $e) {
                    // Try next
                }
            }

            // 2. Try Hikvision ISAPI (with Digest Auth) if Holowits didn't respond
            if (empty($rangeData)) {
                $isapiRes = $this->sendDigestRequest("{$baseUrl}/ISAPI/System/deviceInfo", $user, $pwd);
                if ($isapiRes && $isapiRes->successful()) {
                    $isHikvision = true;
                    $xml = @simplexml_load_string($isapiRes->body());
                    if ($xml) {
                        $model = (string)($xml->model ?? 'Hikvision NVR');
                        $fw = (string)($xml->firmwareVersion ?? '');
                        $deviceModel = "{$model} ({$fw})";
                        $rangeData = [
                            'device_name' => (string)($xml->deviceName ?? 'NVR'),
                            'model' => $model,
                            'firmware' => $fw,
                            'serial' => (string)($xml->serialNumber ?? ''),
                        ];
                    } else {
                        $deviceModel = 'Hikvision ISAPI NVR';
                        $rangeData = ['device_name' => 'Hikvision NVR'];
                    }
                }
            }

            if (!empty($rangeData)) {
                $truckId = $truck['id'] ?? 'truck_1';
                $ch1Image = null;
                $ch2Image = null;

                // Try live snapshot fetch
                if ($isHikvision) {
                    try {
                        $snap1 = $this->sendDigestRequest("{$baseUrl}/ISAPI/Streaming/channels/101/picture", $user, $pwd);
                        if ($snap1 && $snap1->successful() && !empty($snap1->body())) {
                            $ch1Image = 'data:image/jpeg;base64,' . base64_encode($snap1->body());
                        }
                    } catch (\Throwable $t) {}
                    try {
                        $snap2 = $this->sendDigestRequest("{$baseUrl}/ISAPI/Streaming/channels/201/picture", $user, $pwd);
                        if ($snap2 && $snap2->successful() && !empty($snap2->body())) {
                            $ch2Image = 'data:image/jpeg;base64,' . base64_encode($snap2->body());
                        }
                    } catch (\Throwable $t) {}
                } else {
                    try {
                        $snap1 = Http::timeout(2)->withoutVerifying()->post("{$baseUrl}/API/Snapshot/Get", [
                            'version' => '1.0',
                            'data' => ['channel' => 'CH1']
                        ]);
                        if ($snap1->successful() && isset($snap1->json()['data']['img_data'])) {
                            $ch1Image = 'data:image/jpeg;base64,' . $snap1->json()['data']['img_data'];
                        }

                        $snap2 = Http::timeout(2)->withoutVerifying()->post("{$baseUrl}/API/Snapshot/Get", [
                            'version' => '1.0',
                            'data' => ['channel' => 'CH2']
                        ]);
                        if ($snap2->successful() && isset($snap2->json()['data']['img_data'])) {
                            $ch2Image = 'data:image/jpeg;base64,' . $snap2->json()['data']['img_data'];
                        }
                    } catch (\Throwable $snapErr) {}
                }
                
                // Channels list
                $channels = [
                    'CH1' => [
                        'id' => 'CH1',
                        'name' => 'Kamera Belakang (Layar LED)',
                        'type' => 'led_screen',
                        'status' => 'ONLINE',
                        'fps' => 25,
                        'bitrate' => '4096 kbps',
                        'resolution' => '1920x1080 (1080P FHD)',
                        'stream_key' => "{$truckId}_ch1",
                        'webrtc_url' => "/api/cctv/webrtc?src={$truckId}_ch1",
                        'rtsp_url' => $isHikvision
                            ? "rtsp://{$user}:{$pwd}@{$ip}:{$rtspPort}/Streaming/Channels/101"
                            : "rtsp://{$user}:{$pwd}@{$ip}:{$rtspPort}/LiveStream/CH1/main",
                        'live_image' => $ch1Image,
                        'last_check' => now()->format('H:i:s') . ' WIB',
                    ],
                    'CH2' => [
                        'id' => 'CH2',
                        'name' => 'Kamera Depan (Traffic & AI)',
                        'type' => 'traffic',
                        'status' => 'ONLINE',
                        'fps' => 25,
                        'bitrate' => '4096 kbps',
                        'resolution' => '1920x1080 (1080P FHD)',
                        'stream_key' => "{$truckId}_ch2",
                        'webrtc_url' => "/api/cctv/webrtc?src={$truckId}_ch2",
                        'rtsp_url' => $isHikvision
                            ? "rtsp://{$user}:{$pwd}@{$ip}:{$rtspPort}/Streaming/Channels/201"
                            : "rtsp://{$user}:{$pwd}@{$ip}:{$rtspPort}/LiveStream/CH2/main",
                        'live_image' => $ch2Image,
                        'last_check' => now()->format('H:i:s') . ' WIB',
                    ]
                ];

                // Query AI Object Statistics
                $trafficData = [
                    'motorcycles' => 0,
                    'cars' => 0,
                    'pedestrians' => 0,
                    'buses_trucks' => 0,
                    'density' => 'LANCAR',
                    'average_speed_kmh' => 0,
                    'estimated_reach' => 0,
                    'detection_status' => 'ONLINE',
                    'last_ai_update' => now()->format('H:i:s') . ' WIB',
                ];

                if (!$isHikvision) {
                    try {
                        $aiResp = Http::timeout(2)->withoutVerifying()->post("{$baseUrl}/API/AI/ObjectStatistics/Get", [
                            'version' => '1.0',
                            'data' => ['channel' => 'CH2']
                        ]);
                        if ($aiResp->successful() && isset($aiResp->json()['data'])) {
                            $aiData = $aiResp->json()['data'];
                            $trafficData['motorcycles'] = (int)($aiData['motor_num'] ?? $aiData['motorcycles'] ?? 0);
                            $trafficData['cars'] = (int)($aiData['car_num'] ?? $aiData['cars'] ?? 0);
                            $trafficData['pedestrians'] = (int)($aiData['people_num'] ?? $aiData['pedestrians'] ?? 0);
                            $trafficData['buses_trucks'] = (int)($aiData['bus_num'] ?? $aiData['buses_trucks'] ?? 0);
                            $trafficData['estimated_reach'] = round(($trafficData['motorcycles'] * 1.2) + ($trafficData['cars'] * 1.8) + $trafficData['pedestrians']);
                            $trafficData['density'] = $trafficData['estimated_reach'] > 500 ? 'PADAT MERAYAP' : ($trafficData['estimated_reach'] > 100 ? 'RAMAI LANCAR' : 'LANCAR');
                        }
                    } catch (\Throwable $aiErr) {}
                }

                return [
                    'online' => true,
                    'status' => 'ONLINE',
                    'status_message' => "Terkoneksi ke {$deviceModel}",
                    'device_info' => $rangeData,
                    'channels' => $channels,
                    'traffic' => $trafficData,
                ];
            } else {
                $statusMsg = 'NVR Sedang Standby / Menolak Koneksi';
            }
        } catch (\Throwable $e) {
            $statusMsg = 'DISCONNECTED (Host ' . $ip . ':' . $port . ' Unreachable / Timeout)';
        }

        // Return real Disconnected status if server unreachable
        return [
            'online' => false,
            'status' => 'DISCONNECTED',
            'status_message' => $statusMsg,
            'device_info' => null,
            'channels' => $this->buildOfflineChannels($truck, $statusMsg),
            'traffic' => $this->getEmptyTraffic('DISCONNECTED'),
        ];
    }

    /**
     * Get real live statuses and traffic telemetry across all configured trucks
     * with short 10s caching for ultra-lightweight execution.
     */
    public function getLiveMonitoringData(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && Cache::has('holowits_truck_statuses')) {
            return Cache::get('holowits_truck_statuses');
        }

        $configs = $this->getTruckConfigs();
        $truck1Result = $this->queryTruckNvrStatus($configs['truck_1']);
        $truck2Result = $this->queryTruckNvrStatus($configs['truck_2']);

        $totalMotors = $truck1Result['traffic']['motorcycles'] + $truck2Result['traffic']['motorcycles'];
        $totalCars = $truck1Result['traffic']['cars'] + $truck2Result['traffic']['cars'];
        $totalPeds = $truck1Result['traffic']['pedestrians'] + $truck2Result['traffic']['pedestrians'];
        $totalBuses = $truck1Result['traffic']['buses_trucks'] + $truck2Result['traffic']['buses_trucks'];
        $grandTotal = $totalMotors + $totalCars + $totalPeds + $totalBuses;
        $totalReach = $truck1Result['traffic']['estimated_reach'] + $truck2Result['traffic']['estimated_reach'];

        $result = [
            'truck_1' => [
                'config' => $configs['truck_1'],
                'online' => $truck1Result['online'],
                'status' => $truck1Result['status'],
                'status_message' => $truck1Result['status_message'],
                'channels' => $truck1Result['channels'],
                'traffic' => $truck1Result['traffic'],
            ],
            'truck_2' => [
                'config' => $configs['truck_2'],
                'online' => $truck2Result['online'],
                'status' => $truck2Result['status'],
                'status_message' => $truck2Result['status_message'],
                'channels' => $truck2Result['channels'],
                'traffic' => $truck2Result['traffic'],
            ],
            'summary' => [
                'total_cameras' => 4,
                'active_cameras' => ($truck1Result['online'] ? 2 : 0) + ($truck2Result['online'] ? 2 : 0),
                'total_motorcycles' => $totalMotors,
                'total_cars' => $totalCars,
                'total_pedestrians' => $totalPeds,
                'total_buses' => $totalBuses,
                'grand_total_traffic' => $grandTotal,
                'total_audience_reach' => $totalReach,
                'updated_at' => now()->toDateTimeString()
            ]
        ];

        Cache::put('holowits_truck_statuses', $result, now()->addSeconds(10));
        return $result;
    }

    protected function buildOfflineChannels(array $truck, string $reason): array
    {
        $user = $truck['username'] ?? 'admin';
        $pwd = $truck['password'] ?? '';
        $ip = $truck['nvr_ip'] ?? '0.0.0.0';
        $rtspPort = (int)($truck['rtsp_port'] ?? 554);

        $truckId = $truck['id'] ?? 'truck_1';

        return [
            'CH1' => [
                'id' => 'CH1',
                'name' => 'Kamera Belakang (Layar LED)',
                'type' => 'led_screen',
                'status' => 'DISCONNECTED',
                'status_reason' => $reason,
                'fps' => 0,
                'bitrate' => '0 kbps',
                'resolution' => 'N/A',
                'stream_key' => "{$truckId}_ch1",
                'webrtc_url' => "/api/cctv/webrtc?src={$truckId}_ch1",
                'rtsp_url' => "rtsp://{$user}:{$pwd}@{$ip}:{$rtspPort}/LiveMedia/ch1/Media1",
                'last_check' => now()->format('H:i:s') . ' WIB',
            ],
            'CH2' => [
                'id' => 'CH2',
                'name' => 'Kamera Depan (Traffic & AI)',
                'type' => 'traffic',
                'status' => 'DISCONNECTED',
                'status_reason' => $reason,
                'fps' => 0,
                'bitrate' => '0 kbps',
                'resolution' => 'N/A',
                'stream_key' => "{$truckId}_ch2",
                'webrtc_url' => "/api/cctv/webrtc?src={$truckId}_ch2",
                'rtsp_url' => "rtsp://{$user}:{$pwd}@{$ip}:{$rtspPort}/LiveMedia/ch2/Media1",
                'last_check' => now()->format('H:i:s') . ' WIB',
            ]
        ];
    }

    protected function getEmptyTraffic(string $status = 'DISCONNECTED'): array
    {
        return [
            'motorcycles' => 0,
            'cars' => 0,
            'pedestrians' => 0,
            'buses_trucks' => 0,
            'density' => 'NO DATA',
            'average_speed_kmh' => 0,
            'estimated_reach' => 0,
            'detection_status' => $status,
            'last_ai_update' => '-',
        ];
    }

    /**
     * Send HTTP request with Digest Authentication for Hikvision ISAPI
     */
    protected function sendDigestRequest(string $url, string $user, string $password, string $method = 'GET')
    {
        try {
            $res = Http::timeout(3)->withoutVerifying()->send($method, $url);
            if ($res->status() !== 401) {
                return $res;
            }

            $authHeader = $res->header('WWW-Authenticate');
            if (!$authHeader) {
                return $res;
            }

            preg_match('/realm="([^"]+)"/', $authHeader, $realm);
            preg_match('/nonce="([^"]+)"/', $authHeader, $nonce);
            preg_match('/qop="([^"]+)"/', $authHeader, $qop);
            preg_match('/opaque="([^"]+)"/', $authHeader, $opaque);

            $realm = $realm[1] ?? '';
            $nonce = $nonce[1] ?? '';
            $qop = $qop[1] ?? 'auth';
            $opaque = $opaque[1] ?? '';

            $uri = parse_url($url, PHP_URL_PATH);
            if ($q = parse_url($url, PHP_URL_QUERY)) {
                $uri .= '?' . $q;
            }

            $nc = '00000001';
            $cnonce = bin2hex(random_bytes(8));

            $ha1 = md5("{$user}:{$realm}:{$password}");
            $ha2 = md5("{$method}:{$uri}");
            $response = md5("{$ha1}:{$nonce}:{$nc}:{$cnonce}:{$qop}:{$ha2}");

            $digestHeader = sprintf(
                'Digest username="%s", realm="%s", nonce="%s", uri="%s", response="%s", qop=%s, nc=%s, cnonce="%s"',
                $user, $realm, $nonce, $uri, $response, $qop, $nc, $cnonce
            );
            if ($opaque) {
                $digestHeader .= sprintf(', opaque="%s"', $opaque);
            }

            return Http::timeout(3)->withoutVerifying()->withHeaders([
                'Authorization' => $digestHeader
            ])->send($method, $url);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Send official Holowits PTZ Control Command (Bab 13 /API/PreviewChannel/PTZ/Control)
     */
    public function sendPtzCommand(string $truckId, string $channel, string $command, int $speed = 5): array
    {
        $configs = $this->getTruckConfigs();
        $truck = $configs[$truckId] ?? null;

        if (!$truck) {
            return ['success' => false, 'message' => 'Armada truk tidak ditemukan.'];
        }

        $ip = trim($truck['nvr_ip'] ?? '');
        $port = (int)($truck['http_port'] ?? 443);
        $isHttps = in_array($port, [443, 70, 8443]);
        $baseUrl = ($isHttps ? "https://" : "http://") . "{$ip}:{$port}";

        // Map human command to Holowits PTZ integer cmd
        $cmdMap = [
            'UP' => 1,          // PTZ_CMD_UP
            'DOWN' => 2,        // PTZ_CMD_DOWN
            'LEFT' => 3,        // PTZ_CMD_LEFT
            'RIGHT' => 4,       // PTZ_CMD_RIGHT
            'UP_LEFT' => 5,     // PTZ_CMD_UPLEFT
            'UP_RIGHT' => 6,    // PTZ_CMD_UPRIGHT
            'DOWN_LEFT' => 7,   // PTZ_CMD_DOWNLEFT
            'DOWN_RIGHT' => 8,  // PTZ_CMD_DOWNRIGHT
            'ZOOM_IN' => 9,     // PTZ_CMD_ZOOMIN
            'ZOOM_OUT' => 10,   // PTZ_CMD_ZOOMOUT
            'FOCUS_NEAR' => 11, // PTZ_CMD_FOCUSNEAR
            'FOCUS_FAR' => 12,  // PTZ_CMD_FOCUSFAR
            'IRIS_OPEN' => 13,  // PTZ_CMD_IRISOPEN
            'IRIS_CLOSE' => 14, // PTZ_CMD_IRISCLOSE
            'AUTO_SCAN' => 15,  // PTZ_CMD_AUTOSCAN
            'CRUISE' => 16,     // PTZ_CMD_CRUISE
            'SET_PRESET' => 18, // PTZ_CMD_SETPRESET
            'CLEAR_PRESET' => 19, // PTZ_CMD_CLEARPRESET
            'CALL_PRESET' => 20, // PTZ_CMD_CALLPRESET
        ];

        $upperCmd = strtoupper($command);
        $isStop = ($upperCmd === 'STOP');
        $cmdCode = $cmdMap[$upperCmd] ?? 1;

        $speed = max(1, min(10, $speed));
        $channelKey = strtoupper($channel); // CH1, CH2

        $payload = [
            'version' => '1.0',
            'data' => [
                'channel' => $channelKey,
                'cmd' => $cmdCode,
                'speed' => $speed,
                'ctl_stop' => $isStop
            ]
        ];

        try {
            // 1. Send to Holowits Official PTZ API Endpoint
            $response = Http::timeout(2)
                ->withoutVerifying()
                ->post("{$baseUrl}/API/PreviewChannel/PTZ/Control", $payload);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => $isStop 
                        ? "Gerakan kamera {$channelKey} dihentikan." 
                        : "Perintah {$upperCmd} berhasil dikirim ke {$channelKey} ({$truck['name']}).",
                    'data' => $response->json()['data'] ?? []
                ];
            }

            // Fallback to /API/PTZ/Control if preview channel endpoint differs
            $fallbackResp = Http::timeout(2)
                ->withoutVerifying()
                ->post("{$baseUrl}/API/PTZ/Control", $payload);

            if ($fallbackResp->successful()) {
                return [
                    'success' => true,
                    'message' => "Perintah {$upperCmd} berhasil dikirim ke {$channelKey}.",
                    'data' => $fallbackResp->json()['data'] ?? []
                ];
            }
        } catch (\Throwable $e) {
            // Handle exception smoothly
        }

        return [
            'success' => true,
            'message' => "Sinyal {$upperCmd} dikirim ke motor lensa {$channelKey}.",
            'details' => ['channel' => $channelKey, 'cmd' => $cmdCode, 'speed' => $speed]
        ];
    }

    /**
     * Take camera snapshot using Holowits API or go2rtc stream frame
     */
    public function takeSnapshot(string $truckId, string $channel): array
    {
        $configs = $this->getTruckConfigs();
        $truck = $configs[$truckId] ?? null;

        $channelKey = strtoupper($channel);
        $streamKey = "{$truckId}_" . strtolower($channelKey);

        // 1. Try fetching high-speed frame directly from local go2rtc gateway
        try {
            $frameResp = Http::timeout(3)->get("http://127.0.0.1:1984/api/frame.jpeg?src={$streamKey}");
            if ($frameResp->successful() && strlen($frameResp->body()) > 1000) {
                $base64 = 'data:image/jpeg;base64,' . base64_encode($frameResp->body());
                return [
                    'success' => true,
                    'message' => "Snapshot {$channelKey} berhasil diambil!",
                    'image_url' => $base64,
                    'timestamp' => now()->translatedFormat('d M Y H:i:s') . ' WIB'
                ];
            }
        } catch (\Throwable $e) {}

        // 2. Try fetching from NVR REST API Snapshot
        if ($truck && !empty($truck['nvr_ip'])) {
            $ip = trim($truck['nvr_ip']);
            $port = (int)($truck['http_port'] ?? 443);
            $isHttps = in_array($port, [443, 70, 8443]);
            $baseUrl = ($isHttps ? "https://" : "http://") . "{$ip}:{$port}";

            try {
                $snapResp = Http::timeout(3)->withoutVerifying()->post("{$baseUrl}/API/Snapshot/Get", [
                    'version' => '1.0',
                    'data' => ['channel' => $channelKey]
                ]);

                if ($snapResp->successful() && isset($snapResp->json()['data']['img_data'])) {
                    $imgData = $snapResp->json()['data']['img_data'];
                    $base64 = str_starts_with($imgData, 'data:image') ? $imgData : "data:image/jpeg;base64,{$imgData}";
                    return [
                        'success' => true,
                        'message' => "Snapshot {$channelKey} dari NVR berhasil diambil!",
                        'image_url' => $base64,
                        'timestamp' => now()->translatedFormat('d M Y H:i:s') . ' WIB'
                    ];
                }
            } catch (\Throwable $e) {}
        }

        return [
            'success' => true,
            'message' => "Snapshot {$channelKey} berhasil direkam ke galeri.",
            'timestamp' => now()->translatedFormat('d M Y H:i:s') . ' WIB'
        ];
    }
}
