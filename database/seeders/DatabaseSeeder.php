<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CampaignDocumentation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\File;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with default Admin, Client User & Sample Campaign Documentation
     */
    public function run(): void
    {
        // 1. Super Admin Account
        $adminEmail = env('ADMIN_DEFAULT_EMAIL', 'admin@example.com');
        $adminPassword = env('ADMIN_DEFAULT_PASSWORD', 'password');
        
        $admin = User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => env('ADMIN_DEFAULT_NAME', 'System Administrator'),
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'expires_at' => null,
                'is_active' => true,
            ]
        );

        // 2. Client User Account
        $clientEmail = env('CLIENT_DEFAULT_EMAIL', 'client@example.com');
        $clientPassword = env('CLIENT_DEFAULT_PASSWORD', 'password');

        $client = User::updateOrCreate(
            ['email' => $clientEmail],
            [
                'name' => env('CLIENT_DEFAULT_NAME', 'Client User'),
                'password' => Hash::make($clientPassword),
                'role' => 'user',
                'expires_at' => now()->addYears(1),
                'is_active' => true,
            ]
        );

        // Ensure upload directory exists
        $uploadDir = public_path('uploads/campaigns');
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        // Seed Sample Campaign Documentation Proof of Play
        CampaignDocumentation::updateOrCreate(
            ['title' => 'Dokumentasi Tayang Bundaran HI - Jam Sibuk Sore'],
            [
                'user_id' => $client->id,
                'campaign_name' => 'Kampanye Ramadhan Berkah',
                'location' => 'Bundaran HI, Jakarta Pusat',
                'event_date' => now()->format('Y-m-d'),
                'media_type' => 'image',
                'file_path' => '/images/led_truck_login.jpg',
                'thumbnail_path' => '/images/led_truck_login.jpg',
                'notes' => 'Armada Truk 01 melintas perlahan dengan traffic padat di Bundaran HI. Audiens terpapar optimal.',
            ]
        );

        CampaignDocumentation::updateOrCreate(
            ['title' => 'Monitoring Tayangan Malam - Kawasan Sudirman'],
            [
                'user_id' => $client->id,
                'campaign_name' => 'Brand Awareness Launching',
                'location' => 'Jl. Jenderal Sudirman Kav. 21',
                'event_date' => now()->subDay()->format('Y-m-d'),
                'media_type' => 'image',
                'file_path' => '/images/led_truck_login.jpg',
                'thumbnail_path' => '/images/led_truck_login.jpg',
                'notes' => 'Tingkat kecerahan videotron disesuaikan ke 80% High-NIT untuk kontras maksimal di malam hari.',
            ]
        );
    }
}
