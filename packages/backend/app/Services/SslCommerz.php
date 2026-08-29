<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

class SslCommerz
{
    private function baseUrl(): string
    {
        return Config::get('sslcommerz.sandbox')
            ? 'https://sandbox.sslcommerz.com'
            : 'https://securepay.sslcommerz.com';
    }

    /**
     * Create an SSLCommerz session and return the gateway redirect URL.
     * Returns the decoded response array, or ['error' => '...'] on failure.
     */
    public function initiate(array $data): array
    {
        $payload = array_merge([
            'store_id' => Config::get('sslcommerz.store_id'),
            'store_passwd' => Config::get('sslcommerz.store_password'),
            'currency' => Config::get('sslcommerz.currency', 'BDT'),
        ], $data);

        try {
            $response = Http::withOptions(['verify' => base_path('cacert.pem')])
                ->asForm()
                ->post($this->baseUrl() . '/gwprocess/v4/api.php', $payload);
        } catch (\Throwable $e) {
            return ['error' => 'connection_failed'];
        }

        if (!$response->successful()) {
            return ['error' => 'gateway_unreachable'];
        }

        return $response->json();
    }

    /**
     * Validate a transaction using the val_id returned by SSLCommerz.
     */
    public function validate(string $valId): ?array
    {
        try {
            $response = Http::withOptions(['verify' => base_path('cacert.pem')])
                ->asForm()
                ->post($this->baseUrl() . '/validator/api/validationserverAPI.php', [
                    'store_id' => Config::get('sslcommerz.store_id'),
                    'store_passwd' => Config::get('sslcommerz.store_password'),
                    'val_id' => $valId,
                ]);
        } catch (\Throwable $e) {
            return null;
        }

        if (!$response->successful()) {
            return null;
        }

        return $response->json();
    }
}
