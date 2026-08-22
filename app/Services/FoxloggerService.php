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

    public function getAuthCredentials(): array
    {
        $email = SystemSetting::get('foxlogger_username', env('EMAIL_LOGFLOGGER', 'centralledid168@gmail.com'));
        $password = SystemSetting::get('foxlogger_password', env('PASSWORD_LOGFLOGGER', '575859'));

        return [$email, $password];
    }

    /**
     * Authenticate via Basic Auth to fetch initial access & refresh token.
     */
    public function login(): ?array
    {
        [$email, $password] = $this->getAuthCredentials();

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
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'user_id' => $userId,
                    'updated_at' => now()->toDateTimeString(),
                ];

                Cache::put($this->cacheKey, $session, now()->addHours(23));
                return $session;
            }
        } catch (\Throwable $e) {
            Log::error('Foxlogger Auth Exception', ['error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Refresh access_token using refresh_token endpoint.
     */
    public function refreshToken(?string $providedRefreshToken = null): ?array
    {
        $session = Cache::get($this->cacheKey);
        $refreshToken = $providedRefreshToken ?? ($session['refresh_token'] ?? null);

        if (!$refreshToken) {
            return $this->login();
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
                    'access_token' => $newAccessToken,
                    'refresh_token' => $newRefreshToken,
                    'user_id' => $userId,
                    'updated_at' => now()->toDateTimeString(),
                ];

                Cache::put($this->cacheKey, $newSession, now()->addHours(23));
                return $newSession;
            }
        } catch (\Throwable $e) {
            Log::warning('Foxlogger Refresh Token Exception', ['error' => $e->getMessage()]);
        }

        return $this->login();
    }

    /**
     * Get valid access token session from Cache, auto-authenticating/refreshing if needed.
     */
    public function getValidSession(): ?array
    {
        $session = Cache::get($this->cacheKey);

        if (!$session || empty($session['access_token'])) {
            return $this->login();
        }

        return $session;
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
     * Fetch device list with 2-minute Cache to make initial page load instant.
     */
    public function getDeviceList(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && Cache::has('foxlogger_devices_list')) {
            return Cache::get('foxlogger_devices_list');
        }

        $session = $this->getValidSession();
        if (!$session || !$session['user_id']) {
            return [];
        }

        try {
            $response = Http::timeout(3)
                ->withToken($session['access_token'])
                ->withoutVerifying()
                ->get("{$this->baseUrl}/user_data_all/{$session['user_id']}");

            if ($response->status() === 401) {
                $session = $this->refreshToken();
                if ($session) {
                    $response = Http::timeout(3)
                        ->withToken($session['access_token'])
                        ->withoutVerifying()
                        ->get("{$this->baseUrl}/user_data_all/{$session['user_id']}");
                }
            }

            if ($response->successful()) {
                $devices = $response->json()['data'] ?? [];
                if (!empty($devices)) {
                    Cache::put('foxlogger_devices_list', $devices, now()->addMinutes(2));
                }
                return $devices;
            }
        } catch (\Throwable $e) {
            Log::error('Foxlogger getDeviceList Exception', ['error' => $e->getMessage()]);
        }

        return Cache::get('foxlogger_devices_list', []);
    }

    /**
     * Fetch report position with 1-minute Cache to optimize speed.
     */
    public function getReportPosition(bool $forceRefresh = false): array
    {
        if (!$forceRefresh && Cache::has('foxlogger_positions_report')) {
            return Cache::get('foxlogger_positions_report');
        }

        $session = $this->getValidSession();
        if (!$session || !$session['user_id']) {
            return [];
        }

        try {
            $response = Http::timeout(3)
                ->withToken($session['access_token'])
                ->withoutVerifying()
                ->get("{$this->baseUrl}/web-tracker-staging/report-position/{$session['user_id']}?status=MOVE,PARK,OFF,MISS");

            if ($response->status() === 401) {
                $session = $this->refreshToken();
                if ($session) {
                    $response = Http::timeout(3)
                        ->withToken($session['access_token'])
                        ->withoutVerifying()
                        ->get("{$this->baseUrl}/web-tracker-staging/report-position/{$session['user_id']}?status=MOVE,PARK,OFF,MISS");
                }
            }

            if ($response->successful()) {
                $positions = $response->json()['data'] ?? [];
                if (!empty($positions)) {
                    Cache::put('foxlogger_positions_report', $positions, now()->addMinute());
                }
                return $positions;
            }
        } catch (\Throwable $e) {
            Log::error('Foxlogger getReportPosition Exception', ['error' => $e->getMessage()]);
        }

        return Cache::get('foxlogger_positions_report', []);
    }

    public function getReportHistory(string $imei, ?string $time1 = null, ?string $time2 = null): array
    {
        $session = $this->getValidSession();
        if (!$session || !$session['user_id']) {
            return [];
        }

        date_default_timezone_set('Asia/Jakarta');
        $time1 = $time1 ?? date('Y-m-d 00:00:00');
        $time2 = $time2 ?? date('Y-m-d H:i:s');
        $cacheKey = "foxlogger_history_{$imei}_" . md5($time1 . $time2);

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey);
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
                $session = $this->refreshToken();
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
                Cache::put($cacheKey, $history, now()->addMinutes(5));
                return $history;
            }
        } catch (\Throwable $e) {
            Log::error('Foxlogger getReportHistory Exception', ['error' => $e->getMessage()]);
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
     */
    public function calculateTripMetrics(string $imei, ?string $time1 = null, ?string $time2 = null): array
    {
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
