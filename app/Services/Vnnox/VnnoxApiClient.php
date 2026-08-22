<?php

namespace App\Services\Vnnox;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class VnnoxApiClient
{
    protected VnnoxAuthService $authService;
    protected string $baseUrl;

    public function __construct(VnnoxAuthService $authService)
    {
        $this->authService = $authService;
        $configuredBaseUrl = SystemSetting::get('vnnox_base_url', config('services.vnnox.base_url', env('VNNOX_BASE_URL', 'https://openapi-eu.vnnox.com')));
        $this->baseUrl = rtrim($configuredBaseUrl ?: 'https://openapi-eu.vnnox.com', '/');
    }

    /**
     * Send GET request to VNNOX API
     */
     public function get(string $path, array $queryParams = [], string $truckId = 'truck_1'): array
     {
         return $this->request('GET', $path, $queryParams, $truckId);
     }

     /**
      * Send POST request to VNNOX API
      */
     public function post(string $path, array $body = [], string $truckId = 'truck_1'): array
     {
         return $this->request('POST', $path, $body, $truckId);
     }

     /**
      * Internal request handler with auth headers & error handling
      */
     protected function request(string $method, string $path, array $data = [], string $truckId = 'truck_1'): array
     {
         $creds = $this->authService->getCredentialsForAccount($truckId);
         $baseUrl = $creds['base_url'];
         $url = $baseUrl . '/' . ltrim($path, '/');
         $headers = $this->authService->getAuthHeaders($truckId);

         try {
             $client = Http::withHeaders($headers)
                 ->timeout(10);

            if (strtoupper($method) === 'POST') {
                $response = $client->asJson()->post($url, $data);
            } else {
                $response = $client->asForm()->get($url, $data);
            }

            if ($response->successful()) {
                return [
                    'success' => true,
                    'status' => $response->status(),
                    'data' => $response->json(),
                ];
            }

            Log::warning("VNNOX API call failed: {$url}", [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'status' => $response->status(),
                'message' => $response->json('error.message', 'Unknown API Error'),
                'raw' => $response->json(),
            ];
        } catch (Throwable $e) {
            Log::error("VNNOX API Exception: {$e->getMessage()}", [
                'url' => $url,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'status' => 500,
                'message' => 'Gagal terhubung ke VNNOX Cloud API: ' . $e->getMessage(),
            ];
        }
    }
}
