<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignDocumentation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'campaign_name',
        'location',
        'event_date',
        'media_type',
        'file_path',
        'thumbnail_path',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
        ];
    }

    /**
     * Relationship to the targeted Client User
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
