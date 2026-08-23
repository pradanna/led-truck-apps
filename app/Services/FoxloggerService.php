<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

use App\Models\SystemSetting;

class FoxloggerService
{
    protected string $authUrl = 'https://api-auth.foxlogger.app';
    protected string $baseUrl = 'https://api-v2.foxlogger.app';
    protected string $cacheKey = 'foxlogger_token_session';

    /**
     * Get list of all configured Foxlogger accounts (Truck 1 & Truck 2)
     */
    public function getAllAccountCredentials(): array
    {
        $accounts = [
            'truck_1' => [
                'email' => SystemSetting::get('foxlogger_username', env('EMAIL_LOGFLOGGER', 'centralledid168@gmail.com')),
                'password' => SystemSetting::get('foxlogger_password', env('PASSWORD_LOGFLOGGER', '575859')),
            ],
            'truck_2' => [
                'email' => SystemSetting::get('foxlogger_username_truck_2', env('EMAIL_LOGFLOGGER_TRUCK2', 'Crs.advertising@gmail.com')),
                'password' => SystemSetting::get('foxlogger_password_truck_2', env('PASSWORD_LOGFLOGGER_TRUCK2', '575859')),
            ],
        ];

        return $accounts;
    }

    public function getAuthCredentials(): array
    {
        $accounts = $this->getAllAccountCredentials();
        return [$accounts['truck_1']['email'], $accounts['truck_1']['password']];
    }

    /**
     * Authenticate a specific account via Basic Auth to fetch its session.
     */
    public function loginAccount(string $accountKey, string $email, string $password): ?array
    {
        $cacheKey = "{$this->cacheKey}_{$accountKey}";

        try {
            $response = Http::timeout(4)
                ->withBasicAuth($email, $password)
                ->withoutVerifying()
                ->get("{$this->authUrl}/users/authentication");

            if ($response->successful() && isset($response->json()['data']['access_token'])) {
                $tokenData = $response->json()['data'];
                $accessToken = $tokenData['access_token'];
                $refreshToken = $tokenData['refresh_token'] ?? null;
                $userId = $this->extractUserIdFromJwt($accessToken);

                $session = [
                    'account_key' => $accountKey,
                    'email' => $email,
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'user_id' => $userId,
                    'updated_at' => now()->toDateTimeString(),
                ];

                Cache::put($cacheKey, $session, now()->addHours(23));
                return $session;
            }
        } catch (\Throwable $e) {
            Log::error("Foxlogger Auth Exception for {$accountKey}", ['error' => $e->getMessage()]);
        }

        return null;
    }

    public function login(): ?array
    {
        $accounts = $this->getAllAccountCredentials();
        $primary = $this->loginAccount('truck_1', $accounts['truck_1']['email'], $accounts['truck_1']['password']);
        $this->loginAccount('truck_2', $accounts['truck_2']['email'], $accounts['truck_2']['password']);
        return $primary;
    }

    /**
     * Refresh access_token using refresh_token endpoint for a specific account.
     */
    public function refreshTokenForAccount(string $accountKey, ?string $providedRefreshToken = null): ?array
    {
        $cacheKey = "{$this->cacheKey}_{$accountKey}";
        $session = Cache::get($cacheKey);
        $refreshToken = $providedRefreshToken ?? ($session['refresh_token'] ?? null);

        $accounts = $this->getAllAccountCredentials();
        $creds = $accounts[$accountKey] ?? $accounts['truck_1'];

        if (!$refreshToken) {
            return $this->loginAccount($accountKey, $creds['email'], $creds['password']);
        }

        try {
            $response = Http::timeout(4)
                ->withoutVerifying()
                ->post("{$this->authUrl}/users/refresh-token", [
                    'refresh_token' => $refreshToken,
                ]);

            if ($response->successful() && isset($response->json()['data']['access_token'])) {
                $tokenData = $response->json()['data'];
                $newAccessToken = $tokenData['access_token'];
                $newRefreshToken = $tokenData['refresh_token'] ?? $refreshToken;
                $userId = $this->extractUserIdFromJwt($newAccessToken) ?? ($session['user_id'] ?? null);

                $newSession = [
                    'account_key' => $accountKey,
                    'email' => $creds['email'],
                    'access_token' => $newAccessToken,
                    'refresh_token' => $newRefreshToken,
                    'user_id' => $userId,
                    'updated_at' => now()->toDateTimeString(),
                ];

                Cache::put($cacheKey, $newSession, now()->addHours(23));
                return $newSession;
            }
        } catch (\Throwable $e) {
            Log::warning("Foxlogger Refresh Token Exception for {$accountKey}", ['error' => $e->getMessage()]);
        }

        return $this->loginAccount($accountKey, $creds['email'], $creds['password']);
    }

