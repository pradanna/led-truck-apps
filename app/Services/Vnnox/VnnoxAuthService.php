<?php

namespace App\Services\Vnnox;

use App\Models\SystemSetting;
use Exception;

class VnnoxAuthService
{
    public function getCredentialsForAccount(string $truckId = 'truck_1'): array
    {
        if ($truckId === 'truck_2') {
            $baseUrl = SystemSetting::get('vnnox_base_url_truck_2', env('VNNOX_BASE_URL_TRUCK2', 'https://open-eu.vnnox.com'));
            $appKey = SystemSetting::get('vnnox_app_key_truck_2', env('VNNOX_APP_KEY_TRUCK2', 'ea71a2ea1c944e648ad5bd5d2d5d2ecd'));
            $appSecret = SystemSetting::get('vnnox_app_secret_truck_2', env('VNNOX_APP_SECRET_TRUCK2', '2d0157a17cbe46cdab6a5b0525ed2cb6'));
        } else {
            $baseUrl = SystemSetting::get('vnnox_base_url', config('services.vnnox.base_url', env('VNNOX_BASE_URL', 'https://open-eu.vnnox.com')));
            $appKey = SystemSetting::get('vnnox_app_key', config('services.vnnox.app_key', env('VNNOX_APP_KEY', '097c79e9b31b48f290d24fb3b5a613cb')));
            $appSecret = SystemSetting::get('vnnox_app_secret', config('services.vnnox.app_secret', env('VNNOX_APP_SECRET', '62d936d0cb614c9296d67256359b3470')));
        }

        return [
            'base_url' => rtrim($baseUrl ?: 'https://open-eu.vnnox.com', '/'),
            'app_key' => $appKey,
            'app_secret' => $appSecret,
        ];
    }

    /**
     * Generate random Nonce string (8 - 64 characters)
     */
    public function generateNonce(int $length = 16): string
    {
        return bin2hex(random_bytes(max(4, intval($length / 2))));
    }

    /**
     * Generate current UTC timestamp in seconds
     */
    public function generateCurTime(): string
    {
        return (string) time();
    }

    /**
     * Calculate SHA256 signature for VNNOX API request
     * CheckSum = SHA256(AppSecret + Nonce + CurTime)
     */
    public function generateCheckSum(string $nonce, string $curTime, ?string $customSecret = null): string
    {
        $creds = $this->getCredentialsForAccount('truck_1');
        $secret = $customSecret ?? $creds['app_secret'];
        $input = $secret . $nonce . $curTime;
        return hash('sha256', $input);
    }

    /**
     * Get array of public HTTP headers required for VNNOX API
     */
    public function getAuthHeaders(?string $truckId = 'truck_1'): array
    {
        $creds = $this->getCredentialsForAccount($truckId ?? 'truck_1');
        $nonce = $this->generateNonce();
        $curTime = $this->generateCurTime();
        $checkSum = $this->generateCheckSum($nonce, $curTime, $creds['app_secret']);

        return [
            'AppKey'   => $creds['app_key'],
            'Nonce'    => $nonce,
            'CurTime'  => $curTime,
            'CheckSum' => $checkSum,
        ];
    }

    /**
     * Validate timestamp drift (must be within 5 minutes / 300 seconds)
     */
    public function isValidTimestamp(string $timestamp, int $maxDriftSeconds = 300): bool
    {
        $time = intval($timestamp);
        return abs(time() - $time) <= $maxDriftSeconds;
    }
}
