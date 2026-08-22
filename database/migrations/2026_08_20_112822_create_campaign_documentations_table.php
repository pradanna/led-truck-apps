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
        Schema::create('campaign_documentations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Target Client
            $table->string('title');
            $table->string('campaign_name');
            $table->string('location')->nullable();
            $table->date('event_date')->nullable();
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->string('file_path');
            $table->string('thumbnail_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaign_documentations');
    }
};
