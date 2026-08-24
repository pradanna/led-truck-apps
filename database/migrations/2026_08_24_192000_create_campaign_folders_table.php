<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabel Folder Dokumentasi Kampanye
        Schema::create('campaign_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Target Client (null = Semua / Publik)
            $table->string('name'); // Nama Folder (misal: "Hari 1 - Bundaran HI & Sudirman")
            $table->date('event_date')->nullable(); // Tanggal Operasional
            $table->string('campaign_name')->nullable(); // Nama Kampanye / Event
            $table->text('description')->nullable(); // Keterangan Folder
            $table->timestamps();
        });

        // 2. Tambahkan folder_id ke campaign_documentations
        Schema::table('campaign_documentations', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->after('user_id')->constrained('campaign_folders')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaign_documentations', function (Blueprint $table) {
            $table->dropForeign(['folder_id']);
            $table->dropColumn('folder_id');
        });

        Schema::dropIfExists('campaign_folders');
    }
};
