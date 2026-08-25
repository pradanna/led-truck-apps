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
        Schema::create('vnnox_playlog_logs', function (Blueprint $table) {
            $table->id();
            $table->string('truck_id', 32)->index(); // 'truck_1', 'truck_2'
            $table->date('log_date')->index();
            $table->string('media_name')->index();
            $table->string('client_name')->nullable();
            $table->string('play_time', 64)->nullable();
            $table->unsignedInteger('duration')->default(30);
            $table->string('status', 32)->default('Success');
            $table->text('info_system')->nullable();
            $table->timestamps();

            $table->index(['truck_id', 'log_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vnnox_playlog_logs');
    }
};