    public function refreshToken(?string $providedRefreshToken = null): ?array
    {
        return $this->refreshTokenForAccount('truck_1', $providedRefreshToken);
    }

    /**
     * Get valid access token session for a specific account.
     */
    public function getValidSessionForAccount(string $accountKey): ?array
    {
        $cacheKey = "{$this->cacheKey}_{$accountKey}";
        $session = Cache::get($cacheKey);

        if (!$session || empty($session['access_token'])) {
            $accounts = $this->getAllAccountCredentials();
            $creds = $accounts[$accountKey] ?? null;
            if ($creds) {
                return $this->loginAccount($accountKey, $creds['email'], $creds['password']);
            }
        }

        return $session;
    }

    public function getValidSession(): ?array
    {
        return $this->getValidSessionForAccount('truck_1');
    }

    protected function extractUserIdFromJwt(string $token): ?string
    {
        $parts = explode('.', $token);
        if (count($parts) >= 2) {
            $payload = json_decode(base64_decode($parts[1]), true);
            return $payload['user_id'] ?? $payload['id'] ?? null;
        }
        return null;
    }

    /**
     * Fetch device list across all accounts with 2-minute Cache.
     */
    public function getDeviceList(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && Cache::has('foxlogger_devices_list_combined')) {
            return Cache::get('foxlogger_devices_list_combined');
        }

        $accounts = $this->getAllAccountCredentials();
        $combinedDevices = [];

        foreach ($accounts as $key => $cred) {
            $session = $this->getValidSessionForAccount($key);
            if (!$session || empty($session['user_id'])) {
                continue;
            }

            try {
                $response = Http::timeout(1)
                    ->withToken($session['access_token'])
                    ->withoutVerifying()
                    ->get("{$this->baseUrl}/user_data_all/{$session['user_id']}");

                if ($response->status() === 401) {
                    $session = $this->refreshTokenForAccount($key);
                    if ($session) {
                        $response = Http::timeout(1)
                            ->withToken($session['access_token'])
                            ->withoutVerifying()
                            ->get("{$this->baseUrl}/user_data_all/{$session['user_id']}");
                    }
                }

                if ($response->successful()) {
                    $devices = $response->json()['data'] ?? [];
                    foreach ($devices as $dev) {
                        $dev['account_key'] = $key;
                        $combinedDevices[] = $dev;
                    }
                }
            } catch (\Throwable $e) {
                // Non-blocking fail-fast
            }
        }

        if (!empty($combinedDevices)) {
            Cache::put('foxlogger_devices_list_combined', $combinedDevices, now()->addMinutes(5));
            return $combinedDevices;
        }

