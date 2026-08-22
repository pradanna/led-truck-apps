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
        Schema::create('ai_traffic_daily_logs', function (Blueprint $table) {
            $table->id();
            $table->string('truck_id', 20)->index(); // truck_1, truck_2
            $table->string('truck_plate', 20)->nullable()->index(); // B 9731 JXS, B 9729 JXS
            $table->date('log_date')->index();
            $table->unsignedInteger('motorcycles')->default(0);
            $table->unsignedInteger('cars')->default(0);
            $table->unsignedInteger('pedestrians')->default(0);
            $table->unsignedInteger('buses_trucks')->default(0);
            $table->unsignedInteger('total_traffic')->default(0);
            $table->unsignedInteger('estimated_reach')->default(0);
            $table->json('raw_metrics')->nullable();
            $table->timestamps();

            // Unique index to have only 1 consolidated traffic record per truck per day
            $table->unique(['truck_id', 'log_date'], 'unique_truck_log_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_traffic_daily_logs');
    }
};
