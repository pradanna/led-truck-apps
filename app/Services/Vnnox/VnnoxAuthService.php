<?php

namespace App\Services\Vnnox;

use App\Models\SystemSetting;
use Exception;

class VnnoxAuthService
{
    protected string $appKey;
    protected string $appSecret;

    public function __construct()
    {
        $this->appKey = SystemSetting::get('vnnox_app_key', config('services.vnnox.app_key', env('VNNOX_APP_KEY', '')));
        $this->appSecret = SystemSetting::get('vnnox_app_secret', config('services.vnnox.app_secret', env('VNNOX_APP_SECRET', '')));
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
        $secret = $customSecret ?? $this->appSecret;
        $input = $secret . $nonce . $curTime;
        return hash('sha256', $input);
    }

    /**
     * Get array of public HTTP headers required for VNNOX API
     */
    public function getAuthHeaders(): array
    {
        $nonce = $this->generateNonce();
        $curTime = $this->generateCurTime();
        $checkSum = $this->generateCheckSum($nonce, $curTime);

        return [
            'AppKey'   => $this->appKey,
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