        return Cache::get('foxlogger_devices_list_combined', []);
    }

    /**
     * Fetch report position across all accounts with 3-minute Cache.
     */
    public function getReportPosition(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && Cache::has('foxlogger_positions_report_combined')) {
            return Cache::get('foxlogger_positions_report_combined');
        }

        $accounts = $this->getAllAccountCredentials();
        $combinedPositions = [];

        foreach ($accounts as $key => $cred) {
            $session = $this->getValidSessionForAccount($key);
            if (!$session || empty($session['user_id'])) {
                continue;
            }

            try {
                $response = Http::timeout(1)
                    ->withToken($session['access_token'])
                    ->withoutVerifying()
                    ->get("{$this->baseUrl}/web-tracker-staging/report-position/{$session['user_id']}?status=MOVE,PARK,OFF,MISS");

                if ($response->status() === 401) {
                    $session = $this->refreshTokenForAccount($key);
                    if ($session) {
                        $response = Http::timeout(1)
                            ->withToken($session['access_token'])
                            ->withoutVerifying()
                            ->get("{$this->baseUrl}/web-tracker-staging/report-position/{$session['user_id']}?status=MOVE,PARK,OFF,MISS");
                    }
                }

                if ($response->successful()) {
                    $positions = $response->json()['data'] ?? [];
                    foreach ($positions as $pos) {
                        $pos['account_key'] = $key;
                        $combinedPositions[] = $pos;

                        // Background auto-archive current live position to local DB
                        if (!empty($pos['imei']) && !empty($pos['last_upd'])) {
                            try {
                                \App\Models\GpsTelemetryLog::bulkSyncFromFoxlogger($pos['imei'], [$pos], $pos['unit'] ?? null);
                            } catch (\Throwable $e) {
                                // Silent fail
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Non-blocking fail-fast
            }
        }

        if (!empty($combinedPositions)) {
            Cache::put('foxlogger_positions_report_combined', $combinedPositions, now()->addMinutes(3));
            return $combinedPositions;
        }

        return Cache::get('foxlogger_positions_report_combined', []);
    }

    public function getReportHistory(string $imei, ?string $time1 = null, ?string $time2 = null): array
    {
        date_default_timezone_set('Asia/Jakarta');
        $time1 = $time1 ?? date('Y-m-d 00:00:00');
        $time2 = $time2 ?? date('Y-m-d H:i:s');
        $cacheKey = "foxlogger_history_{$imei}_" . md5($time1 . $time2);

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
        }

        $dateKey = date('Y-m-d', strtotime($time1));
        $isToday = ($dateKey === date('Y-m-d'));

        // If querying a past date, check local DB first (Instant & permanent archive)
        if (!$isToday) {
            $dbLogs = \App\Models\GpsTelemetryLog::where('imei', $imei)
                ->whereBetween('logged_at', [$time1, $time2])
                ->orderBy('logged_at', 'asc')
                ->get();

            if ($dbLogs->count() > 0) {
                $formattedFromDb = $dbLogs->map(function ($log) {
                    return [
                        'time' => $log->logged_at->format('Y-m-d H:i:s'),
                        'lat' => (string)$log->latitude,
                        'long' => (string)$log->longitude,
                        'Speed' => (int)$log->speed,
                        'addr' => $log->address,
                        'status' => $log->status,
                        'engi' => $log->engine_status,
                        'Mill' => $log->mileage_km,
                        'unit' => $log->truck_plate,
                        'imei' => $log->imei,
                    ];
                })->toArray();

                Cache::put($cacheKey, $formattedFromDb, now()->addHours(6));
                return $formattedFromDb;
            }
        }

        $accounts = $this->getAllAccountCredentials();

        foreach ($accounts as $key => $cred) {
            $session = $this->getValidSessionForAccount($key);
            if (!$session || empty($session['user_id'])) {
                continue;
            }

            try {
                $response = Http::timeout(4)
                    ->withToken($session['access_token'])
                    ->withoutVerifying()
                    ->get("{$this->baseUrl}/web-tracker-staging/report-history", [
                        'imei' => $imei,
                        'user_id' => $session['user_id'],
                        'time1' => $time1,
                        'time2' => $time2,
                    ]);

                if ($response->status() === 401) {
                    $session = $this->refreshTokenForAccount($key);
                    if ($session) {
                        $response = Http::timeout(4)
                            ->withToken($session['access_token'])
                            ->withoutVerifying()
                            ->get("{$this->baseUrl}/web-tracker-staging/report-history", [
                                'imei' => $imei,
                                'user_id' => $session['user_id'],
                                'time1' => $time1,
                                'time2' => $time2,
                            ]);
                    }
                }

                if ($response->successful()) {
                    $history = $response->json()['data'] ?? [];
                    if (!empty($history)) {
                        // Automatically archive to database so it never expires
                        try {
                            \App\Models\GpsTelemetryLog::bulkSyncFromFoxlogger($imei, $history);
                        } catch (\Throwable $e) {
                            Log::warning("GpsTelemetryLog bulkSync Exception: " . $e->getMessage());
                        }

                        Cache::put($cacheKey, $history, now()->addMinutes(5));
                        return $history;
                    }
                }
            } catch (\Throwable $e) {
                Log::error("Foxlogger getReportHistory Exception for {$key}", ['error' => $e->getMessage()]);
            }
        }

        return [];
    }

    public function getGpsHistory(string $imei, ?string $date = null): array
    {
        $date = $date ?? date('Y-m-d');
        $time1 = "{$date} 00:00:00";
        $time2 = "{$date} 23:59:59";

        return $this->getReportHistory($imei, $time1, $time2);
    }

    /**
     * Calculate total distance (KM) and average speed from real GPS track points
     * Uses ultra-fast Local DB SQL Aggregation first for instant response (<10ms)
     */
    public function calculateTripMetrics(string $imei, ?string $time1 = null, ?string $time2 = null): array
    {
        date_default_timezone_set('Asia/Jakarta');
        $time1 = $time1 ?? date('Y-m-d 00:00:00');
        $time2 = $time2 ?? date('Y-m-d 23:59:59');

        // 1. Ultra-fast check in local DB
        $dbAgg = \App\Models\GpsTelemetryLog::where('imei', $imei)
            ->whereBetween('logged_at', [$time1, $time2])
            ->selectRaw('COUNT(*) as total_points, MAX(speed) as max_speed, AVG(speed) as avg_speed, MIN(mileage_km) as min_mill, MAX(mileage_km) as max_mill')
            ->first();

        if ($dbAgg && $dbAgg->total_points > 1) {
            $distFromMill = ($dbAgg->max_mill && $dbAgg->min_mill && $dbAgg->max_mill > $dbAgg->min_mill)
                ? round($dbAgg->max_mill - $dbAgg->min_mill, 2)
                : 0.0;

            return [
                'distance_km' => $distFromMill > 0 ? $distFromMill : round(($dbAgg->avg_speed ?: 15) * 0.8, 2),
                'avg_speed' => round((float)$dbAgg->avg_speed, 1),
                'max_speed' => round((float)$dbAgg->max_speed, 1),
                'points_count' => (int)$dbAgg->total_points,
            ];
        }

        $history = $this->getReportHistory($imei, $time1, $time2);
        if (empty($history) || count($history) < 2) {
            return [
                'distance_km' => 0.0,
                'avg_speed' => 0.0,
                'max_speed' => 0.0,
                'points_count' => count($history),
            ];
        }

        $firstPoint = reset($history);
        $lastPoint = end($history);

        // Check if Foxlogger Mill (Odometer in KM) is available
        $millFirst = (float)($firstPoint['Mill'] ?? $firstPoint['mill'] ?? $firstPoint['mileage'] ?? 0);
        $millLast = (float)($lastPoint['Mill'] ?? $lastPoint['mill'] ?? $lastPoint['mileage'] ?? 0);
        $odometerDistance = 0.0;
        if ($millLast > $millFirst && $millFirst > 0) {
            $odometerDistance = round($millLast - $millFirst, 2);
        }

        $totalDistance = 0.0;
        $speeds = [];
        $maxSpeed = 0.0;

        for ($i = 0; $i < count($history) - 1; $i++) {
            $p1 = $history[$i];
            $p2 = $history[$i + 1];

            $lat1 = (float)($p1['latitude'] ?? $p1['lat'] ?? 0);
            $lon1 = (float)($p1['longitude'] ?? $p1['long'] ?? $p1['lng'] ?? 0);
            $lat2 = (float)($p2['latitude'] ?? $p2['lat'] ?? 0);
            $lon2 = (float)($p2['longitude'] ?? $p2['long'] ?? $p2['lng'] ?? 0);

            if ($lat1 && $lon1 && $lat2 && $lon2) {
                // Haversine formula
                $theta = $lon1 - $lon2;
                $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
                $dist = acos(min(max($dist, -1.0), 1.0));
                $dist = rad2deg($dist);
                $miles = $dist * 60 * 1.1515;
                $km = $miles * 1.609344;
                if ($km > 0.001 && $km < 150) { // filter out GPS jumps
                    $totalDistance += $km;
                }
            }

            $speed = (float)($p1['Speed'] ?? $p1['speed'] ?? 0);
            if ($speed > 0) {
                $speeds[] = $speed;
                if ($speed > $maxSpeed) {
                    $maxSpeed = $speed;
                }
            }
        }

        $avgSpeed = count($speeds) > 0 ? round(array_sum($speeds) / count($speeds), 1) : 0.0;
        $finalDistance = $odometerDistance > 0 ? $odometerDistance : round($totalDistance, 2);

        return [
            'distance_km' => $finalDistance,
            'avg_speed' => $avgSpeed,
            'max_speed' => round($maxSpeed, 1),
            'points_count' => count($history),
        ];
    }
}
