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
        Schema::create('gps_telemetry_logs', function (Blueprint $table) {
            $table->id();
            $table->string('imei', 32)->index();
            $table->string('truck_plate', 20)->nullable()->index();
            $table->dateTime('logged_at')->index();
            $table->date('log_date')->index(); // for fast partitioning/date queries
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('speed', 6, 2)->default(0);
            $table->string('status', 30)->nullable(); // MOVE, PARK, OFF, etc
            $table->string('engine_status', 10)->default('OFF'); // ON, OFF
            $table->decimal('mileage_km', 12, 2)->nullable();
            $table->text('address')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamps();

            // Unique constraint to prevent duplicate checkpoints for the same device at the same second
            $table->unique(['imei', 'logged_at'], 'unique_imei_logged_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gps_telemetry_logs');
    }
};
