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
        $admin = User::updateOrCreate(
            ['email' => 'superadmin@test.com'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'expires_at' => null,
                'is_active' => true,
            ]
        );

        // 2. Client User Test Account
        $client = User::updateOrCreate(
            ['email' => 'client@test.com'],
            [
                'name' => 'Client Demo User',
                'password' => Hash::make('password'),
                'role' => 'user',
                'expires_at' => now()->addDays(30),
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
