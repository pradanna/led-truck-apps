<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CampaignFolder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'event_date',
        'campaign_name',
        'description',
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

    /**
     * Relationship to all media documentations inside this folder
     */
    public function documentations(): HasMany
    {
        return $this->hasMany(CampaignDocumentation::class, 'folder_id');
    }
}
